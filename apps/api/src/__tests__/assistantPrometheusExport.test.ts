import { describe, it, expect, vi } from 'vitest';
import { buildAssistantPrometheusMetrics } from '../services/ai/assistantPrometheusExport';

describe('buildAssistantPrometheusMetrics', () => {
  it('renders prometheus text with metric labels', async () => {
    const prisma: any = {
      assistantMetricEvent: {
        groupBy: vi.fn()
          .mockResolvedValueOnce([
            {
              metric: 'assistant.stream.success',
              transport: 'sse',
              failureCategory: null,
              subscriptionTier: 'starter',
              _sum: { value: 3 },
            },
          ])
          .mockResolvedValueOnce([
            {
              metric: 'assistant.provider.failure',
              transport: 'json',
              failureCategory: 'rate_limited',
              subscriptionTier: 'starter',
              _sum: { value: 2 },
            },
          ]),
      },
    };

    const out = await buildAssistantPrometheusMetrics(prisma, new Date('2026-04-13T12:00:00.000Z'));
    expect(out).toContain('# TYPE skylara_assistant_events_total counter');
    expect(out).toContain('skylara_assistant_events_total{window="1h",metric="assistant.stream.success",transport="sse",tier="starter"} 3');
    expect(out).toContain('failure_category="rate_limited"');
  });
});

