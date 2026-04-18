import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import { NotFoundError, ValidationError } from "../utils/errors";
import { AuditService } from "../services/auditService";

const createGearSchema = z.object({
  make: z.string(),
  model: z.string(),
  serialNumber: z.string(),
  gearType: z.enum(["MAIN", "RESERVE", "AAD", "CONTAINER", "HELMET", "ALTIMETER", "JUMPSUIT"]),
  purchaseDate: z.string(),
  isRental: z.boolean().optional(),
});

const gearCheckSchema = z.object({
  status: z.enum(["PASS", "FAIL", "CONDITIONAL"]),
  notes: z.string().optional(),
  checkedBy: z.string(),
});

const assignGearSchema = z.object({
  gearId: z.string(),
});

export async function gearRoutes(fastify: FastifyInstance) {
  const auditService = new AuditService(fastify.prisma);

  // List gear
  fastify.get<{
    Querystring: { gearType?: string; limit?: string; offset?: string };
  }>(
    "/gear",
    {
      preHandler: [authenticate, tenantScope],
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const dropzoneId = parseInt(request.user.dropzoneId || "0");
        const gearType = request.query.gearType;
        const limit = Math.min(parseInt(request.query.limit || "50"), 100);
        const offset = parseInt(request.query.offset || "0");

        const query: any = { dropzoneId };
        if (gearType) query.gearType = gearType;

        const gear = await fastify.prisma.gearItem.findMany({
          where: query,
          include: {
            checks: {
              take: 1,
              orderBy: { checkedAt: "desc" },
            },
            owner: true,
            rentals: {
              where: { returnedAt: null },
              take: 1,
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        });

        reply.code(200).send({
          success: true,
          data: gear.map((g) => {
            const c0 = g.checks[0];
            const activeRental = g.rentals[0];
            const renter = activeRental?.user;
            const ownerLabel = g.owner
              ? `${g.owner.firstName} ${g.owner.lastName}`
              : renter
                ? `${renter.firstName} ${renter.lastName}`
                : null;
            return {
              id: g.id,
              manufacturer: g.manufacturer,
              model: g.model,
              serialNumber: g.serialNumber,
              gearType: g.gearType,
              status: g.status,
              isRental: g.isRental,
              nextRepackDue: g.nextRepackDue,
              aadFiresRemaining: g.aadFiresRemaining,
              lastCheck: c0
                ? {
                    result: c0.result,
                    checkedAt: c0.checkedAt,
                    notes: c0.notes,
                  }
                : null,
              owner: ownerLabel,
              activeRentalUserId: renter?.id ?? null,
            };
          }),
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to fetch gear",
        });
      }
    }
  );

  // Create gear
  fastify.post<{
    Body: z.infer<typeof createGearSchema>;
  }>(
    "/gear",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize([
          "OPERATOR",
          "GEAR_MASTER",
          "DZ_MANAGER",
          "DZ_OWNER",
          "MANIFEST_STAFF",
          "PLATFORM_ADMIN",
        ]),
      ],
      schema: {
        body: {
          type: "object",
          required: ["make", "model", "serialNumber", "gearType", "purchaseDate"],
          properties: {
            make: { type: "string" },
            model: { type: "string" },
            serialNumber: { type: "string" },
            gearType: { type: "string", enum: ["MAIN", "RESERVE", "AAD", "CONTAINER", "HELMET", "ALTIMETER", "JUMPSUIT"] },
            purchaseDate: { type: "string" },
            isRental: { type: "boolean" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const dropzoneId = parseInt(request.user.dropzoneId || "0");
        const body = createGearSchema.parse(request.body);

        const gear = await fastify.prisma.gearItem.create({
          data: {
            dropzoneId,
            manufacturer: body.make,
            model: body.model,
            serialNumber: body.serialNumber,
            gearType: body.gearType,
            dom: new Date(body.purchaseDate),
            isRental: body.isRental ?? false,
          },
        });

        await auditService.log({
          userId: parseInt(String(request.user.sub)),
          dropzoneId,
          action: "GEAR_CHECK",
          entityType: "GearItem",
          entityId: gear.id,
          afterState: { serialNumber: body.serialNumber, gearType: body.gearType },
        });

        reply.code(201).send({
          success: true,
          data: {
            id: gear.id,
            manufacturer: gear.manufacturer,
            model: gear.model,
            gearType: gear.gearType,
          },
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to create gear",
        });
      }
    }
  );

  // Perform gear check
  fastify.post<{
    Params: { id: string };
    Body: z.infer<typeof gearCheckSchema>;
  }>(
    "/gear/:id/check",
    {
      preHandler: [authenticate, tenantScope, authorize(["OPERATOR", "GEAR_MASTER"])],
      schema: {
        body: {
          type: "object",
          required: ["status", "checkedBy"],
          properties: {
            status: { type: "string", enum: ["PASS", "FAIL", "CONDITIONAL"] },
            notes: { type: "string" },
            checkedBy: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const dropzoneId = parseInt(request.user.dropzoneId || "0");
        const gearItemId = parseInt(request.params.id);
        const body = gearCheckSchema.parse(request.body);
        const checkedById = parseInt(body.checkedBy);

        const gear = await fastify.prisma.gearItem.findFirst({
          where: {
            id: gearItemId,
            dropzoneId,
          },
        });

        if (!gear) {
          throw new NotFoundError("Gear");
        }

        // Create gear check record
        const check = await fastify.prisma.gearCheck.create({
          data: {
            gearItemId,
            userId: parseInt(String(request.user.sub)),
            checkedById,
            result: body.status,
            notes: body.notes,
            checkedAt: new Date(),
          },
        });

        await auditService.log({
          userId: parseInt(String(request.user.sub)),
          dropzoneId,
          action: "GEAR_CHECK",
          entityType: "GearItem",
          entityId: gear.id,
          afterState: { result: body.status },
        });

        reply.code(201).send({
          success: true,
          data: {
            checkId: check.id,
            result: check.result,
            checkedAt: check.checkedAt,
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({
            success: false,
            error: error.message,
          });
        } else {
          reply.code(500).send({
            success: false,
            error: "Failed to perform gear check",
          });
        }
      }
    }
  );

  // Get gear check history
  fastify.get<{
    Params: { id: string };
    Querystring: { limit?: string; offset?: string };
  }>(
    "/gear/:id/history",
    {
      preHandler: [authenticate, tenantScope],
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const dropzoneId = parseInt(request.user.dropzoneId || "0");
        const gearItemId = parseInt(request.params.id);
        const limit = Math.min(parseInt(request.query.limit || "50"), 100);
        const offset = parseInt(request.query.offset || "0");

        const gear = await fastify.prisma.gearItem.findFirst({
          where: {
            id: gearItemId,
            dropzoneId,
          },
        });

        if (!gear) {
          throw new NotFoundError("Gear");
        }

        const checks = await fastify.prisma.gearCheck.findMany({
          where: { gearItemId },
          include: {
            user: true,
          },
          orderBy: { checkedAt: "desc" },
          take: limit,
          skip: offset,
        });

        reply.code(200).send({
          success: true,
          data: checks.map((c) => ({
            id: c.id,
            result: c.result,
            notes: c.notes,
            checkedBy: c.user ? `${c.user.firstName} ${c.user.lastName}` : "Unknown",
            checkedAt: c.checkedAt,
          })),
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({
            success: false,
            error: error.message,
          });
        } else {
          reply.code(500).send({
            success: false,
            error: "Failed to fetch gear history",
          });
        }
      }
    }
  );

  // Assign gear to user
  fastify.post<{
    Params: { userId: string };
    Body: z.infer<typeof assignGearSchema>;
  }>(
    "/gear/assign/:userId",
    {
      preHandler: [authenticate, tenantScope, authorize(["OPERATOR"])],
      schema: {
        body: {
          type: "object",
          required: ["gearId"],
          properties: {
            gearId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const dropzoneId = parseInt(request.user.dropzoneId || "0");
        const userId = parseInt(request.params.userId);
        const body = assignGearSchema.parse(request.body);
        const gearItemId = parseInt(body.gearId);

        // Verify user exists
        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw new NotFoundError("User");
        }

        // Verify gear exists
        const gear = await fastify.prisma.gearItem.findFirst({
          where: {
            id: gearItemId,
            dropzoneId,
          },
        });

        if (!gear) {
          throw new NotFoundError("Gear");
        }

        // Assign gear by updating owner
        const updated = await fastify.prisma.gearItem.update({
          where: { id: gearItemId },
          data: {
            ownerId: userId,
          },
        });

        await auditService.log({
          userId: parseInt(String(request.user.sub)),
          dropzoneId,
          action: "GEAR_CHECK",
          entityType: "GearItem",
          entityId: gear.id,
          afterState: { ownerId: userId },
        });

        reply.code(201).send({
          success: true,
          data: {
            gearId: updated.id,
            ownerId: updated.ownerId,
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({
            success: false,
            error: error.message,
          });
        } else {
          reply.code(500).send({
            success: false,
            error: "Failed to assign gear",
          });
        }
      }
    }
  );

  // Return gear (unassign owner, set status back to SERVICEABLE)
  fastify.post<{
    Params: { gearId: string };
  }>(
    "/gear/:gearId/return",
    {
      preHandler: [authenticate, tenantScope, authorize(["OPERATOR", "MANIFEST_STAFF"])],
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const dropzoneId = parseInt(request.user.dropzoneId || "0");
        const gearId = parseInt(request.params.gearId);

        const gear = await fastify.prisma.gearItem.findFirst({
          where: { id: gearId, dropzoneId },
        });

        if (!gear) {
          throw new NotFoundError("Gear");
        }

        const updated = await fastify.prisma.gearItem.update({
          where: { id: gearId },
          data: {
            ownerId: null,
            status: "ACTIVE",
          },
        });

        await auditService.log({
          userId: parseInt(String(request.user.sub)),
          dropzoneId,
          action: "GEAR_CHECK",
          entityType: "GearItem",
          entityId: gear.id,
          afterState: { returned: true, status: "ACTIVE" },
        });

        reply.code(200).send({
          success: true,
          data: { id: updated.id, status: updated.status },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to return gear" });
        }
      }
    }
  );

  // ── REPACK QUEUE ──────────────────────────────────────────────────

  fastify.get(
    "/gear/repack-queue",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["RIGGER", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const dropzoneId = parseInt(request.user!.dropzoneId || "0");

        const items = await fastify.prisma.gearItem.findMany({
          where: {
            dropzoneId,
            gearType: { in: ["RESERVE", "CONTAINER"] },
            nextRepackDue: { not: null },
            status: { not: "RETIRED" },
          },
          include: {
            owner: { select: { firstName: true, lastName: true } },
          },
          orderBy: { nextRepackDue: "asc" },
        });

        const now = new Date();
        reply.send({
          success: true,
          data: items.map((g) => ({
            id: g.id,
            serialNumber: g.serialNumber,
            gearType: g.gearType,
            manufacturer: g.manufacturer,
            model: g.model,
            owner: g.owner ? `${g.owner.firstName} ${g.owner.lastName}` : "Unassigned",
            lastRepackAt: g.lastRepackAt,
            nextRepackDue: g.nextRepackDue,
            isOverdue: g.nextRepackDue ? g.nextRepackDue < now : false,
            daysUntilDue: g.nextRepackDue
              ? Math.ceil((g.nextRepackDue.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
              : null,
          })),
        });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch repack queue" });
      }
    }
  );

  // Log a repack
  fastify.post<{ Params: { gearId: string } }>(
    "/gear/:gearId/repack",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["RIGGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const dropzoneId = parseInt(request.user!.dropzoneId || "0");
        const gearId = parseInt(request.params.gearId);
        const body = request.body as { notes?: string };

        const gear = await fastify.prisma.gearItem.findFirst({
          where: { id: gearId, dropzoneId },
        });
        if (!gear) throw new NotFoundError("Gear");

        const now = new Date();
        const nextDue = new Date(now);
        nextDue.setDate(nextDue.getDate() + 180); // 180-day repack cycle

        const updated = await fastify.prisma.gearItem.update({
          where: { id: gearId },
          data: {
            lastRepackAt: now,
            nextRepackDue: nextDue,
            status: "ACTIVE",
          },
        });

        await auditService.log({
          userId: parseInt(String(request.user!.sub)),
          dropzoneId,
          action: "REPACK_LOG",
          entityType: "GearItem",
          entityId: gearId,
          afterState: { lastRepackAt: now, nextRepackDue: nextDue },
        });

        reply.send({
          success: true,
          data: {
            id: updated.id,
            lastRepackAt: updated.lastRepackAt,
            nextRepackDue: updated.nextRepackDue,
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to log repack" });
        }
      }
    }
  );

  // ── GEAR RENTALS ─────────────────────────────────────────────────

  // Create rental (assign rental gear to user)
  fastify.post<{ Params: { gearId: string } }>(
    "/gear/:gearId/rent",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const dropzoneId = parseInt(request.user!.dropzoneId || "0");
        const gearItemId = parseInt(request.params.gearId);
        const body = request.body as {
          userId: number;
          conditionOut?: string;
          dailyRateCents?: number;
        };

        const gear = await fastify.prisma.gearItem.findFirst({
          where: { id: gearItemId, dropzoneId, status: "ACTIVE" },
        });
        if (!gear) throw new NotFoundError("Gear");

        // Check not already rented out
        const activeRental = await fastify.prisma.gearRental.findFirst({
          where: { gearItemId, returnedAt: null },
        });
        if (activeRental) {
          reply.code(409).send({ success: false, error: "Gear is already rented out" });
          return;
        }

        const rental = await fastify.prisma.gearRental.create({
          data: {
            gearItemId,
            userId: body.userId,
            assignedBy: parseInt(String(request.user!.sub)),
            assignedAt: new Date(),
            conditionOut: body.conditionOut ?? "Good",
            dailyRateCents: body.dailyRateCents ?? 0,
          },
        });

        await auditService.log({
          userId: parseInt(String(request.user!.sub)),
          dropzoneId,
          action: "GEAR_ASSIGN",
          entityType: "GearRental",
          entityId: rental.id,
          afterState: { userId: body.userId, gearItemId },
        });

        reply.code(201).send({ success: true, data: rental });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to create rental" });
        }
      }
    }
  );

  // Return rental gear
  fastify.post<{ Params: { rentalId: string } }>(
    "/gear/rentals/:rentalId/return",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const body = request.body as { conditionIn?: string };

        const rental = await fastify.prisma.gearRental.findUnique({
          where: { id: parseInt(request.params.rentalId) },
        });
        if (!rental) throw new NotFoundError("Rental");

        const updated = await fastify.prisma.gearRental.update({
          where: { id: rental.id },
          data: {
            returnedAt: new Date(),
            conditionIn: body.conditionIn ?? "Good",
          },
        });

        reply.send({ success: true, data: updated });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to return rental" });
        }
      }
    }
  );

  // List active rentals
  fastify.get(
    "/gear/rentals",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "RIGGER", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const dropzoneId = parseInt(request.user!.dropzoneId || "0");
        const activeOnly = (request.query as any).active !== "false";

        const rentals = await fastify.prisma.gearRental.findMany({
          where: {
            gearItem: { dropzoneId },
            ...(activeOnly ? { returnedAt: null } : {}),
          },
          include: {
            gearItem: { select: { serialNumber: true, gearType: true, manufacturer: true, model: true } },
            user: { select: { firstName: true, lastName: true } },
            assigner: { select: { firstName: true, lastName: true } },
          },
          orderBy: { assignedAt: "desc" },
          take: 50,
        });

        reply.send({
          success: true,
          data: rentals.map((r) => ({
            id: r.id,
            gearItemId: r.gearItemId,
            userId: r.userId,
            gear: `${r.gearItem.manufacturer} ${r.gearItem.model} (${r.gearItem.serialNumber})`,
            gearType: r.gearItem.gearType,
            renter: `${r.user.firstName} ${r.user.lastName}`,
            assignedBy: `${r.assigner.firstName} ${r.assigner.lastName}`,
            assignedAt: r.assignedAt,
            returnedAt: r.returnedAt,
            conditionOut: r.conditionOut,
            conditionIn: r.conditionIn,
            dailyRateCents: r.dailyRateCents,
          })),
        });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch rentals" });
      }
    }
  );

  // Update gear status (mark as maintenance, serviceable, etc.)
  fastify.put<{
    Params: { gearId: string };
    Body: { status: string };
  }>(
    "/gear/:gearId/status",
    {
      preHandler: [authenticate, tenantScope, authorize(["OPERATOR", "MANIFEST_STAFF", "SAFETY_OFFICER"])],
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const dropzoneId = parseInt(request.user.dropzoneId || "0");
        const gearId = parseInt(request.params.gearId);
        const { status } = request.body as { status: string };

        const gear = await fastify.prisma.gearItem.findFirst({
          where: { id: gearId, dropzoneId },
        });

        if (!gear) {
          throw new NotFoundError("Gear");
        }

        const updated = await fastify.prisma.gearItem.update({
          where: { id: gearId },
          data: { status: status as any },
        });

        await auditService.log({
          userId: parseInt(String(request.user.sub)),
          dropzoneId,
          action: "GEAR_CHECK",
          entityType: "GearItem",
          entityId: gear.id,
          afterState: { status },
        });

        reply.code(200).send({
          success: true,
          data: { id: updated.id, status: updated.status },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to update gear status" });
        }
      }
    }
  );
}
