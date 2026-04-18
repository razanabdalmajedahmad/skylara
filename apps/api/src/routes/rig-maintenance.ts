import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import { NotFoundError, ConflictError, ValidationError } from "../utils/errors";
import { AuditService } from "../services/auditService";
import {
  evaluateRigStatus,
  checkManifestGate,
  DEFAULT_RULE_TEMPLATES,
  toPrismaMaintenanceStatus,
} from "../services/rigMaintenanceEngine";
import {
  publishGroundingClearedNotification,
  publishMaintenanceCompletedNotification,
} from "../services/rigNotificationService";

// ============================================================================
// RIG MAINTENANCE ROUTES
// Per SkyLara_Rig_Maintenance_Complete_Master_File.md — Section 8
// ============================================================================
//
// Permissions matrix (spec Section 5):
//   PLATFORM_ADMIN, DZ_OWNER, DZ_MANAGER — full CRUD on rigs and rules
//   RIGGER — create/update maintenance events, ground/clear, manage rules
//   MANIFEST_STAFF — read rigs, read status (for manifest gate check)
//   ATHLETE (owner) — read own rigs, read status
//
// SCHEMA FIELD MAP (API → Prisma):
//   name → rigName
//   ownerId → ownerUserId
//   dom → manufactureDate (container) / installDate (canopy, reserve, aad)
//   jumpsSinceNew → totalJumps (mainCanopy)
//   performedById → performedByUserId
//   ruleType (event) → maintenanceType
//   performedAt → eventDate
//   createdById → createdByUserId
//   groundedById → groundedByUserId
//   clearedById → clearedByUserId
// ============================================================================

// ── ZOD SCHEMAS ─────────────────────────────────────────────────────────────

const createRigSchema = z.object({
  name: z.string().min(1).max(100),
  rigType: z.enum(["SPORT", "TANDEM", "STUDENT", "RENTAL", "OTHER"]),
  serialNumber: z.string().min(1).max(60),
  ownerId: z.number().int().positive().optional().nullable(),
  isSharedRig: z.boolean().optional().default(false),
  defaultManifestSelectable: z.boolean().optional().default(true),
  notes: z.string().max(2000).optional(),
  container: z
    .object({
      manufacturer: z.string().min(1).max(100),
      model: z.string().min(1).max(100),
      serialNumber: z.string().min(1).max(60),
      dom: z.string().datetime().optional(),
      size: z.string().max(20).optional(),
    })
    .optional(),
  mainCanopy: z
    .object({
      manufacturer: z.string().min(1).max(100),
      model: z.string().min(1).max(100),
      serialNumber: z.string().min(1).max(60),
      dom: z.string().datetime().optional(),
      size: z.string().max(50).optional(),
      jumpsSinceNew: z.number().int().min(0).optional().default(0),
      jumpsSinceInspection: z.number().int().min(0).optional().default(0),
      jumpsSinceReline: z.number().int().min(0).optional().default(0),
    })
    .optional(),
  reserve: z
    .object({
      manufacturer: z.string().min(1).max(100),
      model: z.string().min(1).max(100),
      serialNumber: z.string().min(1).max(60),
      dom: z.string().datetime().optional(),
      size: z.string().max(50).optional(),
      repackDate: z.string().datetime().optional(),
      repackDueDate: z.string().datetime().optional(),
      rides: z.number().int().min(0).optional().default(0),
    })
    .optional(),
  aad: z
    .object({
      manufacturer: z.string().min(1).max(100),
      model: z.string().min(1).max(100),
      serialNumber: z.string().min(1).max(60),
      dom: z.string().datetime().optional(),
      lastServiceDate: z.string().datetime().optional(),
      nextServiceDueDate: z.string().datetime().optional(),
      batteryDueDate: z.string().datetime().optional(),
      endOfLifeDate: z.string().datetime().optional(),
    })
    .optional(),
});

const updateRigSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  rigType: z.enum(["SPORT", "TANDEM", "STUDENT", "RENTAL", "OTHER"]).optional(),
  activeStatus: z.enum(["ACTIVE", "INACTIVE", "RETIRED"]).optional(),
  ownerId: z.number().int().positive().optional().nullable(),
  isSharedRig: z.boolean().optional(),
  defaultManifestSelectable: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

