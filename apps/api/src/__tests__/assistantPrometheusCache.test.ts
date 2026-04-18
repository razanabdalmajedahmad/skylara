import { describe, it, expect, vi } from 'vitest';

vi.mock('../services/ai/assistantPrometheusExport', () => ({
  buildAssistantPrometheusMetrics: vi.fn(async () => 'ok\n'),
}));

import { getAssistantPrometheusMetricsCached } from '../services/ai/assistantPrometheusCache';

describe('getAssistantPrometheusMetricsCached', () => {
  it('caches within TTL and returns stale while rebuilding', async () => {
    const prisma: any = {};
    const now = 1_000_000;

    const first = await getAssistantPrometheusMetricsCached(prisma, { ttlMs: 10_000, nowMs: now });
    expect(first.body).toContain('ok');
    expect(first.cache.hit).toBe(false);

    const second = await getAssistantPrometheusMetricsCached(prisma, { ttlMs: 10_000, nowMs: now + 100 });
    expect(second.cache.hit).toBe(true);
    expect(second.cache.stale).toBe(false);

    // Expired: should return stale (hit) while rebuild triggers.
    const third = await getAssistantPrometheusMetricsCached(prisma, { ttlMs: 10_000, nowMs: now + 20_000 });
    expect(third.cache.hit).toBe(true);
  });
});

