/**
 * Phase 9: lightweight per-user usage counters (in-memory).
 * - Additive: no schema changes required.
 * - Extensible: can be swapped for Redis/DB later without changing route contracts.
 */

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const usageByUserDay = new Map<string, number>();

function key(userId: number, day: string): string {
  return `${userId}:${day}`;
}

export function getAssistantUsedToday(userId: number, now: Date = new Date()): number {
  const day = utcDayKey(now);
  return usageByUserDay.get(key(userId, day)) ?? 0;
}

export function incrementAssistantUsedToday(userId: number, now: Date = new Date()): number {
  const day = utcDayKey(now);
  const k = key(userId, day);
  const next = (usageByUserDay.get(k) ?? 0) + 1;
  usageByUserDay.set(k, next);
  return next;
}

/** Test-only helper. */
export function resetAssistantUsageStoreForTests(): void {
  usageByUserDay.clear();
}

