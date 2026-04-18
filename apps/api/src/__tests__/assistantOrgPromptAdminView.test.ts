import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildOrgAssistantPromptAdminView } from '../services/ai/assistantOrgPromptAdminView';
import {
  DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID,
  PORTAL_ASSISTANT_TEMPLATE_V2_ID,
} from '../services/ai/assistantPromptRegistry';

vi.mock('../utils/env', () => ({
  getEnv: vi.fn(() => ({})),
}));

import { getEnv } from '../utils/env';

describe('assistantOrgPromptAdminView', () => {
  beforeEach(() => {
    vi.mocked(getEnv).mockReturnValue({} as ReturnType<typeof getEnv>);
    delete process.env.ASSISTANT_PROMPT_VERSION;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows organization source when pin set', () => {
    const data = buildOrgAssistantPromptAdminView({
      id: 9,
      name: 'Test Org',
      assistantPromptTemplateId: PORTAL_ASSISTANT_TEMPLATE_V2_ID,
    });
    expect(data.organizationId).toBe(9);
    expect(data.assistantPromptTemplateIdPinned).toBe(PORTAL_ASSISTANT_TEMPLATE_V2_ID);
    expect(data.effective.selectionSource).toBe('organization');
    expect(data.effective.resolvedTemplateId).toBe(PORTAL_ASSISTANT_TEMPLATE_V2_ID);
    expect(data.templates.length).toBeGreaterThanOrEqual(3);
  });

  it('falls back to registry default when no pin and no env', () => {
    const data = buildOrgAssistantPromptAdminView({
      id: 1,
      name: 'O',
      assistantPromptTemplateId: null,
    });
    expect(data.effective.selectionSource).toBe('registry_default');
    expect(data.effective.resolvedTemplateId).toBe(DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID);
  });

  it('uses environment when org pin cleared and env set', () => {
    vi.mocked(getEnv).mockReturnValue({
      ASSISTANT_PROMPT_VERSION: PORTAL_ASSISTANT_TEMPLATE_V2_ID,
    } as ReturnType<typeof getEnv>);
    const data = buildOrgAssistantPromptAdminView({
      id: 2,
      name: 'O2',
      assistantPromptTemplateId: null,
    });
    expect(data.effective.selectionSource).toBe('environment');
    expect(data.effective.resolvedTemplateId).toBe(PORTAL_ASSISTANT_TEMPLATE_V2_ID);
  });
});
