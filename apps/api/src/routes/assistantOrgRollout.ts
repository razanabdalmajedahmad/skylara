import { Prisma } from '@prisma/client';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { getAssistantTenantPlanContext } from '../services/ai/assistantTenantPlan';
import { buildOrgAssistantPromptAdminView } from '../services/ai/assistantOrgPromptAdminView';
import { isRegisteredAssistantTemplateId } from '../services/ai/assistantPromptRegistry';
import { applyOrganizationAssistantPromptTemplateWithAudit } from '../services/ai/organizationAssistantPromptTemplateChange';
import { getAssistantRolloutReport } from '../services/ai/assistantRolloutReport';
import { getEnv } from '../utils/env';

/**
 * Assistant rollout report + organization assistant prompt template admin routes.
 * Registered as a separate Fastify plugin so these paths always mount reliably under /api.
 */

function normalizeExperimentCohortTiersJson(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const out = raw
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((x) => x.trim().slice(0, 64))
    .slice(0, 20);
  return out.length ? out : null;
}

export async function assistantOrgRolloutRoutes(fastify: FastifyInstance) {
  const prisma = (fastify as any).prisma;

  async function orgPromptTemplateAdminDataBundle(org: {
    id: number;
    name: string;
    assistantPromptTemplateId: string | null;
  }) {
    const experimentRow = await prisma.organizationAssistantPromptExperiment.findUnique({
      where: { organizationId: org.id },
    });
    const experimentConfig = experimentRow
      ? {
          id: experimentRow.id,
          organizationId: experimentRow.organizationId,
          enabled: experimentRow.enabled,
          experimentTemplateId: experimentRow.experimentTemplateId,
          cohortTiers: normalizeExperimentCohortTiersJson(experimentRow.cohortTiers),
          rolloutPercent: experimentRow.rolloutPercent,
          experimentKey: experimentRow.experimentKey,
        }
      : null;
    return {
      ...buildOrgAssistantPromptAdminView(org),
      experimentConfig,
      experimentsGloballyEnabled: getEnv().ASSISTANT_PROMPT_EXPERIMENTS_ENABLED !== false,
    };
  }

  // ============================================================================
  // OBSERVABILITY — assistant rollout reporting (Phase 12)
  // ============================================================================

  fastify.get(
    '/assistant/rollout/report',
    { preHandler: [authenticate, authorize(['DZ_MANAGER', 'DZ_OWNER', 'PLATFORM_ADMIN'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const q = request.query as Record<string, unknown>;
      const days = Math.max(1, Math.min(30, parseInt(String(q?.days ?? '7'), 10) || 7));
      const orgIdRaw = q?.orgId != null ? parseInt(String(q.orgId), 10) : null;
      const orgId = Number.isFinite(orgIdRaw) ? orgIdRaw : null;

      try {
        const data = await getAssistantRolloutReport(prisma, { days, orgId });
        return reply.send({ success: true, data });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Failed to build assistant rollout report' });
      }
    }
  );

  // ============================================================================
  // Phase 24 — Organization assistant prompt template (registry pin, metadata only)
  // ============================================================================

  const orgPromptTemplateAdminRoles = ['PLATFORM_ADMIN', 'DZ_MANAGER', 'DZ_OWNER'] as const;

  fastify.get(
    '/assistant/org-prompt-template',
    { preHandler: [authenticate, authorize([...orgPromptTemplateAdminRoles])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user.sub);
      const jwtDzId = parseInt(request.user.dropzoneId || '0') || null;
      const tenant = await getAssistantTenantPlanContext(prisma, userId, jwtDzId);
      if (tenant.orgId == null) {
        return reply.status(404).send({
          success: false,
          error:
            'No organization is associated with your session. Use a home dropzone or an organization-scoped role, then try again.',
        });
      }
      const org = await prisma.organization.findUnique({
        where: { id: tenant.orgId },
        select: { id: true, name: true, assistantPromptTemplateId: true },
      });
      if (!org) {
        return reply.status(404).send({ success: false, error: 'Organization not found' });
      }
      return reply.send({ success: true, data: await orgPromptTemplateAdminDataBundle(org) });
    }
  );

  fastify.get(
    '/assistant/org-prompt-template/history',
    { preHandler: [authenticate, authorize([...orgPromptTemplateAdminRoles])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user.sub);
      const jwtDzId = parseInt(request.user.dropzoneId || '0') || null;
      const tenant = await getAssistantTenantPlanContext(prisma, userId, jwtDzId);
      if (tenant.orgId == null) {
        return reply.status(404).send({
          success: false,
          error:
            'No organization is associated with your session. Use a home dropzone or an organization-scoped role, then try again.',
        });
      }

      const q = request.query as { limit?: string };
      const limitRaw = parseInt(String(q?.limit ?? '30'), 10);
      const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 30;

      const rows = await prisma.organizationAssistantPromptTemplateChange.findMany({
        where: { organizationId: tenant.orgId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          organizationId: true,
          previousTemplateId: true,
          newTemplateId: true,
          actorUserId: true,
          actorRoleSummary: true,
          changeSource: true,
          effectiveSelectionSource: true,
          createdAt: true,
        },
      });

      return reply.send({
        success: true,
        data: rows.map((row: (typeof rows)[number]) => ({
          id: row.id,
          organizationId: row.organizationId,
          previousTemplateId: row.previousTemplateId,
          newTemplateId: row.newTemplateId,
          actorUserId: row.actorUserId,
          actorRoleSummary: row.actorRoleSummary,
          changeSource: row.changeSource,
          effectiveSelectionSource: row.effectiveSelectionSource,
          createdAt: row.createdAt.toISOString(),
        })),
      });
    }
  );

  fastify.put<{ Body: { assistantPromptTemplateId?: string | null } }>(
    '/assistant/org-prompt-template',
    { preHandler: [authenticate, authorize([...orgPromptTemplateAdminRoles])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user.sub);
      const jwtDzId = parseInt(request.user.dropzoneId || '0') || null;
      const tenant = await getAssistantTenantPlanContext(prisma, userId, jwtDzId);
      if (tenant.orgId == null) {
        return reply.status(404).send({
          success: false,
          error:
            'No organization is associated with your session. Use a home dropzone or an organization-scoped role, then try again.',
        });
      }

      const body = request.body as { assistantPromptTemplateId?: unknown };
      if (!Object.prototype.hasOwnProperty.call(body, 'assistantPromptTemplateId')) {
        return reply.status(400).send({
          success: false,
          error: 'assistantPromptTemplateId is required (registry template id or null to clear)',
        });
      }

      const raw = body.assistantPromptTemplateId;
      let nextPin: string | null;
      if (raw === null || raw === '') {
        nextPin = null;
      } else if (typeof raw === 'string') {
        const t = raw.trim();
        if (!t) {
          nextPin = null;
        } else if (!isRegisteredAssistantTemplateId(t)) {
          return reply.status(400).send({
            success: false,
            error: 'Unknown assistant prompt template id. Choose a value from the registry list.',
          });
        } else {
          nextPin = t;
        }
      } else {
        return reply.status(400).send({
          success: false,
          error: 'assistantPromptTemplateId must be a string or null',
        });
      }

      const existing = await prisma.organization.findUnique({
        where: { id: tenant.orgId },
        select: { id: true, name: true, assistantPromptTemplateId: true },
      });
      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Organization not found' });
      }

      const previousTemplateId = existing.assistantPromptTemplateId?.trim() || null;

      const roles = (request.user.roles || []) as string[];
      const actorRoleSummary = roles.slice(0, 8).join(',');

      if (previousTemplateId !== nextPin) {
        try {
          await applyOrganizationAssistantPromptTemplateWithAudit(prisma, {
            organizationId: tenant.orgId,
            previousTemplateId,
            newTemplateId: nextPin,
            actorUserId: userId,
            actorRoleSummary,
            changeSource: 'dashboard_put',
          });
        } catch (err) {
          fastify.log.error({
            event: 'assistant.org_prompt_template.transaction_failed',
            orgId: tenant.orgId,
            actorUserId: userId,
            err,
          });
          return reply.status(503).send({
            success: false,
            error:
              'Could not save the template pin and audit record together. No change was applied. Retry or contact support.',
          });
        }
      }

      fastify.log.info({
        event: 'assistant.org_prompt_template.updated',
        orgId: tenant.orgId,
        actorUserId: userId,
        actorRoleSummary,
        previousTemplateId,
        newTemplateId: nextPin,
        durableAudit: previousTemplateId !== nextPin,
      });

      const refreshed = await prisma.organization.findUnique({
        where: { id: tenant.orgId },
        select: { id: true, name: true, assistantPromptTemplateId: true },
      });
      return reply.send({
        success: true,
        data: refreshed ? await orgPromptTemplateAdminDataBundle(refreshed) : null,
      });
    }
  );

  fastify.put(
    '/assistant/org-prompt-template/experiment',
    { preHandler: [authenticate, authorize([...orgPromptTemplateAdminRoles])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt(request.user.sub);
      const jwtDzId = parseInt(request.user.dropzoneId || '0') || null;
      const tenant = await getAssistantTenantPlanContext(prisma, userId, jwtDzId);
      if (tenant.orgId == null) {
        return reply.status(404).send({
          success: false,
          error:
            'No organization is associated with your session. Use a home dropzone or an organization-scoped role, then try again.',
        });
      }

      const body = request.body as Record<string, unknown>;
      if (typeof body.enabled !== 'boolean') {
        return reply.status(400).send({ success: false, error: 'enabled (boolean) is required' });
      }
      const enabled = body.enabled;
      const templateRaw = body.experimentTemplateId;
      if (typeof templateRaw !== 'string' || !templateRaw.trim()) {
        return reply.status(400).send({
          success: false,
          error: 'experimentTemplateId (non-empty registry template id) is required',
        });
      }
      const experimentTemplateId = templateRaw.trim().slice(0, 120);
      if (!isRegisteredAssistantTemplateId(experimentTemplateId)) {
        return reply.status(400).send({
          success: false,
          error: 'Unknown experimentTemplateId — must be a registered assistant prompt template id',
        });
      }

      let rolloutPercent = 100;
      if (body.rolloutPercent !== undefined) {
        const n = Number(body.rolloutPercent);
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          return reply.status(400).send({
            success: false,
            error: 'rolloutPercent must be a number from 0 to 100',
          });
        }
        rolloutPercent = Math.floor(n);
      }

      const cohortTiers = normalizeExperimentCohortTiersJson(body.cohortTiers);

      let experimentKey: string | null = null;
      if (body.experimentKey !== undefined && body.experimentKey !== null) {
        if (typeof body.experimentKey !== 'string') {
          return reply.status(400).send({ success: false, error: 'experimentKey must be a string or null' });
        }
        const k = body.experimentKey.trim().slice(0, 64);
        experimentKey = k.length ? k : null;
      }

      await prisma.organizationAssistantPromptExperiment.upsert({
        where: { organizationId: tenant.orgId },
        create: {
          organizationId: tenant.orgId,
          enabled,
          experimentTemplateId,
          cohortTiers: cohortTiers?.length ? cohortTiers : Prisma.JsonNull,
          rolloutPercent,
          experimentKey,
        },
        update: {
          enabled,
          experimentTemplateId,
          cohortTiers: cohortTiers?.length ? cohortTiers : Prisma.JsonNull,
          rolloutPercent,
          experimentKey,
        },
      });

      const roles = (request.user.roles || []) as string[];
      fastify.log.info({
        event: 'assistant.org_prompt_experiment.updated',
        orgId: tenant.orgId,
        actorUserId: userId,
        actorRoleSummary: roles.slice(0, 8).join(','),
        enabled,
        experimentTemplateId,
        rolloutPercent,
        experimentKey,
        cohortTierCount: cohortTiers?.length ?? 0,
      });

      const org = await prisma.organization.findUnique({
        where: { id: tenant.orgId },
        select: { id: true, name: true, assistantPromptTemplateId: true },
      });
      return reply.send({
        success: true,
        data: org ? await orgPromptTemplateAdminDataBundle(org) : null,
      });
    }
  );
}
