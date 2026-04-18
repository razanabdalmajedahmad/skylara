import { describe, it, expect, vi } from 'vitest';
import { getAssistantRolloutReport } from '../services/ai/assistantRolloutReport';

describe('getAssistantRolloutReport', () => {
  it('aggregates metric totals and org usage', async () => {
    const prisma: any = {
      assistantMetricEvent: {
        findMany: vi.fn().mockResolvedValue([
          {
            dayKey: '2026-04-13',
            metric: 'assistant.stream.success',
            value: 2,
            subscriptionTier: 'starter',
            tags: { promptSelectionSource: 'experiment' },
          },
          {
            dayKey: '2026-04-13',
            metric: 'assistant.stream.fallback',
            value: 1,
            subscriptionTier: 'starter',
            tags: { promptSelectionSource: 'registry_default' },
          },
          {
            dayKey: '2026-04-12',
            metric: 'assistant.usage.blocked',
            value: 3,
            subscriptionTier: 'pro',
            tags: null,
          },
        ]),
      },
      assistantUsageDaily: {
        groupBy: vi.fn().mockResolvedValue([
          { orgId: 10, _sum: { usedCount: 9 } },
          { orgId: null, _sum: { usedCount: 2 } },
        ]),
      },
      organization: {
        findMany: vi.fn().mockResolvedValue([
          { id: 10, name: 'DZ Alpha', subscriptionTier: 'starter' },
        ]),
      },
    };

    const rep = await getAssistantRolloutReport(prisma, { days: 7 });
    expect(rep.totals['assistant.stream.success']).toBe(2);
    expect(rep.totals['assistant.stream.fallback']).toBe(1);
    expect(rep.totals['assistant.usage.blocked']).toBe(3);
    expect(rep.usageByOrg[0]).toMatchObject({ orgId: 10, orgName: 'DZ Alpha', usedCount: 9 });
    expect(rep.byPromptSelection.experiment?.['assistant.stream.success']).toBe(2);
    expect(rep.byPromptSelection.registry_default?.['assistant.stream.fallback']).toBe(1);
    expect(rep.byPromptSelection.unknown?.['assistant.usage.blocked']).toBe(3);
  });
});

