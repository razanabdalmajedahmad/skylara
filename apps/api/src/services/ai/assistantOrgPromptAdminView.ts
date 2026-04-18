/**
 * Phase 24: read-only view model for org assistant prompt template admin (metadata only).
 */

import { getEnv } from '../../utils/env';
import {
  listRegisteredAssistantTemplateSummaries,
} from './assistantPromptRegistry';
import {
  resolveAssistantPromptTemplateSelection,
  type AssistantPromptTemplateSelectionSource,
} from './assistantPromptTemplateResolve';

export type OrgAssistantPromptAdminPayload = {
  organizationId: number;
  organizationName: string;
  assistantPromptTemplateIdPinned: string | null;
  templates: Array<{ id: string; description: string }>;
  effective: {
    requestedOrgTemplateId: string | null;
    resolvedTemplateId: string;
    selectionSource: AssistantPromptTemplateSelectionSource;
    headerVersion: string;
  };
  fallbackOrderHelp: string;
};

export function buildOrgAssistantPromptAdminView(org: {
  id: number;
  name: string;
  assistantPromptTemplateId: string | null;
}): OrgAssistantPromptAdminPayload {
  const pinned = org.assistantPromptTemplateId?.trim() || null;
  const env = getEnv();
  const effective = resolveAssistantPromptTemplateSelection({
    orgAssistantPromptTemplateId: pinned,
    envAssistantPromptVersion: env.ASSISTANT_PROMPT_VERSION ?? process.env.ASSISTANT_PROMPT_VERSION,
  });

  return {
    organizationId: org.id,
    organizationName: org.name,
    assistantPromptTemplateIdPinned: pinned,
    templates: listRegisteredAssistantTemplateSummaries(),
    effective: {
      requestedOrgTemplateId: pinned,
      resolvedTemplateId: effective.templateId,
      selectionSource: effective.selectionSource,
      headerVersion: effective.headerVersion,
    },
    fallbackOrderHelp:
      'Runtime resolution: (1) organization pin; (2) staged experiment (this org) when enabled, cohort tier matches, deterministic rollout %, and ASSISTANT_PROMPT_EXPERIMENTS_ENABLED is not false; (3) ASSISTANT_PROMPT_VERSION; (4) platform default. This panel’s “effective” line reflects pin + env/default only (not per-user experiment assignment).',
  };
}
