import type { AssistantPromptTemplateSelection } from './assistantPromptTemplateResolve';

/** JSON key on `AssistantMetricEvent.tags` — safe governance slice for experiment reporting. */
export const PROMPT_SELECTION_SOURCE_TAG = 'promptSelectionSource' as const;
export const REGISTRY_TEMPLATE_ID_TAG = 'registryTemplateId' as const;
export const EXPERIMENT_ID_TAG = 'assistantPromptExperimentId' as const;
export const EXPERIMENT_KEY_TAG = 'assistantPromptExperimentKey' as const;

export type KnownPromptSelectionTag =
  | 'organization'
  | 'experiment'
  | 'environment'
  | 'registry_default'
  | 'unknown';

/**
 * Prompt-safe tags merged into assistant metric rows for rollout / experiment comparison.
 * No prompt bodies; registry template id only.
 */
export function buildAssistantMetricPromptTags(
  sel: AssistantPromptTemplateSelection
): Record<string, string | number> {
  const out: Record<string, string | number> = {
    [PROMPT_SELECTION_SOURCE_TAG]: sel.selectionSource,
    [REGISTRY_TEMPLATE_ID_TAG]: sel.templateId,
  };
  if (sel.experimentId != null) {
    out[EXPERIMENT_ID_TAG] = sel.experimentId;
  }
  if (sel.experimentKey) {
    out[EXPERIMENT_KEY_TAG] = sel.experimentKey;
  }
  return out;
}

export function mergeAssistantMetricTags(
  prompt: Record<string, string | number>,
  extra?: Record<string, unknown> | null
): Record<string, unknown> {
  if (!extra || Object.keys(extra).length === 0) {
    return { ...prompt };
  }
  return { ...prompt, ...extra };
}

export function parsePromptSelectionFromMetricTags(tags: unknown): KnownPromptSelectionTag {
  if (!tags || typeof tags !== 'object') return 'unknown';
  const raw = (tags as Record<string, unknown>)[PROMPT_SELECTION_SOURCE_TAG];
  if (raw === 'organization' || raw === 'experiment' || raw === 'environment' || raw === 'registry_default') {
    return raw;
  }
  return 'unknown';
}
