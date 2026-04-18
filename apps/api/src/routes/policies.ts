import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import { PolicyEngine } from "../services/policyEngine";

// ============================================================================
// POLICY ENGINE ROUTES — Expert Feedback §8.1
// ============================================================================

const setPolicySchema = z.object({
  values: z.array(z.object({
    key: z.string().min(1),
    value: z.any(),
    reason: z.string().optional(),
  })).min(1),
});

const overrideSchema = z.object({
  branchId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  values: z.array(z.object({
    key: z.string().min(1),
    value: z.any(),
    reason: z.string().optional(),
  })).min(1),
  reason: z.string().min(1),
});

function getUserId(request: any): number {
  return parseInt(request.user?.sub ?? request.user?.id ?? "0");
}
function getDzId(request: any): number {
  return parseInt(request.user?.dropzoneId ?? "0");
}
function getOrgId(request: any): number {
  return parseInt(request.user?.organizationId ?? "0");
}

export async function policyRoutes(fastify: FastifyInstance) {
  const engine = new PolicyEngine(fastify.prisma);

  // GET /policies — list all policy definitions (catalog)
  fastify.get<{ Querystring: { category?: string } }>(
    "/policies",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const definitions = await engine.listDefinitions(request.query.category);
        reply.send({ success: true, data: { definitions } });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch policies" });
      }
    }
  );

  // GET /policies/resolved — resolve all policies for caller's context
  fastify.get<{ Querystring: { date?: string } }>(
    "/policies/resolved",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        const context = {
          organizationId: getOrgId(request),
          dropzoneId: getDzId(request),
          date: request.query.date,
        };

        const defs = await engine.listDefinitions();
        const keys = defs.map((d: any) => d.key);
        const resolved = await engine.resolvePolicies(keys, context);

        reply.send({ success: true, data: { policies: resolved } });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to resolve policies" });
      }
    }
  );

  // GET /policies/:scope/:scopeEntityId — list overrides at a specific scope
  fastify.get<{ Params: { scope: string; scopeEntityId: string } }>(
    "/policies/:scope/:scopeEntityId",
    { preHandler: [authenticate, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      try {
        const { scope, scopeEntityId } = request.params;
        const values = await engine.listValuesAtScope(scope, parseInt(scopeEntityId));
        reply.send({ success: true, data: { values } });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch scope values" });
      }
    }
  );

  // PATCH /policies/:scope/:scopeEntityId — set policy values at a scope
  fastify.patch<{ Params: { scope: string; scopeEntityId: string }; Body: z.infer<typeof setPolicySchema> }>(
    "/policies/:scope/:scopeEntityId",
    { preHandler: [authenticate, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      try {
        const userId = getUserId(request);
        const { scope, scopeEntityId } = request.params;
        const body = setPolicySchema.parse(request.body);
        const entityId = parseInt(scopeEntityId);

        const results: any[] = [];
        for (const item of body.values) {
          const result = await engine.setPolicyValue({
            key: item.key,
            scope,
            organizationId: scope === "ORGANIZATION" ? entityId : undefined,
            dropzoneId: scope === "DROPZONE" ? entityId : undefined,
            branchId: scope === "BRANCH" ? entityId : undefined,
            value: item.value,
            userId,
            reason: item.reason,
          });
          results.push(result);
        }

        reply.send({ success: true, data: { updated: results } });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to set policy values" });
      }
    }
  );

  // POST /policies/overrides — create an operational-day override
  fastify.post<{ Body: z.infer<typeof overrideSchema> }>(
    "/policies/overrides",
    { preHandler: [authenticate, authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      try {
        const userId = getUserId(request);
        const body = overrideSchema.parse(request.body);

        const results: any[] = [];
        for (const item of body.values) {
          const result = await engine.setPolicyValue({
            key: item.key,
            scope: "OPERATIONAL_DAY",
            branchId: body.branchId,
            operationalDate: body.date,
            value: item.value,
            userId,
            reason: body.reason,
          });
          results.push(result);
        }

        reply.send({ success: true, data: { overrides: results } });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to create overrides" });
      }
    }
  );

  // GET /policies/history/:definitionId — policy change history
  fastify.get<{ Params: { definitionId: string }; Querystring: { limit?: string } }>(
    "/policies/history/:definitionId",
    { preHandler: [authenticate, authorize(["DZ_OWNER", "DZ_MANAGER", "PLATFORM_ADMIN"])] },
    async (request, reply) => {
      try {
        const definitionId = parseInt(request.params.definitionId);
        const limit = parseInt(request.query.limit ?? "50");
        const history = await engine.getHistory(definitionId, limit);
        reply.send({ success: true, data: { history } });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch policy history" });
      }
    }
  );
}
