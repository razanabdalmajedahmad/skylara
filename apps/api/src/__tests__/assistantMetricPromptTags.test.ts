import { describe, it, expect } from 'vitest';
import {
  buildAssistantMetricPromptTags,
  mergeAssistantMetricTags,
  parsePromptSelectionFromMetricTags,
  PROMPT_SELECTION_SOURCE_TAG,
} from '../services/ai/assistantMetricPromptTags';
import type { AssistantPromptTemplateSelection } from '../services/ai/assistantPromptTemplateResolve';

function sel(partial: Partial<AssistantPromptTemplateSelection>): AssistantPromptTemplateSelection {
  return {
    templateId: 'portal_assistant@2026-04-13.v3',
    headerVersion: 'portal_assistant@2026-04-13.v3',
    selectionSource: 'registry_default',
    requestedPin: null,
    experimentId: null,
    experimentKey: null,
    ...partial,
  };
}

describe('assistantMetricPromptTags', () => {
  it('buildAssistantMetricPromptTags includes selection source and registry id', () => {
    const t = buildAssistantMetricPromptTags(
      sel({ selectionSource: 'experiment', experimentId: 1, experimentKey: 'phase27_a' })
    );
    expect(t[PROMPT_SELECTION_SOURCE_TAG]).toBe('experiment');
    expect(t.registryTemplateId).toBe('portal_assistant@2026-04-13.v3');
    expect(t.assistantPromptExperimentId).toBe(1);
    expect(t.assistantPromptExperimentKey).toBe('phase27_a');
  });

  it('mergeAssistantMetricTags preserves prompt fields and adds extras', () => {
    const p = buildAssistantMetricPromptTags(sel({ selectionSource: 'environment' }));
    const m = mergeAssistantMetricTags(p, { policySource: 'tier_json' });
    expect(m.promptSelectionSource).toBe('environment');
    expect(m.policySource).toBe('tier_json');
  });

  it('parsePromptSelectionFromMetricTags reads known sources', () => {
    expect(parsePromptSelectionFromMetricTags({ promptSelectionSource: 'experiment' })).toBe('experiment');
    expect(parsePromptSelectionFromMetricTags({ promptSelectionSource: 'registry_default' })).toBe(
      'registry_default'
    );
    expect(parsePromptSelectionFromMetricTags(null)).toBe('unknown');
    expect(parsePromptSelectionFromMetricTags({ promptSelectionSource: 'bogus' })).toBe('unknown');
  });
});
