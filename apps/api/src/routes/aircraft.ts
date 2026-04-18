import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import { NotFoundError, ConflictError } from "../utils/errors";
import { AuditService } from "../services/auditService";
import { ValidationGatesService } from "../services/validationGates";

// ============================================================================
// AIRCRAFT ROUTES — Registry, maintenance tracking, airworthiness
// ============================================================================

const createAircraftSchema = z.object({
  registration: z.string().min(1).max(20),
  type: z.string().min(1).max(100),
  manufacturer: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  maxCapacity: z.number().int().positive(),
  maxWeight: z.number().int().positive(),
  emptyWeight: z.number().int().positive(),
  fuelBurnRate: z.number().positive().optional(),
  fuelCapacity: z.number().int().positive().optional(),
  cgForwardLimit: z.number().optional(),
  cgAftLimit: z.number().optional(),
  fuelArmDistance: z.number().positive().optional(),   // inches from CG datum
  emptyWeightArm: z.number().positive().optional(),    // arm distance at empty weight
  seatPositions: z.array(z.object({
    position: z.number().int().positive(),
    armDistance: z.number().positive(),
  })).optional(),
});

const updateAircraftSchema = z.object({
  status: z.enum(["ACTIVE", "MX_HOLD", "RETIRED"]).optional(),
  hobbsHours: z.number().optional(),
  next100hrDue: z.number().optional(),
  annualDue: z.string().datetime().optional(),
  fuelBurnRate: z.number().positive().optional(),
  fuelCapacity: z.number().int().positive().optional(),
  cgForwardLimit: z.number().optional(),
  cgAftLimit: z.number().optional(),
  fuelArmDistance: z.number().positive().optional(),
  emptyWeightArm: z.number().positive().optional(),
  seatPositions: z.array(z.object({
    position: z.number().int().positive(),
    armDistance: z.number().positive(),
  })).optional(),
  maxCapacity: z.number().int().positive().optional(),
  maxWeight: z.number().int().positive().optional(),
});

