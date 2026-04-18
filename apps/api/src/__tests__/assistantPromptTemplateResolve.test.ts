import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID,
  PORTAL_ASSISTANT_TEMPLATE_V2_ID,
} from '../services/ai/assistantPromptRegistry';
import { resolveAssistantPromptTemplateSelection } from '../services/ai/assistantPromptTemplateResolve';

describe('assistantPromptTemplateResolve', () => {
  it('prefers organization pin over experiment and env', () => {
    const r = resolveAssistantPromptTemplateSelection({
      orgAssistantPromptTemplateId: PORTAL_ASSISTANT_TEMPLATE_V2_ID,
      experimentAssignedTemplateId: DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID,
      experimentRecordId: 99,
      experimentKey: 'x',
      envAssistantPromptVersion: DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID,
    });
    expect(r.selectionSource).toBe('organization');
    expect(r.templateId).toBe(PORTAL_ASSISTANT_TEMPLATE_V2_ID);
    expect(r.experimentId).toBeNull();
    expect(r.requestedPin).toBe(PORTAL_ASSISTANT_TEMPLATE_V2_ID);
  });

  it('uses experiment when org pin absent and experiment template valid', () => {
    const r = resolveAssistantPromptTemplateSelection({
      orgAssistantPromptTemplateId: null,
      experimentAssignedTemplateId: PORTAL_ASSISTANT_TEMPLATE_V2_ID,
      experimentRecordId: 5,
      experimentKey: 'trial_a',
      envAssistantPromptVersion: DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID,
    });
    expect(r.selectionSource).toBe('experiment');
    expect(r.templateId).toBe(PORTAL_ASSISTANT_TEMPLATE_V2_ID);
    expect(r.experimentId).toBe(5);
    expect(r.experimentKey).toBe('trial_a');
    expect(r.requestedPin).toBeNull();
  });

  it('skips invalid experiment template id and uses environment', () => {
    const r = resolveAssistantPromptTemplateSelection({
      orgAssistantPromptTemplateId: null,
      experimentAssignedTemplateId: 'not-in-registry',
      experimentRecordId: 1,
      envAssistantPromptVersion: PORTAL_ASSISTANT_TEMPLATE_V2_ID,
    });
    expect(r.selectionSource).toBe('environment');
    expect(r.templateId).toBe(PORTAL_ASSISTANT_TEMPLATE_V2_ID);
    expect(r.experimentId).toBeNull();
  });

  it('uses environment when org pin absent and no experiment', () => {
    const r = resolveAssistantPromptTemplateSelection({
      orgAssistantPromptTemplateId: null,
      envAssistantPromptVersion: PORTAL_ASSISTANT_TEMPLATE_V2_ID,
    });
    expect(r.selectionSource).toBe('environment');
    expect(r.templateId).toBe(PORTAL_ASSISTANT_TEMPLATE_V2_ID);
    expect(r.experimentId).toBeNull();
  });

  it('uses registry default when org empty and env unset', () => {
    const r = resolveAssistantPromptTemplateSelection({
      orgAssistantPromptTemplateId: '   ',
      envAssistantPromptVersion: undefined,
    });
    expect(r.selectionSource).toBe('registry_default');
    expect(r.templateId).toBe(DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID);
    expect(r.headerVersion).toBe(DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID);
    expect(r.requestedPin).toBeNull();
    expect(r.experimentId).toBeNull();
  });

  it('normalizes unknown org pin to default with normalized header', () => {
    const r = resolveAssistantPromptTemplateSelection({
      orgAssistantPromptTemplateId: 'not-a-real-template@ever',
      envAssistantPromptVersion: PORTAL_ASSISTANT_TEMPLATE_V2_ID,
    });
    expect(r.selectionSource).toBe('organization');
    expect(r.templateId).toBe(DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID);
    expect(r.headerVersion).toBe(DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID);
    expect(r.requestedPin).toBe('not-a-real-template@ever');
  });
});
