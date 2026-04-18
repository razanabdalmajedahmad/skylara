import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireAuth } from "../middleware/authenticate";
import { NotFoundError, ValidationError, ForbiddenError } from "../utils/errors";

// Schemas for validation
const createIdeaSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().min(10).max(5000),
  category: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().default("MEDIUM"),
  affectedModule: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
});

const updateIdeaSchema = z.object({
  status: z.enum(["SUBMITTED", "REVIEWED", "PLANNED", "IN_PROGRESS", "COMPLETED", "REJECTED"]).optional(),
  adminNotes: z.string().optional(),
  assignedReviewerId: z.string().uuid().optional(),
});

const listIdeasQuerySchema = z.object({
  status: z.string().optional(),
  category: z.string().optional(),
  priority: z.string().optional(),
  module: z.string().optional(),
});

export async function ideasNotesRoutes(fastify: FastifyInstance) {
  // GET /api/ideas - List ideas (filterable, with auth-based visibility)
  fastify.get<{ Querystring: z.infer<typeof listIdeasQuerySchema> }>(
    "/ideas",
    {
      preHandler: authenticate,
      schema: {
        querystring: {
          type: "object",
          properties: {
            status: { type: "string" },
            category: { type: "string" },
            priority: { type: "string" },
            module: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (!requireAuth(request, reply)) return;

        const query = listIdeasQuerySchema.parse(request.query);
        const userId = request.user.sub;
        const userRoles = request.user.roles || [];
        const isAdmin = userRoles.includes("ADMIN") || userRoles.includes("OPERATOR");

        // Build dynamic where clause
        const where: any = {};
        if (query.status) where.status = query.status;
        if (query.category) where.category = query.category;
        if (query.priority) where.priority = query.priority;
        if (query.module) where.affectedModule = query.module;

        // Visibility: admin/operator see all for their DZ; athlete/staff see own + published
        if (!isAdmin) {
          where.OR = [
            { submittedById: userId },
            { status: "COMPLETED" }, // Public ideas
          ];
        }

        const ideas = await fastify.prisma.ideaNote.findMany({
          where,
          include: {
            submittedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            reviewedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        reply.code(200).send({
          success: true,
          data: {
            ideas,
            count: ideas.length,
          },
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to fetch ideas",
        });
      }
    }
  );

  // POST /api/ideas - Submit new idea
  fastify.post<{ Body: z.infer<typeof createIdeaSchema> }>(
    "/ideas",
    {
      preHandler: authenticate,
      schema: {
        body: {
          type: "object",
          required: ["title", "description", "category"],
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            category: { type: "string" },
            priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
            affectedModule: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (!requireAuth(request, reply)) return;

        const body = createIdeaSchema.parse(request.body);
        const userId = request.user.sub;

        const idea = await fastify.prisma.ideaNote.create({
          data: {
            title: body.title,
            description: body.description,
            category: body.category,
            priority: body.priority,
            affectedModule: body.affectedModule || null,
            tags: body.tags,
            status: "new",
            submittedById: parseInt(String(userId)),
          },
          include: {
            submittedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        reply.code(201).send({
          success: true,
          data: idea,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            success: false,
            error: "Validation failed",
          });
        } else {
          reply.code(500).send({
            success: false,
            error: "Failed to submit idea",
          });
        }
      }
    }
  );

  // GET /api/ideas/:id - Get single idea
  fastify.get<{ Params: { id: string } }>(
    "/ideas/:id",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        if (!requireAuth(request, reply)) return;

        const { id } = request.params;
        const userId = request.user.sub;
        const userRoles = request.user.roles || [];
        const isAdmin = userRoles.includes("ADMIN") || userRoles.includes("OPERATOR");

        const idea = await fastify.prisma.ideaNote.findUnique({
          where: { id },
          include: {
            submittedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            reviewedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        if (!idea) {
          throw new NotFoundError("Idea");
        }

        // Check visibility
        const canView =
          isAdmin || idea.submittedById === parseInt(String(userId)) || idea.status === "done";
        if (!canView) {
          throw new ForbiddenError("You do not have permission to view this idea");
        }

        reply.code(200).send({
          success: true,
          data: idea,
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({
            success: false,
            error: error.message,
          });
        } else if (error instanceof ForbiddenError) {
          reply.code(403).send({
            success: false,
            error: error.message,
          });
        } else {
          reply.code(500).send({
            success: false,
            error: "Failed to fetch idea",
          });
        }
      }
    }
  );

  // PATCH /api/ideas/:id - Update idea (admin: change status, add notes, assign reviewer)
  fastify.patch<{
    Params: { id: string };
    Body: z.infer<typeof updateIdeaSchema>;
  }>(
    "/ideas/:id",
    {
      preHandler: authenticate,
      schema: {
        body: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["SUBMITTED", "REVIEWED", "PLANNED", "IN_PROGRESS", "COMPLETED", "REJECTED"],
            },
            adminNotes: { type: "string" },
            assignedReviewerId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (!requireAuth(request, reply)) return;

        const { id } = request.params;
        const body = updateIdeaSchema.parse(request.body);
        const userId = request.user.sub;
        const userRoles = request.user.roles || [];
        const isAdmin = userRoles.includes("ADMIN") || userRoles.includes("OPERATOR");

        // Only admin can update
        if (!isAdmin) {
          throw new ForbiddenError("Only admins can update ideas");
        }

        const idea = await fastify.prisma.ideaNote.findUnique({
          where: { id },
        });

        if (!idea) {
          throw new NotFoundError("Idea");
        }

        const updatedIdea = await fastify.prisma.ideaNote.update({
          where: { id },
          data: {
            status: body.status || idea.status,
            adminNotes: body.adminNotes !== undefined ? body.adminNotes : idea.adminNotes,
            reviewedById: body.assignedReviewerId ? parseInt(body.assignedReviewerId) : idea.reviewedById,
          },
          include: {
            submittedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            reviewedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        reply.code(200).send({
          success: true,
          data: updatedIdea,
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({
            success: false,
            error: error.message,
          });
        } else if (error instanceof ForbiddenError) {
          reply.code(403).send({
            success: false,
            error: error.message,
          });
        } else if (error instanceof z.ZodError) {
          reply.code(400).send({
            success: false,
            error: "Validation failed",
          });
        } else {
          reply.code(500).send({
            success: false,
            error: "Failed to update idea",
          });
        }
      }
    }
  );

  // DELETE /api/ideas/:id - Soft delete (admin only)
  fastify.delete<{ Params: { id: string } }>(
    "/ideas/:id",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        if (!requireAuth(request, reply)) return;

        const { id } = request.params;
        const userRoles = request.user.roles || [];
        const isAdmin = userRoles.includes("ADMIN") || userRoles.includes("OPERATOR");

        if (!isAdmin) {
          throw new ForbiddenError("Only admins can delete ideas");
        }

        const idea = await fastify.prisma.ideaNote.findUnique({
          where: { id },
        });

        if (!idea) {
          throw new NotFoundError("Idea");
        }

        // Soft delete by setting status to rejected
        const deletedIdea = await fastify.prisma.ideaNote.update({
          where: { id },
          data: {
            status: "rejected",
          },
        });

        reply.code(200).send({
          success: true,
          data: {
            message: "Idea deleted",
            id: deletedIdea.id,
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({
            success: false,
            error: error.message,
          });
        } else if (error instanceof ForbiddenError) {
          reply.code(403).send({
            success: false,
            error: error.message,
          });
        } else {
          reply.code(500).send({
            success: false,
            error: "Failed to delete idea",
          });
        }
      }
    }
  );

  // GET /api/ideas/stats - Counts by status, category (admin only)
  fastify.get(
    "/ideas/stats",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        if (!requireAuth(request, reply)) return;

        const userRoles = request.user.roles || [];
        const isAdmin = userRoles.includes("ADMIN") || userRoles.includes("OPERATOR");

        if (!isAdmin) {
          throw new ForbiddenError("Only admins can view stats");
        }

        // Get stats grouped by status
        const byStatus = await fastify.prisma.ideaNote.groupBy({
          by: ["status"],
          _count: true,
          where: { status: { not: "rejected" } },
        });

        // Get stats grouped by category
        const byCategory = await fastify.prisma.ideaNote.groupBy({
          by: ["category"],
          _count: true,
          where: { status: { not: "rejected" } },
        });

        // Get stats grouped by priority
        const byPriority = await fastify.prisma.ideaNote.groupBy({
          by: ["priority"],
          _count: true,
          where: { status: { not: "rejected" } },
        });

        reply.code(200).send({
          success: true,
          data: {
            byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
            byCategory: Object.fromEntries(byCategory.map((c) => [c.category, c._count])),
            byPriority: Object.fromEntries(byPriority.map((p) => [p.priority, p._count])),
          },
        });
      } catch (error) {
        if (error instanceof ForbiddenError) {
          reply.code(403).send({
            success: false,
            error: error.message,
          });
        } else {
          reply.code(500).send({
            success: false,
            error: "Failed to fetch stats",
          });
        }
      }
    }
  );
}