export async function aircraftRoutes(fastify: FastifyInstance) {
  const auditService = new AuditService(fastify.prisma);
  const validationGates = new ValidationGatesService(fastify.prisma);

  // List aircraft for dropzone
  fastify.get(
    "/aircraft",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const statusFilter = (request.query as any).status;

      const where: any = { dropzoneId };
      if (statusFilter) where.status = statusFilter;

      const aircraft = await fastify.prisma.aircraft.findMany({
        where,
        orderBy: { registration: "asc" },
      });

      reply.send({
        success: true,
        data: aircraft.map((ac) => ({
          id: ac.id,
          registration: ac.registration,
          type: ac.type,
          manufacturer: ac.manufacturer,
          model: ac.model,
          maxCapacity: ac.maxCapacity,
          maxWeight: ac.maxWeight,
          emptyWeight: ac.emptyWeight,
          status: ac.status,
          hobbsHours: ac.hobbsHours,
          next100hrDue: ac.next100hrDue,
          annualDue: ac.annualDue,
          fuelBurnRate: ac.fuelBurnRate,
          fuelCapacity: ac.fuelCapacity,
          cgForwardLimit: ac.cgForwardLimit,
          cgAftLimit: ac.cgAftLimit,
        })),
      });
    }
  );

  // Get aircraft detail with airworthiness check
  fastify.get<{ Params: { aircraftId: string } }>(
    "/aircraft/:aircraftId",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const aircraftId = parseInt((request.params as any).aircraftId);

      const ac = await fastify.prisma.aircraft.findFirst({
        where: { id: aircraftId, dropzoneId },
        include: {
          loads: {
            where: { status: { notIn: ["COMPLETE", "CANCELLED"] } },
            take: 5,
            orderBy: { scheduledAt: "desc" },
          },
        },
      });

      if (!ac) throw new NotFoundError("Aircraft");

      const airworthiness = await validationGates.checkAircraftAirworthiness(aircraftId);

      reply.send({
        success: true,
        data: {
          ...ac,
          airworthiness,
          activeLoads: ac.loads.length,
        },
      });
    }
  );

  // Create aircraft
  fastify.post(
    "/aircraft",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const body = createAircraftSchema.parse(request.body);

      // Check unique registration
      const existing = await fastify.prisma.aircraft.findFirst({
        where: { dropzoneId, registration: body.registration },
      });
      if (existing) throw new ConflictError("Aircraft registration already exists at this DZ");

      const ac = await fastify.prisma.aircraft.create({
        data: {
          dropzoneId,
          registration: body.registration,
          type: body.type,
          manufacturer: body.manufacturer,
          model: body.model,
          maxCapacity: body.maxCapacity,
          maxWeight: body.maxWeight,
          emptyWeight: body.emptyWeight,
          fuelBurnRate: body.fuelBurnRate,
          fuelCapacity: body.fuelCapacity,
          cgForwardLimit: body.cgForwardLimit,
          cgAftLimit: body.cgAftLimit,
          status: "ACTIVE",
        },
      });

      await auditService.log({
        userId: parseInt(String(request.user!.sub)),
        dropzoneId,
        action: "CREATE",
        entityType: "Aircraft",
        entityId: ac.id,
        afterState: { registration: body.registration },
      });

      reply.code(201).send({ success: true, data: ac });
    }
  );

  // Update aircraft (status, maintenance fields)
  fastify.patch<{ Params: { aircraftId: string } }>(
    "/aircraft/:aircraftId",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const aircraftId = parseInt((request.params as any).aircraftId);
      const body = updateAircraftSchema.parse(request.body);

      const ac = await fastify.prisma.aircraft.findFirst({
        where: { id: aircraftId, dropzoneId },
      });
      if (!ac) throw new NotFoundError("Aircraft");

      const updated = await fastify.prisma.aircraft.update({
        where: { id: aircraftId },
        data: {
          status: body.status as any ?? ac.status,
          hobbsHours: body.hobbsHours ?? ac.hobbsHours,
          next100hrDue: body.next100hrDue ?? ac.next100hrDue,
          annualDue: body.annualDue ? new Date(body.annualDue) : ac.annualDue,
          fuelBurnRate: body.fuelBurnRate ?? ac.fuelBurnRate,
          fuelCapacity: body.fuelCapacity ?? ac.fuelCapacity,
          cgForwardLimit: body.cgForwardLimit ?? ac.cgForwardLimit,
          cgAftLimit: body.cgAftLimit ?? ac.cgAftLimit,
          maxCapacity: body.maxCapacity ?? ac.maxCapacity,
          maxWeight: body.maxWeight ?? ac.maxWeight,
        },
      });

      await auditService.log({
        userId: parseInt(String(request.user!.sub)),
        dropzoneId,
        action: "UPDATE",
        entityType: "Aircraft",
        entityId: aircraftId,
        beforeState: { status: ac.status, hobbsHours: ac.hobbsHours },
        afterState: body,
      });

      reply.send({ success: true, data: updated });
    }
  );

  // Log hobbs hours after flight
  fastify.post<{ Params: { aircraftId: string } }>(
    "/aircraft/:aircraftId/log-hobbs",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["PILOT", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const aircraftId = parseInt((request.params as any).aircraftId);
      const { hobbsEnd } = request.body as { hobbsEnd: number };

      const ac = await fastify.prisma.aircraft.findFirst({
        where: { id: aircraftId, dropzoneId },
      });
      if (!ac) throw new NotFoundError("Aircraft");

      const updated = await fastify.prisma.aircraft.update({
        where: { id: aircraftId },
        data: { hobbsHours: hobbsEnd },
      });

      // Check if 100hr inspection is due
      const hobbsVal = parseFloat(String(updated.hobbsHours ?? 0));
      const nextDue = parseFloat(String(updated.next100hrDue ?? 0));
      const inspectionDue = nextDue > 0 && hobbsVal >= nextDue - 10; // 10hr warning

      await auditService.log({
        userId: parseInt(String(request.user!.sub)),
        dropzoneId,
        action: "UPDATE",
        entityType: "Aircraft",
        entityId: aircraftId,
        afterState: { hobbsHours: hobbsEnd },
      });

      reply.send({
        success: true,
        data: {
          hobbsHours: updated.hobbsHours,
          inspectionDueSoon: inspectionDue,
        },
      });
    }
  );

  // ── CG CHECK HISTORY ─────────────────────────────────────────────────

  fastify.get<{ Params: { aircraftId: string } }>(
    "/aircraft/:aircraftId/cg-checks",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["PILOT", "MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const aircraftId = parseInt((request.params as any).aircraftId);

      const checks = await fastify.prisma.cgCheck.findMany({
        where: { aircraftId },
        include: {
          performedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      reply.send({
        success: true,
        data: checks.map((c: any) => ({
          id: c.id,
          loadId: c.loadId,
          totalWeight: c.totalWeight,
          fuelWeight: c.fuelWeight,
          pilotWeight: c.pilotWeight,
          passengerWeight: c.passengerWeight,
          calculatedCg: Number(c.calculatedCg),
          forwardLimit: Number(c.forwardLimit),
          aftLimit: Number(c.aftLimit),
          result: c.result,
          overrideReason: c.overrideReason,
          createdAt: c.createdAt.toISOString(),
          performedBy: c.performedBy
            ? { firstName: c.performedBy.firstName, lastName: c.performedBy.lastName }
            : null,
        })),
      });
    }
  );

  // ── PILOT CONFIRMATION ────────────────────────────────────────────────
  // Logs pilot's confirmation of fuel estimate, weight, balance review.
  // Uses AuditLog for append-only compliance trail.

  const pilotConfirmSchema = z.object({
    loadId: z.number().int().optional(),
    estimatedTotalWeight: z.number().positive(),
    estimatedFuelNeeded: z.number().positive(),
    comment: z.string().max(500).optional(),
  });

  fastify.post<{ Params: { aircraftId: string } }>(
    "/aircraft/:aircraftId/pilot-confirm",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["PILOT", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const aircraftId = parseInt((request.params as any).aircraftId);
      const userId = parseInt(request.user.sub);
      const body = pilotConfirmSchema.parse(request.body);

      // Get dropzone for audit scoping
      const aircraft = await fastify.prisma.aircraft.findUnique({
        where: { id: aircraftId },
        select: { dropzoneId: true, registration: true },
      });

      if (!aircraft) {
        return reply.code(404).send({ success: false, error: "Aircraft not found" });
      }

      // Log to audit trail
      const auditService = new AuditService(fastify.prisma);
      await auditService.log({
        userId,
        dropzoneId: aircraft.dropzoneId,
        action: "UPDATE" as any,
        entityType: "PILOT_CONFIRMATION",
        entityId: aircraftId,
        afterState: {
          aircraftId,
          aircraftRegistration: aircraft.registration,
          loadId: body.loadId,
          estimatedTotalWeight: body.estimatedTotalWeight,
          estimatedFuelNeeded: body.estimatedFuelNeeded,
          comment: body.comment || null,
          confirmedById: userId,
          confirmedAt: new Date().toISOString(),
        },
      });

      reply.send({
        success: true,
        data: {
          confirmed: true,
          aircraftId,
          confirmedAt: new Date().toISOString(),
          confirmedById: userId,
        },
      });
    }
  );
}
