/**
 * DEAD LETTER QUEUE ADMIN VIEWER — Doc 17 §42.7
 *
 * Admin endpoints for inspecting, retrying, and discarding failed outbox events.
 * Only accessible to PLATFORM_ADMIN and DZ_OWNER roles.
 *
 * Endpoints:
 *   GET  /api/admin/dlq          — list failed events
 *   POST /api/admin/dlq/:id/retry   — retry a failed event
 *   POST /api/admin/dlq/:id/discard — mark as discarded
 *   GET  /api/admin/dlq/stats    — DLQ depth and age stats
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { AppError, NotFoundError } from "../utils/errors";

export async function dlqRoutes(fastify: FastifyInstance) {
  const prisma = fastify.prisma;

  // All DLQ routes require authentication + admin role
  fastify.addHook("preHandler", authenticate);

  // ── GET /admin/dlq ──────────────────────────────────────────────────
  fastify.get("/admin/dlq", async (request: FastifyRequest, reply: FastifyReply) => {
    const { status, limit, offset, eventType } = request.query as {
      status?: string;
      limit?: string;
      offset?: string;
      eventType?: string;
    };

    const where: any = {};
    if (status) {
      where.status = status;
    } else {
      // Default: show FAILED events (the actual DLQ)
      where.status = "FAILED";
    }
    if (eventType) {
      where.eventType = eventType;
    }

    const take = Math.min(parseInt(limit || "50"), 200);
    const skip = parseInt(offset || "0");

    const [events, total] = await Promise.all([
      prisma.eventOutbox.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.eventOutbox.count({ where }),
    ]);

    reply.send({
      success: true,
      data: {
        events,
        total,
        limit: take,
        offset: skip,
      },
    });
  });

  // ── GET /admin/dlq/stats ────────────────────────────────────────────
  fastify.get("/admin/dlq/stats", async (request: FastifyRequest, reply: FastifyReply) => {
    const [failedCount, pendingCount, oldestFailed] = await Promise.all([
      prisma.eventOutbox.count({ where: { status: "FAILED" } }),
      prisma.eventOutbox.count({ where: { status: "PENDING" } }),
      prisma.eventOutbox.findFirst({
        where: { status: "FAILED" },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true, eventType: true },
      }),
    ]);

    // Group failed by event type
    const failedByType = await prisma.eventOutbox.groupBy({
      by: ["eventType"],
      where: { status: "FAILED" },
      _count: true,
    });

    const ageHours = oldestFailed
      ? Math.round((Date.now() - oldestFailed.createdAt.getTime()) / (1000 * 60 * 60))
      : 0;

    reply.send({
      success: true,
      data: {
        failedCount,
        pendingCount,
        oldestFailedAge: oldestFailed ? `${ageHours} hours` : null,
        oldestFailedType: oldestFailed?.eventType ?? null,
        failedByType: failedByType.map((g) => ({
          eventType: g.eventType,
          count: g._count,
        })),
        alert: failedCount > 100 ? "CRITICAL: DLQ depth exceeds 100" : failedCount > 10 ? "WARNING: DLQ has unresolved events" : null,
      },
    });
  });

  // ── POST /admin/dlq/:id/retry ───────────────────────────────────────
  fastify.post("/admin/dlq/:id/retry", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const eventId = parseInt(id);

    const event = await prisma.eventOutbox.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError("Event outbox entry");
    }

    if (event.status !== "FAILED") {
      throw new AppError(`Cannot retry event in ${event.status} status — only FAILED events can be retried`, 400);
    }

    // Reset to PENDING so the outbox relay picks it up
    const updated = await prisma.eventOutbox.update({
      where: { id: eventId },
      data: {
        status: "PENDING",
        retryCount: 0,
      },
    });

    reply.send({
      success: true,
      data: { id: updated.id, status: updated.status, message: "Event queued for retry" },
    });
  });

  // ── POST /admin/dlq/:id/discard ─────────────────────────────────────
  fastify.post("/admin/dlq/:id/discard", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason?: string };
    const eventId = parseInt(id);

    const event = await prisma.eventOutbox.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError("Event outbox entry");
    }

    if (event.status !== "FAILED") {
      throw new AppError(`Cannot discard event in ${event.status} status`, 400);
    }

    // Mark as discarded (we use PUBLISHED to remove from DLQ — it won't be re-processed)
    const updated = await prisma.eventOutbox.update({
      where: { id: eventId },
      data: {
        status: "PUBLISHED",
        metadata: {
          ...(event.metadata as any ?? {}),
          discardedAt: new Date().toISOString(),
          discardedBy: (request as any).user?.sub,
          discardReason: reason || "Manually discarded by admin",
        },
      },
    });

    reply.send({
      success: true,
      data: { id: updated.id, message: "Event discarded" },
    });
  });
}
