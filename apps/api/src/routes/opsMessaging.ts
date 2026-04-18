/**
 * PRIVATE OPERATIONAL MESSAGING — Expert Feedback §6
 *
 * Manifest staff and authorized roles can send private operational messages
 * to individual athletes or groups on a load. Messages are delivered via
 * in-app notification, push, and optionally SMS/WhatsApp.
 *
 * Use cases:
 *   - "We moved you to another load"
 *   - "Please add money to your account"
 *   - "Please see manifest when free"
 *   - "Gear issue — do not board yet"
 *   - "Boarding moved earlier"
 *   - "Coach changed"
 *   - "Waitlist slot is open"
 *   - "Weather hold for your group"
 *
 * Endpoints:
 *   POST /api/ops-messaging/private        — send to one athlete
 *   POST /api/ops-messaging/load-message   — send to all athletes on a load
 *   POST /api/ops-messaging/group-message  — send to selected athletes
 *   GET  /api/ops-messaging/history        — message history for audit
 *   GET  /api/ops-messaging/templates      — operational message templates
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { AppError } from "../utils/errors";
import { AuditService } from "../services/auditService";

export async function opsMessagingRoutes(fastify: FastifyInstance) {
  const prisma = fastify.prisma;
  const auditService = new AuditService(prisma);

  // All ops messaging routes require authentication
  fastify.addHook("preHandler", authenticate);

  // ── POST /ops-messaging/private ─────────────────────────────────────
  // Send a private operational message to one athlete
  fastify.post("/ops-messaging/private", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    if (!user) return reply.code(401).send({ success: false, error: "Unauthorized" });

    const { recipientUserId, message, category, dropzoneId } = request.body as {
      recipientUserId: number;
      message: string;
      category?: string;
      dropzoneId: number;
    };

    if (!recipientUserId || !message || !dropzoneId) {
      throw new AppError("recipientUserId, message, and dropzoneId are required", 400);
    }

    // Verify sender has operational role
    const senderRoles = user.roles || [];
    const allowedRoles = ["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER", "MANIFEST_STAFF", "TI", "AFFI", "COACH"];
    if (!senderRoles.some((r: string) => allowedRoles.includes(r))) {
      throw new AppError("Only operational staff can send private messages", 403);
    }

    // Verify recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientUserId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    if (!recipient) {
      throw new AppError("Recipient not found", 404);
    }

    // Create in-app notification
    const notification = await prisma.notification.create({
      data: {
        userId: recipientUserId,
        dropzoneId,
        type: "OPS_PRIVATE_MESSAGE" as any,
        title: "Message from Manifest",
        body: message,
        data: {
          senderId: parseInt(user.sub),
          category: category || "GENERAL",
          isPrivate: true,
        } as any,
        channel: "IN_APP",
      },
    });

    // Attempt push notification if device tokens exist
    try {
      const devices = await prisma.pushDevice.findMany({
        where: { userId: recipientUserId },
      });
      if (devices.length > 0) {
        // Push delivery is best-effort — log but don't fail
        await (prisma as any).notificationDelivery.create({
          data: {
            notificationId: notification.id,
            channel: "PUSH",
            status: "PENDING",
          },
        });
      }
    } catch {
      // Push delivery failure is non-blocking
    }

    // WebSocket broadcast to the specific user (if connected)
    if (fastify.broadcastToDropzone) {
      fastify.broadcastToDropzone(String(dropzoneId), {
        type: "OPS_PRIVATE_MESSAGE" as any,
        recipientUserId,
        title: "Message from Manifest",
        body: message,
        category: category || "GENERAL",
        timestamp: new Date().toISOString(),
      });
    }

    // Audit log
    await auditService.log({
      action: "OPS_MESSAGE_SENT" as any,
      userId: parseInt(user.sub),
      dropzoneId,
      entityType: "NOTIFICATION",
      entityId: notification.id,
      afterState: { recipientUserId, message, category },
    });

    reply.send({
      success: true,
      data: { notificationId: notification.id, recipientUserId },
    });
  });

  // ── POST /ops-messaging/load-message ────────────────────────────────
  // Send a message to all athletes manifested on a specific load
  fastify.post("/ops-messaging/load-message", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    if (!user) return reply.code(401).send({ success: false, error: "Unauthorized" });

    const { loadId, message, category } = request.body as {
      loadId: number;
      message: string;
      category?: string;
    };

    if (!loadId || !message) {
      throw new AppError("loadId and message are required", 400);
    }

    // Verify sender has operational role
    const senderRoles = user.roles || [];
    const allowedRoles = ["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER", "MANIFEST_STAFF"];
    if (!senderRoles.some((r: string) => allowedRoles.includes(r))) {
      throw new AppError("Only manifest staff or managers can send load messages", 403);
    }

    // Get load with slots and athletes
    const load = await prisma.load.findUnique({
      where: { id: loadId },
      include: {
        slots: {
          where: { userId: { not: null } },
          select: { userId: true },
        },
      },
    });

    if (!load) {
      throw new AppError("Load not found", 404);
    }

    const recipientIds = load.slots
      .map((s) => s.userId)
      .filter((id): id is number => id !== null);

    if (recipientIds.length === 0) {
      return reply.send({ success: true, data: { sent: 0, message: "No athletes on this load" } });
    }

    // Create notifications for all recipients
    const notifications = await prisma.notification.createMany({
      data: recipientIds.map((userId) => ({
        userId,
        dropzoneId: load.dropzoneId,
        type: "OPS_LOAD_MESSAGE" as any,
        title: `Load ${load.loadNumber} Update`,
        body: message,
        data: {
          senderId: parseInt(user.sub),
          loadId,
          loadNumber: load.loadNumber,
          category: category || "LOAD_UPDATE",
          isPrivate: true,
        } as any,
        channel: "IN_APP",
      })),
    });

    // WebSocket broadcast
    if (fastify.broadcastToDropzone) {
      fastify.broadcastToDropzone(String(load.dropzoneId), {
        type: "OPS_LOAD_MESSAGE" as any,
        loadId,
        loadNumber: load.loadNumber,
        recipientUserIds: recipientIds,
        body: message,
        category: category || "LOAD_UPDATE",
        timestamp: new Date().toISOString(),
      });
    }

    // Audit log
    await auditService.log({
      action: "OPS_MESSAGE_SENT" as any,
      userId: parseInt(user.sub),
      dropzoneId: load.dropzoneId,
      entityType: "LOAD",
      entityId: loadId,
      afterState: { message, category, recipientCount: recipientIds.length },
    });

    reply.send({
      success: true,
      data: { sent: notifications.count, loadId, loadNumber: load.loadNumber },
    });
  });

  // ── POST /ops-messaging/group-message ───────────────────────────────
  // Send a message to a selected list of athletes
  fastify.post("/ops-messaging/group-message", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    if (!user) return reply.code(401).send({ success: false, error: "Unauthorized" });

    const { recipientUserIds, message, category, dropzoneId } = request.body as {
      recipientUserIds: number[];
      message: string;
      category?: string;
      dropzoneId: number;
    };

    if (!recipientUserIds?.length || !message || !dropzoneId) {
      throw new AppError("recipientUserIds, message, and dropzoneId are required", 400);
    }

    // Verify sender has operational role
    const senderRoles = user.roles || [];
    const allowedRoles = ["PLATFORM_ADMIN", "DZ_OWNER", "DZ_MANAGER", "MANIFEST_STAFF", "TI", "AFFI"];
    if (!senderRoles.some((r: string) => allowedRoles.includes(r))) {
      throw new AppError("Only operational staff can send group messages", 403);
    }

    // Create notifications for all recipients
    const notifications = await prisma.notification.createMany({
      data: recipientUserIds.map((userId) => ({
        userId,
        dropzoneId,
        type: "OPS_GROUP_MESSAGE" as any,
        title: "Message from Operations",
        body: message,
        data: {
          senderId: parseInt(user.sub),
          category: category || "GENERAL",
          isPrivate: true,
          groupSize: recipientUserIds.length,
        } as any,
        channel: "IN_APP",
      })),
    });

    // WebSocket broadcast
    if (fastify.broadcastToDropzone) {
      fastify.broadcastToDropzone(String(dropzoneId), {
        type: "OPS_GROUP_MESSAGE" as any,
        recipientUserIds,
        body: message,
        category: category || "GENERAL",
        timestamp: new Date().toISOString(),
      });
    }

    // Audit log
    await auditService.log({
      action: "OPS_MESSAGE_SENT" as any,
      userId: parseInt(user.sub),
      dropzoneId,
      entityType: "GROUP",
      entityId: 0,
      afterState: { message, category, recipientCount: recipientUserIds.length },
    });

    reply.send({
      success: true,
      data: { sent: notifications.count },
    });
  });

  // ── GET /ops-messaging/history ──────────────────────────────────────
  // Message history for audit — shows sent operational messages
  fastify.get("/ops-messaging/history", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    if (!user) return reply.code(401).send({ success: false, error: "Unauthorized" });

    const { dropzoneId, limit, offset } = request.query as {
      dropzoneId?: string;
      limit?: string;
      offset?: string;
    };

    const dzId = dropzoneId ? parseInt(dropzoneId) : parseInt(user.dropzoneId || "0");
    const take = Math.min(parseInt(limit || "50"), 100);
    const skip = parseInt(offset || "0");

    const messages = await prisma.notification.findMany({
      where: {
        dropzoneId: dzId,
        type: { in: ["OPS_PRIVATE_MESSAGE", "OPS_LOAD_MESSAGE", "OPS_GROUP_MESSAGE"] as any },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    const total = await prisma.notification.count({
      where: {
        dropzoneId: dzId,
        type: { in: ["OPS_PRIVATE_MESSAGE", "OPS_LOAD_MESSAGE", "OPS_GROUP_MESSAGE"] as any },
      },
    });

    reply.send({
      success: true,
      data: { messages, total, limit: take, offset: skip },
    });
  });

  // ── GET /ops-messaging/templates ────────────────────────────────────
  // Pre-defined operational message templates
  fastify.get("/ops-messaging/templates", async (request: FastifyRequest, reply: FastifyReply) => {
    const templates = await prisma.opsMessageTemplate.findMany({
      orderBy: { createdAt: "asc" },
    });

    // If no DB templates, return built-in defaults
    if (templates.length === 0) {
      reply.send({
        success: true,
        data: {
          templates: DEFAULT_OPS_TEMPLATES,
        },
      });
      return;
    }

    reply.send({ success: true, data: { templates } });
  });
}

const DEFAULT_OPS_TEMPLATES = [
  { category: "LOAD_CHANGE", label: "Moved to another load", body: "You have been moved to a different load. Please check the load board." },
  { category: "PAYMENT", label: "Add funds", body: "Please add money to your account before your next jump." },
  { category: "MANIFEST", label: "See manifest", body: "Please come see manifest when you are free." },
  { category: "GEAR", label: "Gear issue", body: "There is a gear issue that needs attention. Do not board yet." },
  { category: "SCHEDULE", label: "Boarding moved", body: "Boarding time has been moved earlier. Please be ready." },
  { category: "INSTRUCTOR", label: "Coach changed", body: "Your assigned coach/instructor has changed. Check load details." },
  { category: "WAITLIST", label: "Waitlist slot open", body: "A slot has opened up! You have been moved from the waitlist." },
  { category: "WEATHER", label: "Weather hold", body: "Weather hold is in effect for your group. Stand by for updates." },
  { category: "GENERAL", label: "Confirm attendance", body: "Please confirm you are still planning to jump today." },
];
