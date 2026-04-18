/**
 * DATA MANAGEMENT ROUTES — Demo Environment, Import/Export, Reset
 *
 * All endpoints are PLATFORM_ADMIN or DZ_OWNER only.
 * Destructive operations require explicit confirmation.
 *
 * Routes:
 *   GET  /data-management/scenarios              — list available scenarios
 *   GET  /data-management/scenarios/:key/preview  — dry-run preview
 *   POST /data-management/scenarios/:key/load     — load scenario
 *   POST /data-management/scenarios/clear         — clear demo data by batchId
 *
 *   POST /data-management/export                  — export tenant data
 *   GET  /data-management/export/:id/download     — download export
 *
 *   POST /data-management/reset/preview           — dry-run reset preview
 *   POST /data-management/reset/confirm           — execute reset
 *
 *   GET  /data-management/operations              — operation history
 *   POST /data-management/operations/:id/rollback — rollback operation
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { DemoDataService } from "../services/demoDataService";
import { z } from "zod";

export async function dataManagementRoutes(fastify: FastifyInstance) {
  const demoService = new DemoDataService(fastify.prisma);

  // All routes require authentication + admin role
  fastify.addHook("preHandler", authenticate);

  // ============================================================================
  // SCENARIOS
  // ============================================================================

  /** List all available demo scenarios */
  fastify.get(
    "/data-management/scenarios",
    { preHandler: [authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const scenarios = demoService.listScenarios();
      return reply.send({ scenarios });
    }
  );

  /** Preview what a scenario will create (dry-run) */
  fastify.get<{ Params: { key: string } }>(
    "/data-management/scenarios/:key/preview",
    { preHandler: [authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"])] },
    async (request, reply) => {
      try {
        const preview = await demoService.previewScenario(request.params.key);
        return reply.send(preview);
      } catch (e: any) {
        return reply.status(404).send({ error: e.message });
      }
    }
  );

  /** Load a demo scenario */
  fastify.post<{ Params: { key: string } }>(
    "/data-management/scenarios/:key/load",
    { preHandler: [authorize(["PLATFORM_ADMIN", "DZ_OWNER"])] },
    async (request, reply) => {
      const user = (request as any).user;
      try {
        const result = await demoService.loadScenario(
          request.params.key,
          user.userId,
          user.dropzoneId,
          user.organizationId
        );
        return reply.send(result);
      } catch (e: any) {
        fastify.log.error({ err: e }, "Scenario load failed");
        return reply.status(500).send({ error: "Scenario load failed", detail: e.message });
      }
    }
  );

  /** Clear demo data by batchId */
  fastify.post(
    "/data-management/scenarios/clear",
    { preHandler: [authorize(["PLATFORM_ADMIN", "DZ_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const schema = z.object({ batchId: z.string().uuid() });
      const body = schema.parse(request.body);
      const user = (request as any).user;

      try {
        const result = await demoService.clearDemoData(
          body.batchId,
          user.userId,
          user.dropzoneId
        );
        return reply.send(result);
      } catch (e: any) {
        fastify.log.error({ err: e }, "Demo clear failed");
        return reply.status(500).send({ error: "Demo clear failed", detail: e.message });
      }
    }
  );

  // ============================================================================
  // EXPORT
  // ============================================================================

  /** Export tenant data */
  fastify.post(
    "/data-management/export",
    { preHandler: [authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const schema = z.object({
        dropzoneId: z.number(),
        modules: z.array(z.string()).optional(),
        format: z.enum(["JSON", "CSV"]).default("JSON"),
      });
      const body = schema.parse(request.body);
      const user = (request as any).user;

      const result = await demoService.exportTenantData(
        user.userId,
        body.dropzoneId,
        body.modules,
        body.format
      );

      const recordCount = Object.values(result.data).reduce((s, a) => s + a.length, 0);

      if (body.format === "CSV") {
        const csvData = demoService.convertToCSV(result.data);
        return reply.send({
          operationId: result.operationId,
          recordCount,
          modules: Object.keys(csvData),
          format: "CSV",
          data: csvData,
        });
      }

      return reply.send({
        operationId: result.operationId,
        recordCount,
        modules: Object.keys(result.data),
        format: "JSON",
        data: result.data,
      });
    }
  );

  /** Download a previous export */
  fastify.get<{ Params: { id: string } }>(
    "/data-management/export/:id/download",
    { preHandler: [authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"])] },
    async (request, reply) => {
      const operation = await fastify.prisma.dataOperation.findFirst({
        where: { id: parseInt(request.params.id), operationType: "EXPORT" },
      });

      if (!operation) return reply.status(404).send({ error: "Export not found" });

      // For now, re-run the export (future: return cached file)
      return reply.send({ message: "Use POST /data-management/export to generate fresh export" });
    }
  );

  // ============================================================================
  // IMPORT
  // ============================================================================

  /** Import data with conflict resolution */
  fastify.post(
    "/data-management/import/commit",
    { preHandler: [authorize(["PLATFORM_ADMIN", "DZ_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const schema = z.object({
        data: z.record(z.array(z.any())),
        conflictStrategy: z.enum(["SKIP", "REPLACE", "MERGE"]).default("SKIP"),
        format: z.enum(["JSON", "CSV"]).default("JSON"),
      });
      const body = schema.parse(request.body);
      const user = (request as any).user;

      try {
        const result = await demoService.importData(
          user.userId,
          user.dropzoneId || 1,
          body.data,
          body.conflictStrategy
        );
        return reply.send(result);
      } catch (e: any) {
        fastify.log.error({ err: e }, "Import failed");
        return reply.status(500).send({ error: "Import failed", detail: e.message });
      }
    }
  );

  /** Parse CSV and return structured preview data */
  fastify.post(
    "/data-management/import/parse-csv",
    { preHandler: [authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const schema = z.object({
        csvText: z.string().min(1),
        moduleHint: z.string().optional(),
      });
      const body = schema.parse(request.body);

      const parsed = demoService.parseCSV(body.csvText, body.moduleHint);
      return reply.send(parsed);
    }
  );

  /** Validate import data before committing (dry-run) */
  fastify.post(
    "/data-management/import/validate",
    { preHandler: [authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const schema = z.object({
        data: z.record(z.array(z.any())),
        dropzoneId: z.number().optional(),
      });
      const body = schema.parse(request.body);
      const user = (request as any).user;
      const dropzoneId = body.dropzoneId || user.dropzoneId || 1;

      const validation = await demoService.validateImport(dropzoneId, body.data);
      return reply.send(validation);
    }
  );

  /** Bulk load multiple scenarios at once */
  fastify.post(
    "/data-management/scenarios/bulk-load",
    { preHandler: [authorize(["PLATFORM_ADMIN", "DZ_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const schema = z.object({
        scenarioKeys: z.array(z.string()).min(1).max(7),
      });
      const body = schema.parse(request.body);
      const user = (request as any).user;

      try {
        const result = await demoService.loadMultipleScenarios(
          body.scenarioKeys,
          user.userId,
          user.dropzoneId,
          user.organizationId
        );
        return reply.send(result);
      } catch (e: any) {
        fastify.log.error({ err: e }, "Bulk scenario load failed");
        return reply.status(500).send({ error: "Bulk load failed", detail: e.message });
      }
    }
  );

  // ============================================================================
  // RESET
  // ============================================================================

  /** Preview what a reset will delete (dry-run) */
  fastify.post(
    "/data-management/reset/preview",
    { preHandler: [authorize(["PLATFORM_ADMIN", "DZ_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const schema = z.object({
        dropzoneId: z.number(),
        preserveMode: z.enum(["SETTINGS_ONLY", "USERS_AND_SETTINGS", "FULL_DESTRUCTIVE"]),
      });
      const body = schema.parse(request.body);

      const preview = await demoService.previewReset(body.dropzoneId, body.preserveMode);
      return reply.send(preview);
    }
  );

  /** Execute tenant reset — requires exact dropzone name confirmation */
  fastify.post(
    "/data-management/reset/confirm",
    { preHandler: [authorize(["PLATFORM_ADMIN", "DZ_OWNER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const schema = z.object({
        dropzoneId: z.number(),
        confirmDropzoneName: z.string().min(1),
        preserveMode: z.enum(["SETTINGS_ONLY", "USERS_AND_SETTINGS", "FULL_DESTRUCTIVE"]),
      });
      const body = schema.parse(request.body);
      const user = (request as any).user;

      try {
        const result = await demoService.resetTenant(
          body.dropzoneId,
          user.userId,
          body.confirmDropzoneName,
          body.preserveMode
        );
        return reply.send(result);
      } catch (e: any) {
        if (e.message.includes("confirmation does not match")) {
          return reply.status(400).send({ error: e.message });
        }
        fastify.log.error({ err: e }, "Tenant reset failed");
        return reply.status(500).send({ error: "Reset failed", detail: e.message });
      }
    }
  );

  // ============================================================================
  // OPERATION HISTORY
  // ============================================================================

  /** Get paginated operation history */
  fastify.get(
    "/data-management/operations",
    { preHandler: [authorize(["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER"])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as any;
      const result = await demoService.getOperations({
        dropzoneId: query.dropzoneId ? parseInt(query.dropzoneId) : undefined,
        operationType: query.operationType,
        limit: query.limit ? parseInt(query.limit) : 50,
        offset: query.offset ? parseInt(query.offset) : 0,
      });
      return reply.send(result);
    }
  );

  /** Rollback an operation (if it has a batchId) */
  fastify.post<{ Params: { id: string } }>(
    "/data-management/operations/:id/rollback",
    { preHandler: [authorize(["PLATFORM_ADMIN", "DZ_OWNER"])] },
    async (request, reply) => {
      const operation = await fastify.prisma.dataOperation.findFirst({
        where: { id: parseInt(request.params.id) },
      });

      if (!operation) return reply.status(404).send({ error: "Operation not found" });
      if (!operation.batchId) return reply.status(400).send({ error: "Operation has no batch ID — cannot rollback" });
      if (operation.status === "ROLLED_BACK") return reply.status(400).send({ error: "Already rolled back" });

      const user = (request as any).user;
      const result = await demoService.clearDemoData(operation.batchId, user.userId, operation.dropzoneId || undefined);

      // Mark original operation as rolled back
      await fastify.prisma.dataOperation.update({
        where: { id: operation.id },
        data: { status: "ROLLED_BACK", rolledBackAt: new Date() },
      });

      return reply.send({ ...result, rolledBackOperationId: operation.id });
    }
  );
}
