/**
 * Centralized retry policy for LLM HTTP providers — safe cases only.
 */

/** HTTP statuses safe to retry (rate limit + selected server instability). */
export function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential backoff with small jitter. `attemptIndex` is 0 after first failure (delay before 2nd try).
 */
export function computeRetryDelayMs(attemptIndex: number, baseMs: number, maxMs: number): number {
  const cappedBase = Math.max(1, baseMs);
  const exp = Math.min(maxMs, cappedBase * Math.pow(2, attemptIndex));
  const jitter = Math.floor(Math.random() * 120);
  return Math.min(maxMs, Math.floor(exp) + jitter);
}