const updateComponentSchema = z.object({
  manufacturer: z.string().min(1).max(100).optional(),
  model: z.string().min(1).max(100).optional(),
  serialNumber: z.string().min(1).max(60).optional(),
  dom: z.string().datetime().optional(),
  size: z.union([z.string().max(50), z.number().int().positive()]).optional(),
  // Main canopy specific
  jumpsSinceNew: z.number().int().min(0).optional(),
  jumpsSinceInspection: z.number().int().min(0).optional(),
  jumpsSinceReline: z.number().int().min(0).optional(),
  lastInspectionDate: z.string().datetime().optional(),
  lastRelineDate: z.string().datetime().optional(),
  // Reserve specific
  repackDate: z.string().datetime().optional(),
  repackDueDate: z.string().datetime().optional(),
  rides: z.number().int().min(0).optional(),
  // AAD specific
  lastServiceDate: z.string().datetime().optional(),
  nextServiceDueDate: z.string().datetime().optional(),
  batteryDueDate: z.string().datetime().optional(),
  endOfLifeDate: z.string().datetime().optional(),
});

const createMaintenanceRuleSchema = z.object({
  componentType: z.enum([
    "RIG", "CONTAINER", "MAIN", "LINESET", "RESERVE", "AAD",
    "BRAKE_LINES", "RISERS", "CUSTOM",
  ]),
  ruleType: z.enum([
    "INSPECTION", "REPLACEMENT_REMINDER", "SERVICE", "COMPLIANCE", "GROUNDING_POLICY",
  ]),
  label: z.string().min(1).max(200),
  triggerByJumps: z.number().int().positive().optional().nullable(),
  triggerByDays: z.number().int().positive().optional().nullable(),
  dueSoonPercent: z.number().min(1).max(100).optional().default(80),
  overduePercent: z.number().min(100).max(300).optional().nullable(),
  hardStop: z.boolean().optional().default(false),
  sourceType: z.enum(["DZ_DEFAULT", "MANUFACTURER", "RIGGER", "OWNER", "ADMIN"]).optional().default("DZ_DEFAULT"),
  notes: z.string().max(2000).optional(),
});

const updateMaintenanceRuleSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  triggerByJumps: z.number().int().positive().optional().nullable(),
  triggerByDays: z.number().int().positive().optional().nullable(),
  dueSoonPercent: z.number().min(1).max(100).optional(),
  overduePercent: z.number().min(100).max(300).optional().nullable(),
  hardStop: z.boolean().optional(),
  enabled: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

const createMaintenanceEventSchema = z.object({
  componentType: z.enum([
    "RIG", "CONTAINER", "MAIN", "LINESET", "RESERVE", "AAD",
    "BRAKE_LINES", "RISERS", "CUSTOM",
  ]),
  maintenanceType: z.enum([
    "INSPECTION", "REPLACEMENT_REMINDER", "SERVICE", "COMPLIANCE", "GROUNDING_POLICY",
  ]),
  result: z.enum([
    "PASSED", "MONITOR", "SERVICE_REQUIRED", "DUE_SOON",
    "DUE_NOW", "OVERDUE", "GROUNDED", "COMPLETED",
  ]),
  performedById: z.number().int().positive().optional(),
  notes: z.string().max(5000).optional(),
  resetCounters: z.boolean().optional().default(false),
});

const groundRigSchema = z.object({
  componentType: z.enum([
    "RIG", "CONTAINER", "MAIN", "LINESET", "RESERVE", "AAD",
    "BRAKE_LINES", "RISERS", "CUSTOM",
  ]),
  reason: z.string().min(1).max(2000),
  policySource: z.string().max(500).optional(),
});

const clearGroundingSchema = z.object({
  groundingId: z.number().int().positive(),
  clearanceNotes: z.string().min(1).max(2000),
});

// ── ROUTE PLUGIN ────────────────────────────────────────────────────────────

