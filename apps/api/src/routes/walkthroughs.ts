import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireAuth } from "../middleware/authenticate";
import { NotFoundError } from "../utils/errors";

export async function walkthroughsRoutes(fastify: FastifyInstance) {
  // GET /api/tours - List available tours for current user role
  fastify.get(
    "/tours",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        if (!requireAuth(request, reply)) return;

        const userRoles = request.user.roles || [];
        const primaryRole = userRoles[0] || "ATHLETE";

        // Get tours applicable to user's role
        const tours = await fastify.prisma.guidedTour.findMany({
          where: {
            isActive: true,
            role: primaryRole,
          },
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            role: true,
            sortOrder: true,
            createdAt: true,
            steps: {
              select: { id: true },
            },
          },
          orderBy: { sortOrder: "asc" },
        });

        reply.code(200).send({
          success: true,
          data: {
            tours: tours.map((t) => ({
              ...t,
              stepCount: t.steps.length,
              steps: undefined,
            })),
            count: tours.length,
          },
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to fetch tours",
        });
      }
    }
  );

  // GET /api/tours/:slug - Get tour with all steps
  fastify.get<{ Params: { slug: string } }>(
    "/tours/:slug",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        if (!requireAuth(request, reply)) return;

        const { slug } = request.params;
        const userId = parseInt(String(request.user.sub));

        const tour = await fastify.prisma.guidedTour.findUnique({
          where: { slug },
          include: {
            steps: {
              orderBy: { stepNumber: "asc" },
              select: {
                id: true,
                stepNumber: true,
                title: true,
                description: true,
                targetSelector: true,
                position: true,
                route: true,
                action: true,
                helpArticleSlug: true,
              },
            },
          },
        });

        if (!tour) {
          throw new NotFoundError("Tour");
        }

        // Get user progress separately
        const progress = await fastify.prisma.userTourProgress.findUnique({
          where: { userId_tourId: { userId, tourId: tour.id } },
        });

        reply.code(200).send({
          success: true,
          data: {
            ...tour,
            userProgress: progress || null,
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
            error: "Failed to fetch tour",
          });
        }
      }
    }
  );

  // GET /api/tours/progress - Get user's tour completion progress
  fastify.get(
    "/tours/progress",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        if (!requireAuth(request, reply)) return;

        const userId = parseInt(String(request.user.sub));

        const progress = await fastify.prisma.userTourProgress.findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" },
        });

        reply.code(200).send({
          success: true,
          data: {
            progress,
            count: progress.length,
          },
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to fetch progress",
        });
      }
    }
  );

  // POST /api/tours/:slug/progress - Update progress
  fastify.post<{
    Params: { slug: string };
    Body: { stepId: string; completed?: boolean };
  }>(
    "/tours/:slug/progress",
    {
      preHandler: authenticate,
      schema: {
        body: {
          type: "object",
          properties: {
            stepId: { type: "string" },
            completed: { type: "boolean" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (!requireAuth(request, reply)) return;

        const { slug } = request.params;
        const body = request.body as { stepId?: string; completed?: boolean };
        const userId = parseInt(String(request.user.sub));

        // Find tour
        const tour = await fastify.prisma.guidedTour.findUnique({
          where: { slug },
          select: { id: true },
        });

        if (!tour) {
          throw new NotFoundError("Tour");
        }

        // Upsert progress record
        const progress = await fastify.prisma.userTourProgress.upsert({
          where: { userId_tourId: { userId, tourId: tour.id } },
          update: {
            lastStepId: body.stepId || null,
            completed: body.completed || false,
            completedAt: body.completed ? new Date() : null,
          },
          create: {
            userId,
            tourId: tour.id,
            lastStepId: body.stepId || null,
            completed: body.completed || false,
            completedAt: body.completed ? new Date() : null,
          },
        });

        reply.code(200).send({
          success: true,
          data: progress,
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
            error: "Failed to update progress",
          });
        }
      }
    }
  );

  // POST /api/tours/:slug/restart - Restart a tour
  fastify.post<{ Params: { slug: string } }>(
    "/tours/:slug/restart",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        if (!requireAuth(request, reply)) return;

        const { slug } = request.params;
        const userId = parseInt(String(request.user.sub));

        const tour = await fastify.prisma.guidedTour.findUnique({
          where: { slug },
          select: { id: true },
        });

        if (!tour) {
          throw new NotFoundError("Tour");
        }

        // Reset progress
        const progress = await fastify.prisma.userTourProgress.upsert({
          where: { userId_tourId: { userId, tourId: tour.id } },
          update: {
            lastStepId: null,
            completed: false,
            completedAt: null,
            dismissedAt: null,
          },
          create: {
            userId,
            tourId: tour.id,
            completed: false,
          },
        });

        reply.code(200).send({
          success: true,
          data: {
            message: "Tour restarted",
            progress,
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
            error: "Failed to restart tour",
          });
        }
      }
    }
  );

  // POST /api/tours/:slug/complete - Mark tour as completed
  fastify.post<{ Params: { slug: string } }>(
    "/tours/:slug/complete",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        if (!requireAuth(request, reply)) return;

        const { slug } = request.params;
        const userId = parseInt(String(request.user.sub));

        const tour = await fastify.prisma.guidedTour.findUnique({
          where: { slug },
          select: { id: true },
        });

        if (!tour) {
          throw new NotFoundError("Tour");
        }

        const progress = await fastify.prisma.userTourProgress.upsert({
          where: { userId_tourId: { userId, tourId: tour.id } },
          update: {
            completed: true,
            completedAt: new Date(),
          },
          create: {
            userId,
            tourId: tour.id,
            completed: true,
            completedAt: new Date(),
          },
        });

        reply.code(200).send({
          success: true,
          data: {
            message: "Tour completed",
            progress,
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
            error: "Failed to complete tour",
          });
        }
      }
    }
  );

  // POST /api/tours/:slug/dismiss - Dismiss a tour
  fastify.post<{ Params: { slug: string } }>(
    "/tours/:slug/dismiss",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        if (!requireAuth(request, reply)) return;

        const { slug } = request.params;
        const userId = parseInt(String(request.user.sub));

        const tour = await fastify.prisma.guidedTour.findUnique({
          where: { slug },
          select: { id: true },
        });

        if (!tour) {
          throw new NotFoundError("Tour");
        }

        const progress = await fastify.prisma.userTourProgress.upsert({
          where: { userId_tourId: { userId, tourId: tour.id } },
          update: {
            dismissedAt: new Date(),
          },
          create: {
            userId,
            tourId: tour.id,
            dismissedAt: new Date(),
          },
        });

        reply.code(200).send({
          success: true,
          data: {
            message: "Tour dismissed",
            progress,
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
            error: "Failed to dismiss tour",
          });
        }
      }
    }
  );
}
