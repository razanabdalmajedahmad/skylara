import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import { NotFoundError, ConflictError } from "../utils/errors";
import { AuditService } from "../services/auditService";

// ============================================================================
// COACHING ROUTES — Structured coaching sessions beyond AFF
// ============================================================================

const createSessionSchema = z.object({
  sessionType: z.string(), // AFF, FREEFLY, RW, TRACKING, SWOOPING, CRW, WINGSUIT
  scheduledAt: z.string().datetime().optional(),
  loadId: z.number().int().positive().optional(),
  participantIds: z.array(z.number().int().positive()),
  priceCents: z.number().int().nonnegative().default(0),
  notes: z.string().optional(),
});

const completeSessionSchema = z.object({
  notes: z.string().optional(),
  participants: z.array(z.object({
    userId: z.number().int().positive(),
    evaluationNotes: z.string().optional(),
    passed: z.boolean().optional(),
  })),
});

export async function coachingRoutes(fastify: FastifyInstance) {
  const auditService = new AuditService(fastify.prisma);

  // List coaching sessions
  fastify.get(
    "/coaching/sessions",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const userId = parseInt(String(request.user!.sub));
      const query = request.query as { status?: string; coachId?: string; mine?: string };

      const where: any = { dropzoneId };
      if (query.status) where.status = query.status;
      if (query.coachId) where.coachId = parseInt(query.coachId);
      if (query.mine === "true") {
        where.OR = [
          { coachId: userId },
          { participants: { some: { userId } } },
        ];
      }

      const sessions = await fastify.prisma.coachingSession.findMany({
        where,
        include: {
          coach: { select: { firstName: true, lastName: true } },
          participants: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
          load: { select: { loadNumber: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      reply.send({
        success: true,
        data: sessions.map((s) => ({
          id: s.id,
          sessionType: s.sessionType,
          status: s.status,
          coachName: `${s.coach.firstName} ${s.coach.lastName}`,
          coachId: s.coachId,
          loadNumber: s.load?.loadNumber,
          scheduledAt: s.scheduledAt,
          startedAt: s.startedAt,
          completedAt: s.completedAt,
          priceCents: s.priceCents,
          participantCount: s.participants.length,
          participants: s.participants.map((p) => ({
            userId: p.userId,
            name: `${p.user.firstName} ${p.user.lastName}`,
            passed: p.passed,
            evaluationNotes: p.evaluationNotes,
          })),
          notes: s.notes,
          coachRating: s.coachRating,
        })),
      });
    }
  );

  // Create coaching session
  fastify.post(
    "/coaching/sessions",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["COACH", "TI", "AFFI", "MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const coachId = parseInt(String(request.user!.sub));
      const body = createSessionSchema.parse(request.body);

      const session = await fastify.prisma.coachingSession.create({
        data: {
          dropzoneId,
          coachId,
          sessionType: body.sessionType,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
          loadId: body.loadId,
          priceCents: body.priceCents,
          notes: body.notes,
          status: "SCHEDULED",
          participants: {
            create: body.participantIds.map((uid) => ({ userId: uid })),
          },
        },
        include: {
          participants: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      });

      await auditService.log({
        userId: coachId,
        dropzoneId,
        action: "CREATE",
        entityType: "CoachingSession",
        entityId: session.id,
        afterState: { sessionType: body.sessionType, participants: body.participantIds.length },
      });

      reply.code(201).send({ success: true, data: session });
    }
  );

  // Start session
  fastify.post<{ Params: { sessionId: string } }>(
    "/coaching/sessions/:sessionId/start",
    {
      preHandler: [authenticate, tenantScope, authorize(["COACH", "TI", "AFFI", "DZ_MANAGER"])],
    },
    async (request, reply) => {
      const sessionId = parseInt((request.params as any).sessionId);
      const session = await fastify.prisma.coachingSession.findUnique({ where: { id: sessionId } });
      if (!session) throw new NotFoundError("Coaching session");
      if (session.status !== "SCHEDULED") throw new ConflictError("Session not in SCHEDULED state");

      const updated = await fastify.prisma.coachingSession.update({
        where: { id: sessionId },
        data: { status: "ACTIVE", startedAt: new Date() },
      });

      reply.send({ success: true, data: updated });
    }
  );

  // Complete session with evaluations
  fastify.post<{ Params: { sessionId: string } }>(
    "/coaching/sessions/:sessionId/complete",
    {
      preHandler: [authenticate, tenantScope, authorize(["COACH", "TI", "AFFI", "DZ_MANAGER"])],
    },
    async (request, reply) => {
      const sessionId = parseInt((request.params as any).sessionId);
      const body = completeSessionSchema.parse(request.body);

      const session = await fastify.prisma.coachingSession.findUnique({ where: { id: sessionId } });
      if (!session) throw new NotFoundError("Coaching session");
      if (session.status !== "ACTIVE" && session.status !== "SCHEDULED") {
        throw new ConflictError("Session not in ACTIVE or SCHEDULED state");
      }

      // Update participant evaluations
      for (const p of body.participants) {
        await fastify.prisma.coachingParticipant.updateMany({
          where: { sessionId, userId: p.userId },
          data: { evaluationNotes: p.evaluationNotes, passed: p.passed },
        });
      }

      const updated = await fastify.prisma.coachingSession.update({
        where: { id: sessionId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          notes: body.notes || session.notes,
        },
        include: {
          participants: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      });

      await auditService.log({
        userId: parseInt(String(request.user!.sub)),
        dropzoneId: session.dropzoneId,
        action: "UPDATE",
        entityType: "CoachingSession",
        entityId: sessionId,
        afterState: { status: "COMPLETED", participants: body.participants.length },
      });

      reply.send({ success: true, data: updated });
    }
  );

  // Rate session (student rates the coach)
  fastify.post<{ Params: { sessionId: string } }>(
    "/coaching/sessions/:sessionId/rate",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const sessionId = parseInt((request.params as any).sessionId);
      const body = request.body as { rating: number; feedback?: string };

      if (!body.rating || body.rating < 1 || body.rating > 5) {
        reply.code(400).send({ success: false, error: "Rating must be 1-5" });
        return;
      }

      const updated = await fastify.prisma.coachingSession.update({
        where: { id: sessionId },
        data: { coachRating: body.rating },
      });

      reply.send({ success: true, data: { sessionId, rating: updated.coachRating } });
    }
  );
}
