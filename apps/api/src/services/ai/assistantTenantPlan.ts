import type { PrismaClient } from '@prisma/client';

export type AssistantTenantPlanContext = {
  userId: number;
  orgId: number | null;
  dropzoneId: number | null;
  subscriptionTier: string | null;
  /** From `Organization.assistantPromptTemplateId` when org resolved; null otherwise. */
  assistantPromptTemplateId: string | null;
};

export async function getAssistantTenantPlanContext(
  prisma: PrismaClient,
  userId: number,
  jwtDropzoneId?: number | null
): Promise<AssistantTenantPlanContext> {
  // Prefer explicit DZ scope (from JWT) if available, then infer org from DZ.
  if (jwtDropzoneId != null && Number.isFinite(jwtDropzoneId) && jwtDropzoneId > 0) {
    const dz = await prisma.dropzone.findUnique({
      where: { id: jwtDropzoneId },
      select: {
        id: true,
        organizationId: true,
        organization: { select: { subscriptionTier: true, assistantPromptTemplateId: true } },
      },
    });

    return {
      userId,
      dropzoneId: dz?.id ?? jwtDropzoneId,
      orgId: dz?.organizationId ?? null,
      subscriptionTier: dz?.organization?.subscriptionTier ?? null,
      assistantPromptTemplateId: dz?.organization?.assistantPromptTemplateId ?? null,
    };
  }

  // Otherwise: look at most recent role grants (org/dz scopes live on UserRole).
  const lastRole = await prisma.userRole.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: { organizationId: true, dropzoneId: true },
  });

  const orgId = lastRole?.organizationId ?? null;
  const dzId = lastRole?.dropzoneId ?? null;

  if (orgId != null) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { subscriptionTier: true, assistantPromptTemplateId: true },
    });

    return {
      userId,
      orgId,
      dropzoneId: dzId,
      subscriptionTier: org?.subscriptionTier ?? null,
      assistantPromptTemplateId: org?.assistantPromptTemplateId ?? null,
    };
  }

  if (dzId != null) {
    const dz = await prisma.dropzone.findUnique({
      where: { id: dzId },
      select: {
        organizationId: true,
        organization: { select: { subscriptionTier: true, assistantPromptTemplateId: true } },
      },
    });
    return {
      userId,
      orgId: dz?.organizationId ?? null,
      dropzoneId: dzId,
      subscriptionTier: dz?.organization?.subscriptionTier ?? null,
      assistantPromptTemplateId: dz?.organization?.assistantPromptTemplateId ?? null,
    };
  }

  // Safe default when tenant data is missing.
  return {
    userId,
    orgId: null,
    dropzoneId: null,
    subscriptionTier: null,
    assistantPromptTemplateId: null,
  };
}
