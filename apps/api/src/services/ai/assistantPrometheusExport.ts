import type { PrismaClient } from '@prisma/client';

type WindowKey = '1h' | '24h';

function sanitizeLabelValue(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
}

function promLine(name: string, labels: Record<string, string | null | undefined>, value: number): string {
  const parts: string[] = [];
  for (const [k, raw] of Object.entries(labels)) {
    if (raw == null || raw === '') continue;
    parts.push(`${k}="${sanitizeLabelValue(String(raw))}"`);
  }
  const labelStr = parts.length ? `{${parts.join(',')}}` : '';
  return `${name}${labelStr} ${value}`;
}

async function aggregateWindow(
  prisma: PrismaClient,
  since: Date
): Promise<Array<{ metric: string; value: number; transport: string | null; failureCategory: string | null; subscriptionTier: string | null }>> {
  const rows = await prisma.assistantMetricEvent.groupBy({
    by: ['metric', 'transport', 'failureCategory', 'subscriptionTier'],
    where: { createdAt: { gte: since } },
    _sum: { value: true },
  });
  return rows.map((r) => ({
    metric: r.metric,
    transport: r.transport ?? null,
    failureCategory: (r as any).failureCategory ?? null,
    subscriptionTier: r.subscriptionTier ?? null,
    value: r._sum.value ?? 0,
  }));
}

export async function buildAssistantPrometheusMetrics(
  prisma: PrismaClient,
  now: Date = new Date()
): Promise<string> {
  const windows: Array<{ key: WindowKey; since: Date }> = [
    { key: '1h', since: new Date(now.getTime() - 60 * 60 * 1000) },
    { key: '24h', since: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
  ];

  const blocks: string[] = [];
  blocks.push('# HELP skylara_assistant_events_total Assistant rollout counters (prompt-safe).');
  blocks.push('# TYPE skylara_assistant_events_total counter');

  for (const w of windows) {
    const rows = await aggregateWindow(prisma, w.since);
    for (const r of rows) {
      blocks.push(
        promLine(
          'skylara_assistant_events_total',
          {
            window: w.key,
            metric: r.metric,
            transport: r.transport,
            failure_category: r.failureCategory,
            tier: r.subscriptionTier,
          },
          r.value
        )
      );
    }
  }

  return `${blocks.join('\n')}\n`;
}

