import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyOrganizationAssistantPromptTemplateWithAudit } from '../services/ai/organizationAssistantPromptTemplateChange';

vi.mock('../utils/env', () => ({
  getEnv: vi.fn(() => ({})),
}));

describe('organizationAssistantPromptTemplateChange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs organization update and change insert inside one transaction', async () => {
    const tx = {
      organization: {
        update: vi.fn().mockResolvedValue({}),
      },
      organizationAssistantPromptTemplateChange: {
        create: vi.fn().mockResolvedValue({ id: 1 }),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) => {
        await fn(tx);
      }),
    };

    await applyOrganizationAssistantPromptTemplateWithAudit(prisma as any, {
      organizationId: 42,
      previousTemplateId: null,
      newTemplateId: 'portal_assistant@2026-04-13.v2',
      actorUserId: 7,
      actorRoleSummary: 'DZ_MANAGER',
      changeSource: 'dashboard_put',
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.organization.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { assistantPromptTemplateId: 'portal_assistant@2026-04-13.v2' },
    });
    expect(tx.organizationAssistantPromptTemplateChange.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 42,
        previousTemplateId: null,
        newTemplateId: 'portal_assistant@2026-04-13.v2',
        actorUserId: 7,
        actorRoleSummary: 'DZ_MANAGER',
        changeSource: 'dashboard_put',
        effectiveSelectionSource: 'organization',
      }),
    });
  });
});
