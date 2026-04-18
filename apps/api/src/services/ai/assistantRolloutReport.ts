import type { PrismaClient } from '@prisma/client';
import { parsePromptSelectionFromMetricTags } from './assistantMetricPromptTags';

export type AssistantRolloutReport = {
  window: { days: number; fromDayKey: string; toDayKey: string };
  totals: Record<string, number>;
  byDay: Array<{ dayKey: string; totals: Record<string, number> }>;
  usageByOrg: Array<{ orgId: number | null; orgName: string | null; subscriptionTier: string | null; usedCount: number }>;
  byTier: Array<{ subscriptionTier: string | null; totals: Record<string, number> }>;
  /**
   * Same metric keys as `totals`, split by `promptSelectionSource` from event tags (Phase 27).
   * Rows recorded before Phase 27 appear under `unknown`. Use with `?orgId=` to compare baseline vs experiment arm.
   */
  byPromptSelection: Record<string, Record<string, number>>;
};

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addCount(map: Record<string, number>, key: string, v: number) {
  map[key] = (map[key] ?? 0) + v;
}

const DEFAULT_METRICS = [
  'assistant.json.success',
  'assistant.json.fallback',
  'assistant.stream.success',
  'assistant.stream.fallback',
  'assistant.usage.blocked',
  'assistant.usage.soft_limit',
  'assistant.stream.aborted',
  'assistant.stream.unsupported_client',
  'assistant.budget.truncation',
  'assistant.provider.failure',
];

export async function getAssistantRolloutReport(
  prisma: PrismaClient,
  params: { days: number; orgId?: number | null } // optional filter
): Promise<AssistantRolloutReport> {
  const days = Math.max(1, Math.min(30, Math.floor(params.days)));
  const now = new Date();
  const toDayKey = utcDayKey(now);
  const from = new Date(now.getTime() - (days - 1) * 86400000);
  const fromDayKey = utcDayKey(from);

  const metricRows = await prisma.assistantMetricEvent.findMany({
    where: {
      dayKey: { gte: fromDayKey, lte: toDayKey },
      ...(params.orgId != null ? { orgId: params.orgId } : {}),
    },
    select: { dayKey: true, metric: true, value: true, subscriptionTier: true, tags: true },
  });

  const totals: Record<string, number> = Object.fromEntries(DEFAULT_METRICS.map((m) => [m, 0]));
  const byDayMap = new Map<string, Record<string, number>>();
  const byTierMap = new Map<string, Record<string, number>>();
  const byPromptSelection: Record<string, Record<string, number>> = {};

  for (const r of metricRows) {
    addCount(totals, r.metric, r.value);
    const dayTotals = byDayMap.get(r.dayKey) ?? {};
    addCount(dayTotals, r.metric, r.value);
    byDayMap.set(r.dayKey, dayTotals);

    const tierKey = r.subscriptionTier ?? 'unknown';
    const tierTotals = byTierMap.get(tierKey) ?? {};
    addCount(tierTotals, r.metric, r.value);
    byTierMap.set(tierKey, tierTotals);

    const sel = parsePromptSelectionFromMetricTags((r as { tags?: unknown }).tags);
    const selTotals = byPromptSelection[sel] ?? Object.fromEntries(DEFAULT_METRICS.map((m) => [m, 0]));
    addCount(selTotals, r.metric, r.value);
    byPromptSelection[sel] = selTotals;
  }

  // Usage by org (from persistent daily table)
  const usageRows = await prisma.assistantUsageDaily.groupBy({
    by: ['orgId'],
    where: {
      dayKey: { gte: fromDayKey, lte: toDayKey },
      ...(params.orgId != null ? { orgId: params.orgId } : {}),
    },
    _sum: { usedCount: true },
  });

  const orgIds = usageRows.map((r) => r.orgId).filter((v): v is number => typeof v === 'number');
  const orgs = orgIds.length
    ? await prisma.organization.findMany({
        where: { id: { in: orgIds } },
        select: { id: true, name: true, subscriptionTier: true },
      })
    : [];
  const orgById = new Map(orgs.map((o) => [o.id, o]));

  const usageByOrg = usageRows
    .map((r) => {
      const org = r.orgId != null ? orgById.get(r.orgId) : null;
      return {
        orgId: r.orgId ?? null,
        orgName: org?.name ?? null,
        subscriptionTier: org?.subscriptionTier ?? null,
        usedCount: r._sum.usedCount ?? 0,
      };
    })
    .sort((a, b) => b.usedCount - a.usedCount);

  const byDay = Array.from(byDayMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([dayKey, t]) => ({ dayKey, totals: t }));

  const byTier = Array.from(byTierMap.entries()).map(([k, t]) => ({
    subscriptionTier: k === 'unknown' ? null : k,
    totals: t,
  }));

  return {
    window: { days, fromDayKey, toDayKey },
    totals,
    byDay,
    usageByOrg,
    byTier,
    byPromptSelection,
  };
}

