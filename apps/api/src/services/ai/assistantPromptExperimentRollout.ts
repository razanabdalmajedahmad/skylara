/**
 * Phase 26: deterministic per-user inclusion for org assistant prompt experiments.
 */

import { createHash } from 'crypto';
import type { PrismaClient } from '@prisma/client';
import { ASSISTANT_PROMPT_REGISTRY } from './assistantPromptRegistry';

export type AssistantPromptExperimentAssignment = {
  templateId: string;
  experimentId: number;
  experimentKey: string | null;
};

/** Stable 0–99 bucket for (userId, organizationId). */
export function assistantPromptExperimentRolloutBucket(userId: number, organizationId: number): number {
  const h = createHash('sha256')
    .update(`skylara:assistant_prompt_experiment:v1:${organizationId}:${userId}`, 'utf8')
    .digest();
  return h.readUInt32BE(0) % 100;
}

/** True if user is in the `rolloutPercent` slice (0–100). */
export function userIncludedInAssistantPromptRollout(
  userId: number,
  organizationId: number,
  rolloutPercent: number
): boolean {
  const p = Math.max(0, Math.min(100, Math.floor(rolloutPercent)));
  if (p >= 100) return true;
  if (p <= 0) return false;
  return assistantPromptExperimentRolloutBucket(userId, organizationId) < p;
}

function cohortTiersAllowSubscription(cohortTiers: unknown, subscriptionTier: string | null): boolean {
  if (cohortTiers == null) return true;
  if (!Array.isArray(cohortTiers)) return true;
  const tiers = cohortTiers.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  if (tiers.length === 0) return true;
  const sub = (subscriptionTier || '').trim().toLowerCase();
  if (!sub) return false;
  return tiers.some((t) => t.trim().toLowerCase() === sub);
}

/**
 * When org has no template pin, returns experiment template assignment if DB row is active and user passes cohort + rollout gates.
 */
export async function resolveOrganizationAssistantPromptExperimentAssignment(
  prisma: Pick<PrismaClient, 'organizationAssistantPromptExperiment'>,
  params: {
    organizationId: number | null;
    userId: number;
    subscriptionTier: string | null;
    experimentsGloballyEnabled: boolean;
  }
): Promise<AssistantPromptExperimentAssignment | null> {
  if (!params.experimentsGloballyEnabled || params.organizationId == null) {
    return null;
  }

  const row = await prisma.organizationAssistantPromptExperiment.findUnique({
    where: { organizationId: params.organizationId },
  });
  if (!row || !row.enabled) return null;

  const tid = (row.experimentTemplateId || '').trim();
  if (!tid || !ASSISTANT_PROMPT_REGISTRY[tid]) return null;

  if (!cohortTiersAllowSubscription(row.cohortTiers, params.subscriptionTier)) return null;

  if (!userIncludedInAssistantPromptRollout(params.userId, params.organizationId, row.rolloutPercent)) {
    return null;
  }

  return {
    templateId: tid,
    experimentId: row.id,
    experimentKey: row.experimentKey?.trim() || null,
  };
}
