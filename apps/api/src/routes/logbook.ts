import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { NotFoundError, ConflictError } from "../utils/errors";

// ============================================================================
// LOGBOOK ROUTES — Digital jump logbook for skydivers
// ============================================================================

// Matches Prisma enum JumpType exactly
const JumpTypeEnum = z.enum([
  "TANDEM",
  "AFF",
  "FUN_JUMP",
  "COACH",
  "HOP_POP",
  "NIGHT",
  "WINGSUIT",
  "CRW",
]);

const createEntrySchema = z.object({
  jumpNumber: z.number().int().positive(),
  altitude: z.number().int().positive().optional(),
  freefallTime: z.number().int().nonnegative().optional(),
  deploymentAltitude: z.number().int().positive().optional(),
  canopySize: z.number().int().positive().optional(),
  jumpType: JumpTypeEnum.optional(),
  disciplines: z.array(z.string()).default([]),
  notes: z.string().optional(),
  loadId: z.number().int().positive().optional(),
  dropzoneId: z.number().int().positive().optional(),
});

const updateEntrySchema = z.object({
  jumpNumber: z.number().int().positive().optional(),
  altitude: z.number().int().positive().optional(),
  freefallTime: z.number().int().nonnegative().optional(),
  deploymentAltitude: z.number().int().positive().optional(),
  canopySize: z.number().int().positive().optional(),
  jumpType: JumpTypeEnum.optional(),
  disciplines: z.array(z.string()).optional(),
  notes: z.string().optional(),
  loadId: z.number().int().positive().nullable().optional(),
});

