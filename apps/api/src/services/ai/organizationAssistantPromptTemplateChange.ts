/**
 * Phase 25: durable audit for organization assistant prompt template pins.
 * Typed columns only — no prompt bodies, no secrets.
 */

import type { Prisma, PrismaClient } from '@prisma/client';
import { getEnv } from '../../utils/env';
import { resolveAssistantPromptTemplateSelection } from './assistantPromptTemplateResolve';

export type OrganizationAssistantPromptTemplateChangeParams = {
  organizationId: number;
  previousTemplateId: string | null;
  newTemplateId: string | null;
  actorUserId: number;
  actorRoleSummary: string | null;
  /** e.g. dashboard_put, api_put */
  changeSource: string;
};

function clampRoleSummary(raw: string | null | undefined): string | null {
  if (raw == null || !String(raw).trim()) return null;
  const s = String(raw).trim();
  return s.length <= 256 ? s : s.slice(0, 253) + '...';
}

/**
 * Updates `Organization.assistantPromptTemplateId` and appends an audit row atomically.
 * @throws Propagates Prisma errors (caller should map to 5xx).
 */
export async function applyOrganizationAssistantPromptTemplateWithAudit(
  prisma: PrismaClient,
  params: OrganizationAssistantPromptTemplateChangeParams
): Promise<void> {
  const env = getEnv();
  const effective = resolveAssistantPromptTemplateSelection({
    orgAssistantPromptTemplateId: params.newTemplateId,
    envAssistantPromptVersion: env.ASSISTANT_PROMPT_VERSION ?? process.env.ASSISTANT_PROMPT_VERSION,
  });

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.organization.update({
      where: { id: params.organizationId },
      data: { assistantPromptTemplateId: params.newTemplateId },
    });
    await tx.organizationAssistantPromptTemplateChange.create({
      data: {
        organizationId: params.organizationId,
        previousTemplateId: params.previousTemplateId,
        newTemplateId: params.newTemplateId,
        actorUserId: params.actorUserId,
        actorRoleSummary: clampRoleSummary(params.actorRoleSummary),
        changeSource: params.changeSource.slice(0, 64),
        effectiveSelectionSource: effective.selectionSource,
      },
    });
  });
}
