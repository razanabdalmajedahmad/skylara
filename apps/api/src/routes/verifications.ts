import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import { VerificationService } from "../services/verificationService";

// ============================================================================
// VERIFICATION ROUTES — Expert Feedback §8.2
// ============================================================================

const verifySchema = z.object({
  entityType: z.string().min(1).max(50),
  entityId: z.number().int().positive(),
  status: z.enum([
    "SELF_DECLARED", "DZ_VERIFIED", "STAFF_VERIFIED", "RIGGER_VERIFIED",
    "INSTRUCTOR_VERIFIED", "PILOT_CONFIRMED", "AUTHORITY_VERIFIED", "REVIEW_REQUIRED",
  ]),
  source: z.string().max(100).optional(),
  evidenceNote: z.string().optional(),
  evidenceUrl: z.string().url().optional(),
  expiresAt: z.string().datetime().optional(),
  reviewIntervalDays: z.number().int().positive().optional(),
  reason: z.string().optional(),
});

function getUserId(request: any): number {
  return parseInt(request.user?.sub ?? request.user?.id ?? "0");
}
function getDzId(request: any): number {
  return parseInt(request.user?.dropzoneId ?? "0");
}
function getUserRoles(request: any): string[] {
  return request.user?.roles ?? [];
}

export async function verificationRoutes(fastify: FastifyInstance) {
  const service = new VerificationService(fastify.prisma);

  // POST /verifications — create or update a verification
  fastify.post<{ Body: z.infer<typeof verifySchema> }>(
    "/verifications",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        const userId = getUserId(request);
        const dropzoneId = getDzId(request);
        const roles = getUserRoles(request);
        const body = verifySchema.parse(request.body);

        // Role gate: verify user has permission for this verification state
        if (!VerificationService.canSetState(body.status, roles)) {
          reply.code(403).send({
            success: false,
            error: `Role ${roles.join(", ")} cannot set verification state ${body.status}`,
          });
          return;
        }

        const verification = await service.verify({
          entityType: body.entityType,
          entityId: body.entityId,
          dropzoneId,
          status: body.status,
          verifiedById: userId,
          source: body.source,
          evidenceNote: body.evidenceNote,
          evidenceUrl: body.evidenceUrl,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
          reviewIntervalDays: body.reviewIntervalDays,
          reason: body.reason,
        });

        reply.code(201).send({ success: true, data: verification });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to create verification" });
      }
    }
  );

  // GET /verifications/:entityType/:entityId — current verification for entity
  fastify.get<{ Params: { entityType: string; entityId: string } }>(
    "/verifications/:entityType/:entityId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { entityType, entityId } = request.params;
        const verification = await service.getVerification(entityType, parseInt(entityId));
        reply.send({ success: true, data: verification });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch verification" });
      }
    }
  );

  // GET /verifications — list verifications for DZ
  fastify.get<{ Querystring: { entityType?: string; status?: string; expiringSoon?: string } }>(
    "/verifications",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);
        const verifications = await service.listVerifications(dropzoneId, {
          entityType: request.query.entityType,
          status: request.query.status,
          expiringSoon: request.query.expiringSoon === "true",
        });
        reply.send({ success: true, data: { verifications } });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to list verifications" });
      }
    }
  );

  // GET /verifications/review-queue — REVIEW_REQUIRED + VER_EXPIRED
  fastify.get(
    "/verifications/review-queue",
    { preHandler: [authenticate, tenantScope, authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      try {
        const dropzoneId = getDzId(request);
        const queue = await service.getReviewQueue(dropzoneId);
        reply.send({ success: true, data: { queue } });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch review queue" });
      }
    }
  );

  // GET /verifications/:entityType/:entityId/history — full history
  fastify.get<{ Params: { entityType: string; entityId: string } }>(
    "/verifications/:entityType/:entityId/history",
    { preHandler: [authenticate, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      try {
        const { entityType, entityId } = request.params;
        const history = await service.getEntityHistory(entityType, parseInt(entityId));
        reply.send({ success: true, data: { history } });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch verification history" });
      }
    }
  );
}
