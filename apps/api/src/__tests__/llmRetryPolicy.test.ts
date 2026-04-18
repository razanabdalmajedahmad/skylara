import { describe, it, expect, vi, afterEach } from 'vitest';
import { computeRetryDelayMs, isRetryableHttpStatus, sleepMs } from '../services/llm/llmRetryPolicy';

describe('llmRetryPolicy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('isRetryableHttpStatus is true only for 429 and selected 5xx', () => {
    expect(isRetryableHttpStatus(429)).toBe(true);
    expect(isRetryableHttpStatus(500)).toBe(true);
    expect(isRetryableHttpStatus(502)).toBe(true);
    expect(isRetryableHttpStatus(503)).toBe(true);
    expect(isRetryableHttpStatus(504)).toBe(true);
    expect(isRetryableHttpStatus(401)).toBe(false);
    expect(isRetryableHttpStatus(403)).toBe(false);
    expect(isRetryableHttpStatus(404)).toBe(false);
    expect(isRetryableHttpStatus(418)).toBe(false);
    expect(isRetryableHttpStatus(501)).toBe(false);
    expect(isRetryableHttpStatus(505)).toBe(false);
  });

  it('computeRetryDelayMs grows with attemptIndex and respects max', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(computeRetryDelayMs(0, 100, 10_000)).toBe(100);
    expect(computeRetryDelayMs(1, 100, 10_000)).toBe(200);
    expect(computeRetryDelayMs(2, 100, 250)).toBe(250);
  });

  it('sleepMs resolves after the given delay', async () => {
    vi.useFakeTimers();
    let done = false;
    const p = sleepMs(50).then(() => {
      done = true;
    });
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(49);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    await p;
    expect(done).toBe(true);
    vi.useRealTimers();
  });
});
