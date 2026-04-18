import type { PrismaClient } from '@prisma/client';

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getAssistantUsedTodayPersistent(
  prisma: PrismaClient,
  params: { userId: number; orgId: number | null },
  now: Date = new Date()
): Promise<number> {
  const dayKey = utcDayKey(now);
  const row = await prisma.assistantUsageDaily.findUnique({
    where: { dayKey_userId: { dayKey, userId: params.userId } },
    select: { usedCount: true },
  });
  return row?.usedCount ?? 0;
}

export async function incrementAssistantUsedTodayPersistent(
  prisma: PrismaClient,
  params: { userId: number; orgId: number | null },
  now: Date = new Date()
): Promise<number> {
  const dayKey = utcDayKey(now);

  const row = await prisma.assistantUsageDaily.upsert({
    where: { dayKey_userId: { dayKey, userId: params.userId } },
    create: {
      dayKey,
      orgId: params.orgId,
      userId: params.userId,
      usedCount: 1,
    },
    update: { usedCount: { increment: 1 } },
    select: { usedCount: true },
  });

  return row.usedCount;
}