export async function rigMaintenanceRoutes(fastify: FastifyInstance) {
  const auditService = new AuditService(fastify.prisma);

  // ── Helper: verify rig belongs to DZ and load it ─────────────────────────

  async function loadRig(rigId: number, dropzoneId: number) {
    const rig = await fastify.prisma.rig.findFirst({
      where: { id: rigId, dropzoneId },
      include: {
        container: true,
        mainCanopy: true,
        reserve: true,
        aad: true,
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!rig) throw new NotFoundError("Rig");
    return rig;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 1. LIST RIGS — GET /rigs
  // ════════════════════════════════════════════════════════════════════════════

  fastify.get<{
    Querystring: {
      rigType?: string;
      activeStatus?: string;
      ownerId?: string;
      limit?: string;
      offset?: string;
    };
  }>(
    "/rigs",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const { rigType, activeStatus, ownerId, limit: rawLimit, offset: rawOffset } = request.query;
      const limit = Math.min(parseInt(rawLimit || "50"), 100);
      const offset = parseInt(rawOffset || "0");

      const where: any = { dropzoneId };
      if (rigType) where.rigType = rigType;
      if (activeStatus) where.activeStatus = activeStatus;
      if (ownerId) where.ownerUserId = parseInt(ownerId);

      const [rigs, total] = await Promise.all([
        fastify.prisma.rig.findMany({
          where,
          include: {
            container: { select: { manufacturer: true, model: true } },
            mainCanopy: { select: { manufacturer: true, model: true, size: true } },
            reserve: { select: { manufacturer: true, model: true, repackDueDate: true } },
            aad: { select: { manufacturer: true, model: true, nextServiceDueDate: true } },
            owner: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { rigName: "asc" },
          take: limit,
          skip: offset,
        }),
        fastify.prisma.rig.count({ where }),
      ]);

      reply.send({
        success: true,
        data: rigs,
        meta: { total, limit, offset },
      });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 2. CREATE RIG — POST /rigs
  // ════════════════════════════════════════════════════════════════════════════

  fastify.post(
    "/rigs",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["RIGGER", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const userId = parseInt(String(request.user!.sub));
      const body = createRigSchema.parse(request.body);

      // Unique serial per DZ
      const existing = await fastify.prisma.rig.findFirst({
        where: { dropzoneId, serialNumber: body.serialNumber },
      });
      if (existing) throw new ConflictError("Rig serial number already exists at this DZ");

      const rig = await fastify.prisma.rig.create({
        data: {
          dropzoneId,
          rigName: body.name,
          serialNumber: body.serialNumber,
          rigType: body.rigType as any,
          ownerUserId: body.ownerId ?? userId, // default to creator if no owner specified
          isSharedRig: body.isSharedRig,
          defaultManifestSelectable: body.defaultManifestSelectable,
          notes: body.notes,
          activeStatus: "ACTIVE" as any,
          maintenanceStatus: "OK" as any,
          totalJumps: 0,
          ...(body.container
            ? {
                container: {
                  create: {
                    manufacturer: body.container.manufacturer,
                    model: body.container.model,
                    serialNumber: body.container.serialNumber,
                    manufactureDate: body.container.dom ? new Date(body.container.dom) : null,
                    size: body.container.size,
                  },
                },
              }
            : {}),
          ...(body.mainCanopy
            ? {
                mainCanopy: {
                  create: {
                    manufacturer: body.mainCanopy.manufacturer,
                    model: body.mainCanopy.model,
                    serialNumber: body.mainCanopy.serialNumber,
                    installDate: body.mainCanopy.dom ? new Date(body.mainCanopy.dom) : null,
                    size: body.mainCanopy.size,
                    totalJumps: body.mainCanopy.jumpsSinceNew ?? 0,
                    jumpsSinceInspection: body.mainCanopy.jumpsSinceInspection ?? 0,
                    jumpsSinceReline: body.mainCanopy.jumpsSinceReline ?? 0,
                  },
                },
              }
            : {}),
          ...(body.reserve
            ? {
                reserve: {
                  create: {
                    manufacturer: body.reserve.manufacturer,
                    model: body.reserve.model,
                    serialNumber: body.reserve.serialNumber,
                    installDate: body.reserve.dom ? new Date(body.reserve.dom) : null,
                    size: body.reserve.size,
                    repackDate: body.reserve.repackDate ? new Date(body.reserve.repackDate) : null,
                    repackDueDate: body.reserve.repackDueDate ? new Date(body.reserve.repackDueDate) : null,
                    rides: body.reserve.rides ?? 0,
                  },
                },
              }
            : {}),
          ...(body.aad
            ? {
                aad: {
                  create: {
                    manufacturer: body.aad.manufacturer,
                    model: body.aad.model,
                    serialNumber: body.aad.serialNumber,
                    installDate: body.aad.dom ? new Date(body.aad.dom) : null,
                    lastServiceDate: body.aad.lastServiceDate ? new Date(body.aad.lastServiceDate) : null,
                    nextServiceDueDate: body.aad.nextServiceDueDate ? new Date(body.aad.nextServiceDueDate) : null,
                    batteryDueDate: body.aad.batteryDueDate ? new Date(body.aad.batteryDueDate) : null,
                    endOfLifeDate: body.aad.endOfLifeDate ? new Date(body.aad.endOfLifeDate) : null,
                  },
                },
              }
            : {}),
        },
        include: {
          container: true,
          mainCanopy: true,
          reserve: true,
          aad: true,
        },
      });

      await auditService.log({
        userId,
        dropzoneId,
        action: "RIG_CREATE" as any,
        entityType: "Rig",
        entityId: rig.id,
        afterState: {
          serialNumber: body.serialNumber,
          rigType: body.rigType,
          name: body.name,
        },
      });

      reply.code(201).send({ success: true, data: rig });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 3. GET RIG DETAIL — GET /rigs/:rigId
  // ════════════════════════════════════════════════════════════════════════════

  fastify.get<{ Params: { rigId: string } }>(
    "/rigs/:rigId",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const rigId = parseInt(request.params.rigId);
      const rig = await loadRig(rigId, dropzoneId);

      reply.send({ success: true, data: rig });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 4. UPDATE RIG — PATCH /rigs/:rigId
  // ════════════════════════════════════════════════════════════════════════════

  fastify.patch<{ Params: { rigId: string } }>(
    "/rigs/:rigId",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["RIGGER", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const userId = parseInt(String(request.user!.sub));
      const rigId = parseInt(request.params.rigId);
      const body = updateRigSchema.parse(request.body);

      const existing = await loadRig(rigId, dropzoneId);

      const updated = await fastify.prisma.rig.update({
        where: { id: rigId },
        data: {
          rigName: body.name ?? existing.rigName,
          rigType: (body.rigType as any) ?? existing.rigType,
          activeStatus: (body.activeStatus as any) ?? existing.activeStatus,
          ownerUserId: body.ownerId !== undefined ? (body.ownerId ?? existing.ownerUserId) : existing.ownerUserId,
          isSharedRig: body.isSharedRig ?? existing.isSharedRig,
          defaultManifestSelectable: body.defaultManifestSelectable ?? existing.defaultManifestSelectable,
          notes: body.notes ?? existing.notes,
        },
        include: { container: true, mainCanopy: true, reserve: true, aad: true },
      });

      await auditService.log({
        userId,
        dropzoneId,
        action: "RIG_UPDATE" as any,
        entityType: "Rig",
        entityId: rigId,
        beforeState: { rigName: existing.rigName, activeStatus: existing.activeStatus },
        afterState: body,
      });

      reply.send({ success: true, data: updated });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 5. GET RIG STATUS — GET /rigs/:rigId/status
  // ════════════════════════════════════════════════════════════════════════════

  fastify.get<{ Params: { rigId: string } }>(
    "/rigs/:rigId/status",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const rigId = parseInt(request.params.rigId);

      // Verify rig belongs to DZ
      await loadRig(rigId, dropzoneId);

      const status = await evaluateRigStatus(fastify.prisma, rigId);
      const gate = checkManifestGate(status);

      reply.send({
        success: true,
        data: {
          ...status,
          manifestGate: gate,
        },
      });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 6. UPDATE COMPONENT — PATCH /rigs/:rigId/components/:componentType
  // ════════════════════════════════════════════════════════════════════════════

  fastify.patch<{ Params: { rigId: string; componentType: string } }>(
    "/rigs/:rigId/components/:componentType",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["RIGGER", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const userId = parseInt(String(request.user!.sub));
      const rigId = parseInt(request.params.rigId);
      const componentType = request.params.componentType.toUpperCase();
      const body = updateComponentSchema.parse(request.body);

      const rig = await loadRig(rigId, dropzoneId);

      let updated: any;

      switch (componentType) {
        case "CONTAINER":
          if (!rig.container) throw new NotFoundError("Container component");
          updated = await fastify.prisma.rigContainer.update({
            where: { id: rig.container.id },
            data: {
              manufacturer: body.manufacturer ?? rig.container.manufacturer,
              model: body.model ?? rig.container.model,
              serialNumber: body.serialNumber ?? rig.container.serialNumber,
              manufactureDate: body.dom ? new Date(body.dom) : rig.container.manufactureDate,
              size: (body.size as string) ?? rig.container.size,
            },
          });
          break;

        case "MAIN":
          if (!rig.mainCanopy) throw new NotFoundError("Main canopy component");
          updated = await fastify.prisma.rigMainCanopy.update({
            where: { id: rig.mainCanopy.id },
            data: {
              manufacturer: body.manufacturer ?? rig.mainCanopy.manufacturer,
              model: body.model ?? rig.mainCanopy.model,
              serialNumber: body.serialNumber ?? rig.mainCanopy.serialNumber,
              installDate: body.dom ? new Date(body.dom) : rig.mainCanopy.installDate,
              size: (body.size as string) ?? rig.mainCanopy.size,
              totalJumps: body.jumpsSinceNew ?? rig.mainCanopy.totalJumps,
              jumpsSinceInspection: body.jumpsSinceInspection ?? rig.mainCanopy.jumpsSinceInspection,
              jumpsSinceReline: body.jumpsSinceReline ?? rig.mainCanopy.jumpsSinceReline,
              lastInspectionDate: body.lastInspectionDate ? new Date(body.lastInspectionDate) : rig.mainCanopy.lastInspectionDate,
              lastRelineDate: body.lastRelineDate ? new Date(body.lastRelineDate) : rig.mainCanopy.lastRelineDate,
            },
          });
          break;

        case "RESERVE":
          if (!rig.reserve) throw new NotFoundError("Reserve component");
          updated = await fastify.prisma.rigReserve.update({
            where: { id: rig.reserve.id },
            data: {
              manufacturer: body.manufacturer ?? rig.reserve.manufacturer,
              model: body.model ?? rig.reserve.model,
              serialNumber: body.serialNumber ?? rig.reserve.serialNumber,
              installDate: body.dom ? new Date(body.dom) : rig.reserve.installDate,
              size: (body.size as string) ?? rig.reserve.size,
              repackDate: body.repackDate ? new Date(body.repackDate) : rig.reserve.repackDate,
              repackDueDate: body.repackDueDate ? new Date(body.repackDueDate) : rig.reserve.repackDueDate,
              rides: body.rides ?? rig.reserve.rides,
            },
          });
          break;

        case "AAD":
          if (!rig.aad) throw new NotFoundError("AAD component");
          updated = await fastify.prisma.rigAAD.update({
            where: { id: rig.aad.id },
            data: {
              manufacturer: body.manufacturer ?? rig.aad.manufacturer,
              model: body.model ?? rig.aad.model,
              serialNumber: body.serialNumber ?? rig.aad.serialNumber,
              installDate: body.dom ? new Date(body.dom) : rig.aad.installDate,
              lastServiceDate: body.lastServiceDate ? new Date(body.lastServiceDate) : rig.aad.lastServiceDate,
              nextServiceDueDate: body.nextServiceDueDate ? new Date(body.nextServiceDueDate) : rig.aad.nextServiceDueDate,
              batteryDueDate: body.batteryDueDate ? new Date(body.batteryDueDate) : rig.aad.batteryDueDate,
              endOfLifeDate: body.endOfLifeDate ? new Date(body.endOfLifeDate) : rig.aad.endOfLifeDate,
            },
          });
          break;

        default:
          throw new ValidationError({}, `Unsupported component type: ${componentType}`);
      }

      await auditService.log({
        userId,
        dropzoneId,
        action: "RIG_UPDATE" as any,
        entityType: `Rig.${componentType}`,
        entityId: rigId,
        afterState: body,
      });

      reply.send({ success: true, data: updated });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 7. LIST MAINTENANCE RULES — GET /rigs/:rigId/maintenance-rules
  // ════════════════════════════════════════════════════════════════════════════

  fastify.get<{ Params: { rigId: string } }>(
    "/rigs/:rigId/maintenance-rules",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const rigId = parseInt(request.params.rigId);

      await loadRig(rigId, dropzoneId);

      // Load rules: rig-specific + DZ-defaults (rigId=null for DZ)
      const rules = await fastify.prisma.maintenanceRule.findMany({
        where: {
          dropzoneId,
          enabled: true,
          OR: [{ rigId }, { rigId: null }],
        },
        orderBy: [{ componentType: "asc" }, { sourceType: "asc" }],
      });

      reply.send({ success: true, data: rules });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 8. CREATE MAINTENANCE RULE — POST /rigs/:rigId/maintenance-rules
  // ════════════════════════════════════════════════════════════════════════════

  fastify.post<{ Params: { rigId: string } }>(
    "/rigs/:rigId/maintenance-rules",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["RIGGER", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const userId = parseInt(String(request.user!.sub));
      const rigId = parseInt(request.params.rigId);
      const body = createMaintenanceRuleSchema.parse(request.body);

      await loadRig(rigId, dropzoneId);

      if (!body.triggerByJumps && !body.triggerByDays) {
        throw new ValidationError({}, "At least one trigger (jumps or days) is required");
      }

      const rule = await fastify.prisma.maintenanceRule.create({
        data: {
          dropzoneId,
          rigId,
          componentType: body.componentType as any,
          ruleType: body.ruleType as any,
          label: body.label,
          triggerByJumps: body.triggerByJumps ?? null,
          triggerByDays: body.triggerByDays ?? null,
          dueSoonPercent: body.dueSoonPercent,
          overduePercent: body.overduePercent ?? null,
          hardStop: body.hardStop,
          sourceType: body.sourceType as any,
          notes: body.notes,
          enabled: true,
          createdByUserId: userId,
        },
      });

      await auditService.log({
        userId,
        dropzoneId,
        action: "RIG_RULE_CREATE" as any,
        entityType: "MaintenanceRule",
        entityId: rule.id,
        afterState: { label: body.label, componentType: body.componentType },
      });

      reply.code(201).send({ success: true, data: rule });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 9. UPDATE MAINTENANCE RULE — PATCH /maintenance-rules/:ruleId
  // ════════════════════════════════════════════════════════════════════════════

  fastify.patch<{ Params: { ruleId: string } }>(
    "/maintenance-rules/:ruleId",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["RIGGER", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const userId = parseInt(String(request.user!.sub));
      const ruleId = parseInt(request.params.ruleId);
      const body = updateMaintenanceRuleSchema.parse(request.body);

      const existing = await fastify.prisma.maintenanceRule.findFirst({
        where: { id: ruleId, dropzoneId },
      });
      if (!existing) throw new NotFoundError("Maintenance rule");

      const updated = await fastify.prisma.maintenanceRule.update({
        where: { id: ruleId },
        data: {
          label: body.label ?? existing.label,
          triggerByJumps: body.triggerByJumps !== undefined ? body.triggerByJumps : existing.triggerByJumps,
          triggerByDays: body.triggerByDays !== undefined ? body.triggerByDays : existing.triggerByDays,
          dueSoonPercent: body.dueSoonPercent ?? existing.dueSoonPercent,
          overduePercent: body.overduePercent !== undefined ? body.overduePercent : existing.overduePercent,
          hardStop: body.hardStop ?? existing.hardStop,
          enabled: body.enabled ?? existing.enabled,
          notes: body.notes ?? existing.notes,
        },
      });

      await auditService.log({
        userId,
        dropzoneId,
        action: "RIG_RULE_UPDATE" as any,
        entityType: "MaintenanceRule",
        entityId: ruleId,
        beforeState: { label: existing.label, hardStop: existing.hardStop },
        afterState: body,
      });

      reply.send({ success: true, data: updated });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 10. LIST MAINTENANCE EVENTS — GET /rigs/:rigId/maintenance-events
  // ════════════════════════════════════════════════════════════════════════════

  fastify.get<{
    Params: { rigId: string };
    Querystring: { limit?: string; offset?: string };
  }>(
    "/rigs/:rigId/maintenance-events",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const rigId = parseInt(request.params.rigId);
      const limit = Math.min(parseInt(request.query.limit || "50"), 100);
      const offset = parseInt(request.query.offset || "0");

      await loadRig(rigId, dropzoneId);

      const [events, total] = await Promise.all([
        fastify.prisma.maintenanceEvent.findMany({
          where: { rigId },
          include: {
            performedBy: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { eventDate: "desc" },
          take: limit,
          skip: offset,
        }),
        fastify.prisma.maintenanceEvent.count({ where: { rigId } }),
      ]);

      reply.send({
        success: true,
        data: events,
        meta: { total, limit, offset },
      });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 11. CREATE MAINTENANCE EVENT — POST /rigs/:rigId/maintenance-events
  // ════════════════════════════════════════════════════════════════════════════

  fastify.post<{ Params: { rigId: string } }>(
    "/rigs/:rigId/maintenance-events",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["RIGGER", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const userId = parseInt(String(request.user!.sub));
      const rigId = parseInt(request.params.rigId);
      const body = createMaintenanceEventSchema.parse(request.body);

      const rig = await loadRig(rigId, dropzoneId);

      // Capture counters BEFORE the event
      const countersBefore: Record<string, any> = {};
      if (rig.mainCanopy) {
        countersBefore.main = {
          jumpsSinceInspection: rig.mainCanopy.jumpsSinceInspection,
          jumpsSinceReline: rig.mainCanopy.jumpsSinceReline,
          totalJumps: rig.mainCanopy.totalJumps,
        };
      }
      if (rig.reserve) {
        countersBefore.reserve = {
          repackDate: rig.reserve.repackDate,
          rides: rig.reserve.rides,
        };
      }
      if (rig.aad) {
        countersBefore.aad = {
          lastServiceDate: rig.aad.lastServiceDate,
        };
      }

      // Create the event
      const event = await fastify.prisma.maintenanceEvent.create({
        data: {
          rigId,
          componentType: body.componentType as any,
          maintenanceType: body.maintenanceType,
          eventDate: new Date(),
          result: body.result as any,
          performedByUserId: body.performedById ?? userId,
          notes: body.notes,
          countersBefore: countersBefore as any,
        },
      });

      // If resetCounters, reset the appropriate component counters
      if (body.resetCounters) {
        const now = new Date();
        switch (body.componentType) {
          case "MAIN":
            if (rig.mainCanopy) {
              await fastify.prisma.rigMainCanopy.update({
                where: { id: rig.mainCanopy.id },
                data: {
                  jumpsSinceInspection: 0,
                  lastInspectionDate: now,
                },
              });
            }
            break;
          case "LINESET":
            if (rig.mainCanopy) {
              await fastify.prisma.rigMainCanopy.update({
                where: { id: rig.mainCanopy.id },
                data: {
                  jumpsSinceReline: 0,
                  lastRelineDate: now,
                },
              });
            }
            break;
          case "RESERVE":
            if (rig.reserve) {
              const repackDue = new Date(now);
              repackDue.setDate(repackDue.getDate() + 180);
              await fastify.prisma.rigReserve.update({
                where: { id: rig.reserve.id },
                data: {
                  repackDate: now,
                  repackDueDate: repackDue,
                },
              });
            }
            break;
          case "AAD":
            if (rig.aad) {
              const nextService = new Date(now);
              nextService.setFullYear(nextService.getFullYear() + 1);
              await fastify.prisma.rigAAD.update({
                where: { id: rig.aad.id },
                data: {
                  lastServiceDate: now,
                  nextServiceDueDate: nextService,
                },
              });
            }
            break;
        }

        // Capture counters AFTER reset
        const rigAfter = await loadRig(rigId, dropzoneId);
        const countersAfter: Record<string, any> = {};
        if (rigAfter.mainCanopy) {
          countersAfter.main = {
            jumpsSinceInspection: rigAfter.mainCanopy.jumpsSinceInspection,
            jumpsSinceReline: rigAfter.mainCanopy.jumpsSinceReline,
          };
        }
        if (rigAfter.reserve) {
          countersAfter.reserve = {
            repackDate: rigAfter.reserve.repackDate,
          };
        }
        if (rigAfter.aad) {
          countersAfter.aad = {
            lastServiceDate: rigAfter.aad.lastServiceDate,
          };
        }

        await fastify.prisma.maintenanceEvent.update({
          where: { id: event.id },
          data: { countersAfter: countersAfter as any },
        });
      }

      await auditService.log({
        userId,
        dropzoneId,
        action: "RIG_MAINTENANCE_EVENT" as any,
        entityType: "MaintenanceEvent",
        entityId: event.id,
        afterState: {
          rigId,
          componentType: body.componentType,
          result: body.result,
          resetCounters: body.resetCounters,
        },
      });

      // Fire maintenance-completed notification (fire-and-forget)
      try {
        await publishMaintenanceCompletedNotification(
          fastify.prisma,
          fastify.notificationService,
          rigId,
          body.componentType,
          body.maintenanceType,
          body.result,
          body.performedById ?? userId
        );
      } catch (notifErr) {
        console.warn(`Maintenance completed notification failed for rig ${rigId}:`, notifErr);
      }

      reply.code(201).send({ success: true, data: event });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 12. GROUND RIG — POST /rigs/:rigId/ground
  // ════════════════════════════════════════════════════════════════════════════

  fastify.post<{ Params: { rigId: string } }>(
    "/rigs/:rigId/ground",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["RIGGER", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const userId = parseInt(String(request.user!.sub));
      const rigId = parseInt(request.params.rigId);
      const body = groundRigSchema.parse(request.body);

      await loadRig(rigId, dropzoneId);

      // Check for active grounding on same component
      const activeGround = await fastify.prisma.rigGroundingRecord.findFirst({
        where: { rigId, componentType: body.componentType as any, active: true },
      });
      if (activeGround) {
        throw new ConflictError(
          `Rig already has active grounding on ${body.componentType}`
        );
      }

      const grounding = await fastify.prisma.rigGroundingRecord.create({
        data: {
          rigId,
          componentType: body.componentType as any,
          reason: body.reason,
          policySource: body.policySource,
          groundedByUserId: userId,
          groundedAt: new Date(),
          active: true,
        },
      });

      // Update rig maintenance status
      await fastify.prisma.rig.update({
        where: { id: rigId },
        data: { maintenanceStatus: toPrismaMaintenanceStatus("GROUNDED" as any) as any },
      });

      await auditService.log({
        userId,
        dropzoneId,
        action: "RIG_GROUND" as any,
        entityType: "RigGroundingRecord",
        entityId: grounding.id,
        afterState: {
          rigId,
          componentType: body.componentType,
          reason: body.reason,
        },
      });

      reply.code(201).send({ success: true, data: grounding });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 13. CLEAR GROUNDING — POST /rigs/:rigId/clear-grounding
  // ════════════════════════════════════════════════════════════════════════════

  fastify.post<{ Params: { rigId: string } }>(
    "/rigs/:rigId/clear-grounding",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["RIGGER", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const userId = parseInt(String(request.user!.sub));
      const rigId = parseInt(request.params.rigId);
      const body = clearGroundingSchema.parse(request.body);

      await loadRig(rigId, dropzoneId);

      const grounding = await fastify.prisma.rigGroundingRecord.findFirst({
        where: { id: body.groundingId, rigId, active: true },
      });
      if (!grounding) throw new NotFoundError("Active grounding record");

      await fastify.prisma.rigGroundingRecord.update({
        where: { id: body.groundingId },
        data: {
          active: false,
          clearedByUserId: userId,
          clearedAt: new Date(),
          clearanceNotes: body.clearanceNotes,
        },
      });

      // Re-evaluate status — if no more active groundings, re-calculate
      const remainingGroundings = await fastify.prisma.rigGroundingRecord.count({
        where: { rigId, active: true },
      });

      if (remainingGroundings === 0) {
        // Re-evaluate via engine to get correct status
        const status = await evaluateRigStatus(fastify.prisma, rigId);
        await fastify.prisma.rig.update({
          where: { id: rigId },
          data: { maintenanceStatus: toPrismaMaintenanceStatus(status.overallStatus) as any },
        });
      }

      await auditService.log({
        userId,
        dropzoneId,
        action: "RIG_CLEAR_GROUNDING" as any,
        entityType: "RigGroundingRecord",
        entityId: body.groundingId,
        afterState: {
          rigId,
          clearanceNotes: body.clearanceNotes,
        },
      });

      // Fire grounding-cleared notification (fire-and-forget)
      try {
        await publishGroundingClearedNotification(
          fastify.prisma,
          fastify.notificationService,
          rigId,
          grounding.componentType as string,
          userId,
          body.clearanceNotes ?? ""
        );
      } catch (notifErr) {
        console.warn(`Grounding cleared notification failed for rig ${rigId}:`, notifErr);
      }

      reply.send({ success: true, data: { cleared: true, groundingId: body.groundingId } });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 14. LIST RIGS DUE FOR MAINTENANCE — GET /rigs/due
  // ════════════════════════════════════════════════════════════════════════════

  fastify.get(
    "/rigs/due",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["RIGGER", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);

      const rigs = await fastify.prisma.rig.findMany({
        where: {
          dropzoneId,
          activeStatus: "ACTIVE" as any,
          maintenanceStatus: { in: ["DUE_SOON", "DUE_NOW", "OVERDUE", "GROUNDED_STATUS"] as any },
        },
        include: {
          mainCanopy: { select: { manufacturer: true, model: true } },
          reserve: { select: { repackDueDate: true } },
          aad: { select: { nextServiceDueDate: true } },
          owner: { select: { firstName: true, lastName: true } },
        },
        orderBy: { maintenanceStatus: "desc" },
      });

      reply.send({ success: true, data: rigs });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 15. LIST GROUNDED RIGS — GET /rigs/grounded
  // ════════════════════════════════════════════════════════════════════════════

  fastify.get(
    "/rigs/grounded",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["RIGGER", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);

      const groundings = await fastify.prisma.rigGroundingRecord.findMany({
        where: {
          active: true,
          rig: { dropzoneId },
        },
        include: {
          rig: {
            select: { id: true, rigName: true, serialNumber: true, rigType: true },
          },
          groundedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { groundedAt: "desc" },
      });

      reply.send({ success: true, data: groundings });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 16. MAINTENANCE SUMMARY — GET /maintenance/summary
  // ════════════════════════════════════════════════════════════════════════════

  fastify.get(
    "/maintenance/summary",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["RIGGER", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);

      const [
        totalRigs,
        activeRigs,
        groundedCount,
        dueNowCount,
        dueSoonCount,
        overdueCount,
        recentEvents,
      ] = await Promise.all([
        fastify.prisma.rig.count({ where: { dropzoneId } }),
        fastify.prisma.rig.count({ where: { dropzoneId, activeStatus: "ACTIVE" as any } }),
        fastify.prisma.rigGroundingRecord.count({ where: { active: true, rig: { dropzoneId } } }),
        fastify.prisma.rig.count({ where: { dropzoneId, maintenanceStatus: "DUE_NOW" as any } }),
        fastify.prisma.rig.count({ where: { dropzoneId, maintenanceStatus: "DUE_SOON" as any } }),
        fastify.prisma.rig.count({ where: { dropzoneId, maintenanceStatus: "OVERDUE" as any } }),
        fastify.prisma.maintenanceEvent.findMany({
          where: { rig: { dropzoneId } },
          include: {
            rig: { select: { rigName: true, serialNumber: true } },
            performedBy: { select: { firstName: true, lastName: true } },
          },
          orderBy: { eventDate: "desc" },
          take: 10,
        }),
      ]);

      reply.send({
        success: true,
        data: {
          totalRigs,
          activeRigs,
          groundedCount,
          dueNowCount,
          dueSoonCount,
          overdueCount,
          recentEvents,
        },
      });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 17. DEFAULT RULE TEMPLATES — GET /maintenance/default-rules
  // ════════════════════════════════════════════════════════════════════════════

  fastify.get(
    "/maintenance/default-rules",
    { preHandler: [authenticate, tenantScope] },
    async (_request, reply) => {
      reply.send({ success: true, data: DEFAULT_RULE_TEMPLATES });
    }
  );
}
