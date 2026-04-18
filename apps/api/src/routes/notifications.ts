import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import { NotFoundError } from "../utils/errors";
import { AuditService } from "../services/auditService";

const broadcastSchema = z.object({
  message: z.string(),
  type: z.string().optional(),
  targetRole: z.string().optional(),
});

export async function notificationsRoutes(fastify: FastifyInstance) {
  const auditService = new AuditService(fastify.prisma);

  // Get user notifications
  fastify.get<{
    Querystring: { limit?: string; offset?: string };
  }>(
    "/notifications",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const limit = Math.min(parseInt(request.query.limit || "50"), 100);
        const offset = parseInt(request.query.offset || "0");

        const notifications = await fastify.prisma.notification.findMany({
          where: {
            userId: parseInt(String(request.user.sub)),
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        });

        reply.code(200).send({
          success: true,
          data: notifications.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            type: n.type,
            channel: n.channel,
            status: n.status,
            readAt: n.readAt,
            createdAt: n.createdAt,
          })),
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to fetch notifications",
        });
      }
    }
  );

  // Mark notification as read
  fastify.patch<{
    Params: { id: string };
  }>(
    "/notifications/:id/read",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const params = request.params as { id: string };
        const notificationId = parseInt(params.id);
        const notification = await fastify.prisma.notification.findFirst({
          where: {
            id: notificationId,
            userId: parseInt(String(request.user.sub)),
          },
        });

        if (!notification) {
          throw new NotFoundError("Notification");
        }

        const updated = await fastify.prisma.notification.update({
          where: { id: notificationId },
          data: {
            readAt: new Date(),
            status: "READ",
          },
        });

        reply.code(200).send({
          success: true,
          data: {
            notificationId: updated.id,
            readAt: updated.readAt,
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
            error: "Failed to mark notification as read",
          });
        }
      }
    }
  );

  // Broadcast notification to all users (admin only)
  fastify.post<{
    Body: z.infer<typeof broadcastSchema>;
  }>(
    "/notifications/broadcast",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["ADMIN", "OPERATOR"]),
      ],
      schema: {
        body: {
          type: "object",
          required: ["message"],
          properties: {
            message: { type: "string" },
            type: { type: "string" },
            targetRole: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          throw new NotFoundError("User");
        }

        const body = broadcastSchema.parse(request.body);

        const dropzoneId = request.user?.dropzoneId ? parseInt(request.user.dropzoneId, 10) : null;
        if (!dropzoneId) {
          throw new NotFoundError("Dropzone");
        }

        // Get users to notify
        const userQuery: any = {
          userRoles: {
            some: { dropzoneId },
          },
        };

        if (body.targetRole) {
          userQuery.userRoles.some.role = {
            name: body.targetRole,
          };
        }

        const users = await fastify.prisma.user.findMany({
          where: userQuery,
          select: { id: true },
        });

        // Create notifications for all users
        const notifications = await fastify.prisma.notification.createMany({
          data: users.map((user) => ({
            userId: user.id,
            dropzoneId,
            title: body.type || "Notification",
            body: body.message,
            type: (body.type || "EMERGENCY_ALERT") as any,
            channel: "IN_APP",
            status: "PENDING",
          })) as any,
        });

        await auditService.log({
          userId: parseInt(String(request.user.sub)),
          dropzoneId,
          action: "CREATE",
          entityType: "Notification",
          entityId: dropzoneId,
          afterState: { recipientCount: users.length, message: body.message },
        });

        // Broadcast via WebSocket
        fastify.broadcastToDropzone(dropzoneId.toString(), {
          type: "NOTIFICATION",
          data: {
            title: body.type || "Notification",
            body: body.message,
            sentAt: new Date(),
          },
        });

        reply.code(201).send({
          success: true,
          data: {
            recipientsCount: users.length,
            notificationsCreated: notifications.count,
          },
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to broadcast notification",
        });
      }
    }
  );

  // ========================================================================
  // PRIVATE OPS MESSAGING — Expert Feedback §6
  // Staff→athlete private operational messages
  // ========================================================================

  const privateMessageSchema = z.object({
    recipientUserId: z.number().int().positive(),
    templateKey: z.string().optional(),
    title: z.string().min(1).max(255).optional(),
    body: z.string().min(1).max(1000).optional(),
    channel: z.enum(["IN_APP", "PUSH", "SMS", "EMAIL"]).default("IN_APP"),
  });

  // POST /notifications/private — Send private ops message to one athlete
  fastify.post<{ Body: z.infer<typeof privateMessageSchema> }>(
    "/notifications/private",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const senderId = parseInt((request as any).user?.sub ?? "0");
        const dropzoneId = parseInt((request as any).user?.dropzoneId ?? "0");
        const body = privateMessageSchema.parse(request.body);

        let title = body.title ?? "Message from Manifest";
        let messageBody = body.body ?? "";

        // If templateKey, look up template
        if (body.templateKey) {
          const template = await (fastify.prisma as any).opsMessageTemplate?.findFirst({
            where: { key: body.templateKey, OR: [{ dropzoneId }, { dropzoneId: null }] },
          });
          if (template) {
            title = template.title;
            messageBody = messageBody || template.body;
          }
        }

        if (!messageBody) {
          reply.code(400).send({ success: false, error: "Message body required (or use a templateKey)" });
          return;
        }

        const notification = await fastify.prisma.notification.create({
          data: {
            userId: body.recipientUserId,
            dropzoneId,
            type: "ANNOUNCEMENT" as any,
            channel: body.channel as any,
            title,
            body: messageBody,
            data: { senderUserId: senderId, isOpsMessage: true, templateKey: body.templateKey },
            status: "PENDING",
          },
        });

        // Broadcast via WebSocket for instant delivery
        fastify.broadcastToDropzone?.(dropzoneId.toString(), {
          type: "OPS_MESSAGE",
          data: { notificationId: notification.id, recipientUserId: body.recipientUserId, title },
        });

        await auditService.log({
          userId: senderId,
          dropzoneId,
          action: "CREATE" as any,
          entityType: "OpsMessage",
          entityId: notification.id,
          afterState: { recipientUserId: body.recipientUserId, title, channel: body.channel },
        });

        reply.code(201).send({ success: true, data: notification });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to send private message" });
      }
    }
  );

  // POST /notifications/load-message — Send ops message to everyone on a load
  fastify.post<{ Body: { loadId: number; title?: string; body: string; channel?: string } }>(
    "/notifications/load-message",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const senderId = parseInt((request as any).user?.sub ?? "0");
        const dropzoneId = parseInt((request as any).user?.dropzoneId ?? "0");
        const { loadId, title, body: msgBody, channel } = request.body;

        const load = await fastify.prisma.load.findFirst({
          where: { id: loadId, dropzoneId },
          include: { slots: { select: { userId: true } } },
        });
        if (!load) {
          reply.code(404).send({ success: false, error: "Load not found" });
          return;
        }

        const recipientIds = load.slots.filter((s) => s.userId).map((s) => s.userId!);
        const notifications = [];

        for (const recipientId of recipientIds) {
          const n = await fastify.prisma.notification.create({
            data: {
              userId: recipientId,
              dropzoneId,
              type: "ANNOUNCEMENT" as any,
              channel: (channel ?? "IN_APP") as any,
              title: title ?? `Load ${load.loadNumber} Update`,
              body: msgBody,
              data: { senderUserId: senderId, isOpsMessage: true, loadId },
              status: "PENDING",
            },
          });
          notifications.push(n);
        }

        fastify.broadcastToDropzone?.(dropzoneId.toString(), {
          type: "LOAD_OPS_MESSAGE",
          data: { loadId, title: title ?? `Load ${load.loadNumber} Update`, recipientCount: recipientIds.length },
        });

        reply.code(201).send({ success: true, data: { sent: notifications.length, loadId } });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to send load message" });
      }
    }
  );

  // GET /notifications/ops-templates — list available ops message templates
  fastify.get(
    "/notifications/ops-templates",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        const dropzoneId = parseInt((request as any).user?.dropzoneId ?? "0");
        const templates = await (fastify.prisma as any).opsMessageTemplate?.findMany({
          where: { isActive: true, OR: [{ dropzoneId }, { dropzoneId: null }] },
          orderBy: { key: "asc" },
        }) ?? [];
        reply.send({ success: true, data: { templates } });
      } catch {
        reply.code(500).send({ success: false, error: "Failed to fetch templates" });
      }
    }
  );

  // ========== PUSH TOKEN MANAGEMENT ==========

  // Register push token (mobile Expo or web VAPID)
  fastify.post<{
    Body: { token: string; platform: string; deviceName?: string; appVersion?: string };
  }>(
    "/notifications/push-token",
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const userId = (request as any).user?.id;
        if (!userId) throw new NotFoundError("User");

        const { token, platform, deviceName, appVersion } = request.body;

        if (!token || !["IOS", "ANDROID", "WEB"].includes(platform)) {
          return reply.code(400).send({
            success: false,
            error: "token (string) and platform (IOS|ANDROID|WEB) are required",
          });
        }

        // Upsert: if token exists for this user, update; if for another user, reassign
        const existing = await (fastify.prisma as any).pushDevice.findFirst({
          where: { pushToken: token },
        });

        if (existing) {
          await (fastify.prisma as any).pushDevice.update({
            where: { id: existing.id },
            data: {
              userId,
              platform,
              deviceName: deviceName || existing.deviceName,
              appVersion: appVersion || existing.appVersion,
              active: true,
              lastSeenAt: new Date(),
            },
          });
        } else {
          await (fastify.prisma as any).pushDevice.create({
            data: {
              userId,
              platform,
              pushToken: token,
              deviceName,
              appVersion,
              active: true,
              lastSeenAt: new Date(),
            },
          });
        }

        reply.send({ success: true });
      } catch (err: any) {
        fastify.log.error({ err }, "Failed to register push token");
        reply.code(500).send({ success: false, error: "Failed to register push token" });
      }
    }
  );

  // Alias for mobile app compatibility (posts to /jumpers/me/push-token)
  fastify.post<{
    Body: { token: string; platform: string; deviceName?: string; appVersion?: string };
  }>(
    "/jumpers/me/push-token",
    { preHandler: authenticate },
    async (request, reply) => {
      // Delegate to the same handler
      const userId = (request as any).user?.id;
      if (!userId) throw new NotFoundError("User");

      const { token, platform, deviceName, appVersion } = request.body;

      if (!token || !["IOS", "ANDROID", "WEB"].includes(platform)) {
        return reply.code(400).send({
          success: false,
          error: "token (string) and platform (IOS|ANDROID|WEB) are required",
        });
      }

      const existing = await (fastify.prisma as any).pushDevice.findFirst({
        where: { pushToken: token },
      });

      if (existing) {
        await (fastify.prisma as any).pushDevice.update({
          where: { id: existing.id },
          data: { userId, platform, deviceName, appVersion, active: true, lastSeenAt: new Date() },
        });
      } else {
        await (fastify.prisma as any).pushDevice.create({
          data: { userId, platform, pushToken: token, deviceName, appVersion, active: true, lastSeenAt: new Date() },
        });
      }

      reply.send({ success: true });
    }
  );

  // Unregister push token (logout / app uninstall)
  fastify.delete<{
    Body: { token: string };
  }>(
    "/notifications/push-token",
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const userId = (request as any).user?.id;
        if (!userId) throw new NotFoundError("User");

        const { token } = request.body;
        if (!token) {
          return reply.code(400).send({ success: false, error: "token is required" });
        }

        await (fastify.prisma as any).pushDevice.updateMany({
          where: { userId, pushToken: token },
          data: { active: false },
        });

        reply.send({ success: true });
      } catch (err: any) {
        fastify.log.error({ err }, "Failed to unregister push token");
        reply.code(500).send({ success: false, error: "Failed to unregister push token" });
      }
    }
  );

  // Web Push subscription endpoint
  fastify.post<{
    Body: { subscription: any };
  }>(
    "/notifications/web-push-subscribe",
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const userId = (request as any).user?.id;
        if (!userId) throw new NotFoundError("User");

        const { subscription } = request.body;
        if (!subscription?.endpoint || !subscription?.keys) {
          return reply.code(400).send({
            success: false,
            error: "Valid PushSubscription object required (endpoint + keys)",
          });
        }

        const token = JSON.stringify(subscription);

        // Upsert by endpoint
        const existing = await (fastify.prisma as any).pushDevice.findFirst({
          where: { pushToken: token, platform: "WEB" },
        });

        if (existing) {
          await (fastify.prisma as any).pushDevice.update({
            where: { id: existing.id },
            data: { userId, active: true, lastSeenAt: new Date() },
          });
        } else {
          await (fastify.prisma as any).pushDevice.create({
            data: {
              userId,
              platform: "WEB",
              pushToken: token,
              deviceName: "Web Browser",
              active: true,
              lastSeenAt: new Date(),
            },
          });
        }

        reply.send({ success: true });
      } catch (err: any) {
        fastify.log.error({ err }, "Failed to register web push subscription");
        reply.code(500).send({ success: false, error: "Failed to register web push subscription" });
      }
    }
  );

  // Get VAPID public key (for web push subscription)
  fastify.get(
    "/notifications/vapid-key",
    async (_request, reply) => {
      const key = process.env.VAPID_PUBLIC_KEY || "";
      reply.send({ success: true, data: { key } });
    }
  );

  // ========================================================================
  // NOTIFICATION DELIVERIES — Track delivery status across channels
  // ========================================================================

  // GET /notifications/deliveries — List delivery records with optional filters
  fastify.get<{
    Querystring: {
      notificationId?: string;
      channel?: string;
      status?: string;
      limit?: string;
      offset?: string;
    };
  }>(
    "/notifications/deliveries",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["ADMIN", "OPERATOR", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const { notificationId, channel, status } = request.query;
        const limit = Math.min(parseInt(request.query.limit || "50", 10) || 50, 100);
        const offset = parseInt(request.query.offset || "0", 10) || 0;

        const where: any = {};
        if (notificationId) {
          const nid = parseInt(notificationId, 10);
          if (Number.isFinite(nid)) where.notificationId = nid;
        }
        if (channel) where.channel = channel;
        if (status) where.status = status;

        const [deliveries, total] = await Promise.all([
          fastify.prisma.notificationDelivery.findMany({
            where,
            include: {
              notification: {
                select: { id: true, title: true, type: true, userId: true },
              },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.notificationDelivery.count({ where }),
        ]);

        reply.code(200).send({
          success: true,
          data: deliveries.map((d: any) => ({
            id: d.id,
            notificationId: d.notificationId,
            notificationTitle: d.notification?.title || null,
            notificationType: d.notification?.type || null,
            channel: d.channel,
            providerMessageId: d.providerMessageId,
            status: d.status,
            attempts: d.attempts,
            lastAttemptAt: d.lastAttemptAt,
            deliveredAt: d.deliveredAt,
            failureReason: d.failureReason,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          })),
          meta: { total, limit, offset },
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to fetch notification deliveries",
        });
      }
    }
  );

  // GET /notifications/deliveries/:id — Get single delivery record
  fastify.get<{ Params: { id: string } }>(
    "/notifications/deliveries/:id",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["ADMIN", "OPERATOR", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const deliveryId = parseInt(request.params.id, 10);
        if (!Number.isFinite(deliveryId)) {
          reply.code(400).send({ success: false, error: "Invalid delivery ID" });
          return;
        }

        const delivery = await fastify.prisma.notificationDelivery.findUnique({
          where: { id: deliveryId },
          include: {
            notification: {
              select: { id: true, title: true, body: true, type: true, channel: true, userId: true },
            },
          },
        });

        if (!delivery) {
          reply.code(404).send({ success: false, error: "Delivery not found" });
          return;
        }

        reply.code(200).send({
          success: true,
          data: {
            id: delivery.id,
            notificationId: delivery.notificationId,
            notification: delivery.notification
              ? {
                  id: delivery.notification.id,
                  title: delivery.notification.title,
                  body: delivery.notification.body,
                  type: delivery.notification.type,
                  channel: delivery.notification.channel,
                  userId: delivery.notification.userId,
                }
              : null,
            channel: delivery.channel,
            providerMessageId: delivery.providerMessageId,
            status: delivery.status,
            attempts: delivery.attempts,
            lastAttemptAt: delivery.lastAttemptAt,
            deliveredAt: delivery.deliveredAt,
            failureReason: delivery.failureReason,
            createdAt: delivery.createdAt,
            updatedAt: delivery.updatedAt,
          },
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: "Failed to fetch notification delivery",
        });
      }
    }
  );
}
