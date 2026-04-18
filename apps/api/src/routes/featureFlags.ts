import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";

// ============================================================================
// FEATURE FLAGS — DZ-scoped rollout control (Expert Feedback §10.3)
// ============================================================================

function getDzId(request: any): number {
  return parseInt(request.user?.dropzoneId ?? "0");
}
function getUserId(request: any): number {
  return parseInt(request.user?.sub ?? request.user?.id ?? "0");
}

export async function featureFlagRoutes(fastify: FastifyInstance) {
  const prisma = fastify.prisma as any;

  // GET /feature-flags — list all flags for current DZ
  fastify.get(
    "/feature-flags",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);
        const flags = await prisma.featureFlag.findMany({
          where: { OR: [{ dropzoneId }, { dropzoneId: null }] },
          orderBy: { key: "asc" },
        });
        reply.send({ success: true, data: { flags } });
      } catch {
        reply.code(500).send({ success: false, error: "Failed to fetch feature flags" });
      }
    }
  );

  // GET /feature-flags/check/:key — check if a specific flag is enabled
  fastify.get<{ Params: { key: string } }>(
    "/feature-flags/check/:key",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);
        const { key } = request.params;

        // Check DZ-specific first, then platform-wide
        const flag = await prisma.featureFlag.findFirst({
          where: { key, OR: [{ dropzoneId }, { dropzoneId: null }] },
          orderBy: { dropzoneId: "desc" }, // DZ-specific takes precedence
        });

        const enabled = flag?.isEnabled ?? false;
        const rollout = flag?.rolloutPercent ?? 100;

        reply.send({ success: true, data: { key, enabled, rolloutPercent: rollout } });
      } catch {
        reply.code(500).send({ success: false, error: "Failed to check feature flag" });
      }
    }
  );

  // PUT /feature-flags/:key — create or update a flag
  fastify.put<{
    Params: { key: string };
    Body: { label?: string; description?: string; isEnabled: boolean; rolloutPercent?: number; branchId?: number };
  }>(
    "/feature-flags/:key",
    { preHandler: [authenticate, tenantScope, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);
        const userId = getUserId(request);
        const { key } = request.params;
        const { label, description, isEnabled, rolloutPercent, branchId } = request.body;

        const flag = await prisma.featureFlag.upsert({
          where: { key_dropzoneId_branchId: { key, dropzoneId, branchId: branchId ?? null } },
          create: {
            key,
            label: label ?? key,
            description: description ?? null,
            dropzoneId,
            branchId: branchId ?? null,
            isEnabled,
            enabledById: isEnabled ? userId : null,
            enabledAt: isEnabled ? new Date() : null,
            rolloutPercent: rolloutPercent ?? 100,
          },
          update: {
            isEnabled,
            enabledById: isEnabled ? userId : null,
            enabledAt: isEnabled ? new Date() : null,
            rolloutPercent: rolloutPercent ?? 100,
            label: label ?? undefined,
            description: description ?? undefined,
          },
        });

        // Audit log
        await fastify.prisma.auditLog.create({
          data: {
            userId,
            dropzoneId,
            action: "UPDATE" as any,
            entityType: "FeatureFlag",
            entityId: flag.id,
            afterState: { key, isEnabled, rolloutPercent },
            checksum: "pending",
          },
        });

        reply.send({ success: true, data: flag });
      } catch {
        reply.code(500).send({ success: false, error: "Failed to update feature flag" });
      }
    }
  );
}
