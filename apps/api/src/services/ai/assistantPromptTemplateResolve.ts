/**
 * Phase 23–26: per-tenant assistant prompt template selection.
 * Resolution order: org DB pin → staged experiment (when no pin) → deployment env → registry default.
 * Unknown template ids normalize via {@link resolveRegisteredAssistantTemplateId} (except experiment branch requires a registered id).
 */

import {
  ASSISTANT_PROMPT_REGISTRY,
  DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID,
  resolveRegisteredAssistantTemplateId,
} from './assistantPromptRegistry';

export type AssistantPromptTemplateSelectionSource =
  | 'organization'
  | 'experiment'
  | 'environment'
  | 'registry_default';

export type AssistantPromptTemplateSelection = {
  /** Resolved registry key (always registered or defaulted). */
  templateId: string;
  /** `Prompt-Version:` header value (normalized when request was unknown). */
  headerVersion: string;
  selectionSource: AssistantPromptTemplateSelectionSource;
  /** Trimmed winning pin from org or env; null when using experiment or registry default only. */
  requestedPin: string | null;
  /** Set when `selectionSource === 'experiment'`. */
  experimentId: number | null;
  experimentKey: string | null;
};

function headerForRequested(requested: string, resolvedTemplateId: string): string {
  return ASSISTANT_PROMPT_REGISTRY[requested] ? requested : resolvedTemplateId;
}

/**
 * Pick portal assistant template: org pin → experiment assignment → env → default.
 * Does not log; callers add metadata only.
 */
export function resolveAssistantPromptTemplateSelection(params: {
  /** `Organization.assistantPromptTemplateId` when org is known. */
  orgAssistantPromptTemplateId: string | null | undefined;
  /**
   * Valid registry id from Phase 26 experiment row when user passes cohort + rollout gates.
   * Caller must only pass ids already verified against {@link ASSISTANT_PROMPT_REGISTRY}.
   */
  experimentAssignedTemplateId?: string | null | undefined;
  experimentRecordId?: number | null | undefined;
  experimentKey?: string | null | undefined;
  /** Parsed `ASSISTANT_PROMPT_VERSION` / process.env (may be undefined). */
  envAssistantPromptVersion: string | null | undefined;
}): AssistantPromptTemplateSelection {
  const org = (params.orgAssistantPromptTemplateId || '').trim();
  if (org) {
    const templateId = resolveRegisteredAssistantTemplateId(org);
    return {
      templateId,
      headerVersion: headerForRequested(org, templateId),
      selectionSource: 'organization',
      requestedPin: org,
      experimentId: null,
      experimentKey: null,
    };
  }

  const exp = (params.experimentAssignedTemplateId || '').trim();
  if (exp && ASSISTANT_PROMPT_REGISTRY[exp]) {
    return {
      templateId: exp,
      headerVersion: exp,
      selectionSource: 'experiment',
      requestedPin: null,
      experimentId: params.experimentRecordId ?? null,
      experimentKey: (params.experimentKey || '').trim() || null,
    };
  }

  const env = (params.envAssistantPromptVersion || '').trim();
  if (env) {
    const templateId = resolveRegisteredAssistantTemplateId(env);
    return {
      templateId,
      headerVersion: headerForRequested(env, templateId),
      selectionSource: 'environment',
      requestedPin: env,
      experimentId: null,
      experimentKey: null,
    };
  }

  const templateId = DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID;
  return {
    templateId,
    headerVersion: templateId,
    selectionSource: 'registry_default',
    requestedPin: null,
    experimentId: null,
    experimentKey: null,
  };
}
