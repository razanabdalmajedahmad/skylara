import type { Prisma, PrismaClient } from '@prisma/client';

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type AssistantMetricRecord = {
  metric: string;
  value?: number;
  transport?: 'json' | 'sse';
  outcome?: string | null;
  failureCategory?: string | null;
  userId?: number | null;
  orgId?: number | null;
  subscriptionTier?: string | null;
  tags?: Record<string, unknown> | null;
};

export async function recordAssistantMetricEvent(
  prisma: PrismaClient,
  rec: AssistantMetricRecord,
  now: Date = new Date()
): Promise<void> {
  const dayKey = utcDayKey(now);
  const value = Math.max(1, Math.floor(rec.value ?? 1));

  await prisma.assistantMetricEvent
    .create({
      data: {
        dayKey,
        metric: rec.metric,
        value,
        transport: rec.transport ?? null,
        outcome: rec.outcome ?? null,
        failureCategory: rec.failureCategory ?? null,
        userId: rec.userId ?? null,
        orgId: rec.orgId ?? null,
        subscriptionTier: rec.subscriptionTier ?? null,
        tags: (rec.tags ?? undefined) as unknown as Prisma.InputJsonValue | undefined,
      },
      select: { id: true },
    })
    .catch(() => {});
}

