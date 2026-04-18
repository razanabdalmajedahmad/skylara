/**
 * MANIFEST AGENT ROUTES — AI recommendations (Gap Spec §5.8)
 *
 * AI may recommend and prioritize but CANNOT override:
 * - CG gating, waiver/payment gates, pilot authority, weather approvals
 *
 * Endpoints:
 *   GET  /api/ai/manifest/recommendations — current recommendations
 *   POST /api/ai/manifest/recommendations/:id/action — accept/edit/reject
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import { ManifestAgent } from "../services/manifestAgent";

export async function manifestAgentRoutes(fastify: FastifyInstance) {
  const agent = new ManifestAgent(fastify.prisma);

  // GET /ai/manifest/recommendations — generate current recommendations
  fastify.get(
    "/ai/manifest/recommendations",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
      // config: { cache: { ttlSeconds: 15 } }, // short cache — ops data changes fast
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const dropzoneId = parseInt((request as any).user?.dropzoneId || "0");
        if (!dropzoneId) {
          reply.code(400).send({ success: false, error: "dropzoneId required" });
          return;
        }

        const recommendations = await agent.generateRecommendations(dropzoneId);

        reply.send({
          success: true,
          data: {
            recommendations,
            count: recommendations.length,
            disclaimer: "AI recommendations are advisory only. All safety gates remain enforced.",
          },
        });
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ success: false, error: "Failed to generate recommendations" });
      }
    }
  );

  // POST /ai/manifest/recommendations/:id/action — log action on a recommendation
  fastify.post<{
    Params: { id: string };
    Body: { action: "ACCEPT" | "EDIT" | "REJECT"; notes?: string };
  }>(
    "/ai/manifest/recommendations/:id/action",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const { action, notes } = request.body as { action: string; notes?: string };
        const userId = parseInt((request as any).user?.sub || "0");
        const dropzoneId = parseInt((request as any).user?.dropzoneId || "0");

        if (!["ACCEPT", "EDIT", "REJECT"].includes(action)) {
          reply.code(400).send({ success: false, error: "action must be ACCEPT, EDIT, or REJECT" });
          return;
        }

        await agent.logAction({
          recommendationId: id,
          type: "UNDERFILL_MERGE", // type resolved from ID in production
          action: action as any,
          userId,
          dropzoneId,
          notes,
        });

        reply.send({
          success: true,
          data: { recommendationId: id, action, logged: true },
        });
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ success: false, error: "Failed to log action" });
      }
    }
  );
}