export async function logbookRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", authenticate);

  // ── GET /logbook — List user's logbook entries (paginated) ──────────

  fastify.get<{
    Querystring: {
      page?: string;
      limit?: string;
      jumpType?: string;
      dropzoneId?: string;
    };
  }>("/logbook", async (request, reply) => {
    try {
      const userId = parseInt(String(request.user!.sub));
      const page = Math.max(parseInt(request.query.page || "1"), 1);
      const limit = Math.min(Math.max(parseInt(request.query.limit || "20"), 1), 100);
      const skip = (page - 1) * limit;

      const where: any = { userId };
      if (request.query.jumpType) {
        where.jumpType = request.query.jumpType;
      }
      if (request.query.dropzoneId) {
        where.dropzoneId = parseInt(request.query.dropzoneId);
      }

      const [entries, total] = await Promise.all([
        fastify.prisma.logbookEntry.findMany({
          where,
          include: {
            load: {
              select: {
                id: true,
                loadNumber: true,
                status: true,
                scheduledAt: true,
              },
            },
            dropzone: {
              select: { id: true, name: true, slug: true },
            },
          },
          orderBy: { jumpNumber: "desc" },
          take: limit,
          skip,
        }),
        fastify.prisma.logbookEntry.count({ where }),
      ]);

      reply.send({
        success: true,
        data: entries,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      reply.code(500).send({
        success: false,
        error: "Failed to fetch logbook entries",
      });
    }
  });

  // ── GET /logbook/stats — User's logbook statistics ─────────────────

  fastify.get("/logbook/stats", async (request, reply) => {
    try {
      const userId = parseInt(String(request.user!.sub));

      const [aggregates, lastEntry, allEntries] = await Promise.all([
        fastify.prisma.logbookEntry.aggregate({
          where: { userId },
          _count: { id: true },
          _sum: { freefallTime: true },
          _max: { altitude: true, createdAt: true },
        }),
        fastify.prisma.logbookEntry.findFirst({
          where: { userId },
          orderBy: { jumpNumber: "desc" },
          select: { jumpNumber: true, createdAt: true },
        }),
        fastify.prisma.logbookEntry.findMany({
          where: { userId },
          select: { jumpType: true, disciplines: true },
        }),
      ]);

      // Build disciplines breakdown
      const disciplinesCounts: Record<string, number> = {};
      const jumpTypeCounts: Record<string, number> = {};

      for (const entry of allEntries) {
        if (entry.jumpType) {
          jumpTypeCounts[entry.jumpType] = (jumpTypeCounts[entry.jumpType] || 0) + 1;
        }
        const disciplines = entry.disciplines as string[];
        if (Array.isArray(disciplines)) {
          for (const d of disciplines) {
            disciplinesCounts[d] = (disciplinesCounts[d] || 0) + 1;
          }
        }
      }

      reply.send({
        success: true,
        data: {
          totalJumps: aggregates._count.id,
          totalFreefallTime: aggregates._sum.freefallTime || 0,
          highestAltitude: aggregates._max.altitude || 0,
          lastJumpDate: lastEntry?.createdAt || null,
          lastJumpNumber: lastEntry?.jumpNumber || null,
          jumpTypeBreakdown: jumpTypeCounts,
          disciplinesBreakdown: disciplinesCounts,
        },
      });
    } catch (error) {
      reply.code(500).send({
        success: false,
        error: "Failed to fetch logbook stats",
      });
    }
  });

  // ── GET /logbook/:id — Single entry detail ─────────────────────────

  fastify.get<{
    Params: { id: string };
  }>("/logbook/:id", async (request, reply) => {
    try {
      const userId = parseInt(String(request.user!.sub));
      const entryId = parseInt(request.params.id);

      const entry = await fastify.prisma.logbookEntry.findUnique({
        where: { id: entryId },
        include: {
          load: {
            select: {
              id: true,
              loadNumber: true,
              status: true,
              scheduledAt: true,
            },
          },
          dropzone: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      if (!entry) {
        throw new NotFoundError("Logbook entry");
      }

      if (entry.userId !== userId) {
        reply.code(403).send({
          success: false,
          error: "You do not have access to this logbook entry",
        });
        return;
      }

      reply.send({ success: true, data: entry });
    } catch (error) {
      if (error instanceof NotFoundError) {
        reply.code(404).send({ success: false, error: error.message });
      } else {
        reply.code(500).send({
          success: false,
          error: "Failed to fetch logbook entry",
        });
      }
    }
  });

  // ── POST /logbook — Create new entry ───────────────────────────────

  fastify.post<{
    Body: z.infer<typeof createEntrySchema>;
  }>("/logbook", async (request, reply) => {
    try {
      const userId = parseInt(String(request.user!.sub));
      const dropzoneId = parseInt(request.user!.dropzoneId || "0");
      const body = createEntrySchema.parse(request.body);

      // Validate jumpNumber is unique for this user
      const existing = await fastify.prisma.logbookEntry.findFirst({
        where: { userId, jumpNumber: body.jumpNumber },
      });

      if (existing) {
        throw new ConflictError(
          `Jump number ${body.jumpNumber} already exists in your logbook`
        );
      }

      const createData: any = {
        userId,
        dropzoneId: body.dropzoneId || dropzoneId,
        jumpNumber: body.jumpNumber,
      };
      if (body.altitude !== undefined) createData.altitude = body.altitude;
      if (body.freefallTime !== undefined) createData.freefallTime = body.freefallTime;
      if (body.deploymentAltitude !== undefined) createData.deploymentAltitude = body.deploymentAltitude;
      if (body.canopySize !== undefined) createData.canopySize = body.canopySize;
      if (body.jumpType) createData.jumpType = body.jumpType;
      if (body.disciplines) createData.disciplines = body.disciplines;
      if (body.notes) createData.notes = body.notes;
      if (body.loadId) createData.loadId = body.loadId;

      const entry = await fastify.prisma.logbookEntry.create({
        data: createData,
        include: {
          load: {
            select: {
              id: true,
              loadNumber: true,
              status: true,
            },
          },
        },
      });

      reply.code(201).send({ success: true, data: entry });
    } catch (error) {
      if (error instanceof ConflictError) {
        reply.code(409).send({ success: false, error: error.message });
      } else if (error instanceof z.ZodError) {
        reply.code(400).send({
          success: false,
          error: "Validation failed",
          details: error.errors,
        });
      } else {
        fastify.log.error(error, "Failed to create logbook entry");
        reply.code(500).send({
          success: false,
          error: "Failed to create logbook entry",
          details: (error as Error).message,
        });
      }
    }
  });

  // ── PUT /logbook/:id — Update entry ────────────────────────────────

  fastify.put<{
    Params: { id: string };
    Body: z.infer<typeof updateEntrySchema>;
  }>("/logbook/:id", async (request, reply) => {
    try {
      const userId = parseInt(String(request.user!.sub));
      const entryId = parseInt(request.params.id);
      const body = updateEntrySchema.parse(request.body);

      const entry = await fastify.prisma.logbookEntry.findUnique({
        where: { id: entryId },
      });

      if (!entry) {
        throw new NotFoundError("Logbook entry");
      }

      if (entry.userId !== userId) {
        reply.code(403).send({
          success: false,
          error: "You do not have access to this logbook entry",
        });
        return;
      }

      // If jumpNumber is being changed, check uniqueness
      if (body.jumpNumber && body.jumpNumber !== entry.jumpNumber) {
        const duplicate = await fastify.prisma.logbookEntry.findFirst({
          where: {
            userId,
            jumpNumber: body.jumpNumber,
            id: { not: entryId },
          },
        });

        if (duplicate) {
          throw new ConflictError(
            `Jump number ${body.jumpNumber} already exists in your logbook`
          );
        }
      }

      const updateData: Record<string, any> = {};
      if (body.jumpNumber !== undefined) updateData.jumpNumber = body.jumpNumber;
      if (body.altitude !== undefined) updateData.altitude = body.altitude;
      if (body.freefallTime !== undefined) updateData.freefallTime = body.freefallTime;
      if (body.deploymentAltitude !== undefined) updateData.deploymentAltitude = body.deploymentAltitude;
      if (body.canopySize !== undefined) updateData.canopySize = body.canopySize;
      if (body.jumpType !== undefined) updateData.jumpType = body.jumpType;
      if (body.disciplines !== undefined) updateData.disciplines = body.disciplines;
      if (body.notes !== undefined) updateData.notes = body.notes;
      if (body.loadId !== undefined) updateData.loadId = body.loadId;

      const updated = await fastify.prisma.logbookEntry.update({
        where: { id: entryId },
        data: updateData,
        include: {
          load: {
            select: {
              id: true,
              loadNumber: true,
              status: true,
            },
          },
        },
      });

      reply.send({ success: true, data: updated });
    } catch (error) {
      if (error instanceof NotFoundError) {
        reply.code(404).send({ success: false, error: error.message });
      } else if (error instanceof ConflictError) {
        reply.code(409).send({ success: false, error: error.message });
      } else if (error instanceof z.ZodError) {
        reply.code(400).send({
          success: false,
          error: "Validation failed",
          details: error.errors,
        });
      } else {
        reply.code(500).send({
          success: false,
          error: "Failed to update logbook entry",
        });
      }
    }
  });

  // ── DELETE /logbook/:id — Delete entry ─────────────────────────────

  fastify.delete<{
    Params: { id: string };
  }>("/logbook/:id", async (request, reply) => {
    try {
      const userId = parseInt(String(request.user!.sub));
      const entryId = parseInt(request.params.id);

      const entry = await fastify.prisma.logbookEntry.findUnique({
        where: { id: entryId },
      });

      if (!entry) {
        throw new NotFoundError("Logbook entry");
      }

      if (entry.userId !== userId) {
        reply.code(403).send({
          success: false,
          error: "You do not have access to this logbook entry",
        });
        return;
      }

      await fastify.prisma.logbookEntry.delete({
        where: { id: entryId },
      });

      reply.send({ success: true, data: { id: entryId, deleted: true } });
    } catch (error) {
      if (error instanceof NotFoundError) {
        reply.code(404).send({ success: false, error: error.message });
      } else {
        reply.code(500).send({
          success: false,
          error: "Failed to delete logbook entry",
        });
      }
    }
  });
}
