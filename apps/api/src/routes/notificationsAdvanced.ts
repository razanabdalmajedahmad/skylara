import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Type, Static } from "@sinclair/typebox";
import crypto from "crypto";
import {
  EventType,
  NotificationPreferences,
  NotificationTemplate,
  Webhook,
  EVENTS,
} from "../services/notificationService";

// ============================================================================
// SCHEMAS
// ============================================================================

const NotificationPreferencesSchema = Type.Object({
  inApp: Type.Boolean(),
  email: Type.Boolean(),
  push: Type.Boolean(),
  whatsapp: Type.Boolean(),
  sms: Type.Boolean(),
  marketing: Type.Boolean(),
  quietHoursStart: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  quietHoursEnd: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  timezone: Type.Optional(Type.String()),
  mutedEvents: Type.Array(Type.String()),
});

const UpdatePreferencesSchema = Type.Partial(NotificationPreferencesSchema);

const NotificationTemplateSchema = Type.Object({
  id: Type.String(),
  eventType: Type.String(),
  channel: Type.Union([
    Type.Literal("in_app"),
    Type.Literal("email"),
    Type.Literal("whatsapp"),
    Type.Literal("sms"),
  ]),
  locale: Type.String(),
  subject: Type.Optional(Type.String()),
  body: Type.String(),
  variables: Type.Array(Type.String()),
});

const CreateTemplateSchema = Type.Object({
  eventType: Type.String(),
  channel: Type.Union([
    Type.Literal("in_app"),
    Type.Literal("email"),
    Type.Literal("whatsapp"),
    Type.Literal("sms"),
  ]),
  locale: Type.String({ default: "en" }),
  subject: Type.Optional(Type.String()),
  body: Type.String(),
  variables: Type.Array(Type.String(), { default: [] }),
});

const TestNotificationSchema = Type.Object({
  eventType: Type.String(),
  channel: Type.Union([
    Type.Literal("in_app"),
    Type.Literal("email"),
    Type.Literal("whatsapp"),
    Type.Literal("sms"),
  ]),
  testData: Type.Record(Type.String(), Type.Any()),
});

const WebhookSchema = Type.Object({
  id: Type.String(),
  dropzoneId: Type.Number(),
  url: Type.String({ format: "uri" }),
  secret: Type.String(),
  eventTypes: Type.Array(Type.String()),
  isActive: Type.Boolean(),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
  lastTriggeredAt: Type.Optional(Type.String({ format: "date-time" })),
});

const CreateWebhookSchema = Type.Object({
  url: Type.String({ format: "uri" }),
  eventTypes: Type.Array(Type.String()),
});

const UpdateWebhookSchema = Type.Partial(
  Type.Object({
    url: Type.String({ format: "uri" }),
    eventTypes: Type.Array(Type.String()),
    isActive: Type.Boolean(),
  })
);

const TestWebhookSchema = Type.Object({
  eventType: Type.String(),
  testPayload: Type.Optional(Type.Record(Type.String(), Type.Any())),
});

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function notificationsAdvancedRoutes(
  fastify: FastifyInstance
) {
  // Authenticate middleware
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: "Unauthorized" });
    }
  };

  // Admin-only middleware
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);

    const user = await (fastify.prisma as any).user.findUnique({
      where: { id: parseInt((request.user as any).sub) },
      select: { role: true },
    });

    if (user?.role !== "admin") {
      reply.code(403).send({ error: "Forbidden" });
    }
  };

  // DZ Manager middleware
  const requireDzManager = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    await authenticate(request, reply);

    const user = await (fastify.prisma as any).user.findUnique({
      where: { id: parseInt((request.user as any).sub) },
      select: { role: true, managedDropzoneId: true },
    });

    if (user?.role !== "operator" && user?.role !== "admin") {
      reply.code(403).send({ error: "Forbidden" });
    }
  };

  // ========================================================================
  // GET /notifications/preferences
  // ========================================================================
  fastify.get(
    "/notifications/preferences",
    {
      onRequest: authenticate,
      schema: {
        description: "Get user notification preferences",
        response: {
          200: NotificationPreferencesSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt((request.user as any).sub);

      try {
        const pref = await (fastify.prisma as any).communicationPreference.findUnique({
          where: { userId },
        });

        const preferences = pref
          ? {
              inApp: pref.inAppEnabled,
              email: pref.emailEnabled,
              push: pref.pushEnabled,
              whatsapp: pref.whatsappEnabled,
              sms: pref.smsEnabled,
              marketing: false,
              quietHoursStart: pref.quietHoursStart || null,
              quietHoursEnd: pref.quietHoursEnd || null,
              mutedEvents: [],
              timezone: "UTC",
            }
          : {
              inApp: true,
              email: true,
              push: true,
              whatsapp: false,
              sms: false,
              marketing: false,
              quietHoursStart: null,
              quietHoursEnd: null,
              mutedEvents: [],
              timezone: "UTC",
            };

        return reply.send(preferences);
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ error: "Internal server error" });
      }
    }
  );

  // ========================================================================
  // PATCH /notifications/preferences
  // ========================================================================
  fastify.patch(
    "/notifications/preferences",
    {
      onRequest: authenticate,
      schema: {
        description: "Update notification preferences",
        body: UpdatePreferencesSchema,
        response: {
          200: NotificationPreferencesSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt((request.user as any).sub);
      const updates = request.body as any;

      try {
        const data: any = {};
        if (updates.inApp !== undefined) data.inAppEnabled = updates.inApp;
        if (updates.email !== undefined) data.emailEnabled = updates.email;
        if (updates.whatsapp !== undefined) data.whatsappEnabled = updates.whatsapp;
        if (updates.sms !== undefined) data.smsEnabled = updates.sms;
        if (updates.push !== undefined) data.pushEnabled = updates.push;
        if (updates.quietHoursStart !== undefined) data.quietHoursStart = updates.quietHoursStart;
        if (updates.quietHoursEnd !== undefined) data.quietHoursEnd = updates.quietHoursEnd;

        const pref = await (fastify.prisma as any).communicationPreference.upsert({
          where: { userId },
          update: data,
          create: { userId, ...data },
        });

        return reply.send({
          inApp: pref.inAppEnabled,
          email: pref.emailEnabled,
          push: pref.pushEnabled,
          whatsapp: pref.whatsappEnabled,
          sms: pref.smsEnabled,
          marketing: false,
          quietHoursStart: pref.quietHoursStart || null,
          quietHoursEnd: pref.quietHoursEnd || null,
          mutedEvents: [],
          timezone: "UTC",
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ error: "Internal server error" });
      }
    }
  );

  // ========================================================================
  // GET /notifications/templates
  // ========================================================================
  fastify.get(
    "/notifications/templates",
    {
      onRequest: requireAdmin,
      schema: {
        description: "List notification templates (admin only)",
        querystring: Type.Object({
          eventType: Type.Optional(Type.String()),
          channel: Type.Optional(Type.String()),
          locale: Type.Optional(Type.String()),
        }),
        response: {
          200: Type.Array(NotificationTemplateSchema),
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { eventType, channel, locale } = request.query as any;

      try {
        const where: any = {};
        if (eventType) where.eventType = eventType;
        if (channel) where.channel = channel;
        if (locale) where.locale = locale;

        const templates = await (fastify.prisma as any)
          .notificationTemplate.findMany({
          where,
          orderBy: [{ eventType: "asc" }, { channel: "asc" }],
        });

        return reply.send(templates);
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ error: "Internal server error" });
      }
    }
  );

  // ========================================================================
  // POST /notifications/templates
  // ========================================================================
  fastify.post(
    "/notifications/templates",
    {
      onRequest: requireAdmin,
      schema: {
        description: "Create or update a notification template (admin only)",
        body: CreateTemplateSchema,
        response: {
          201: NotificationTemplateSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { eventType, channel, locale, subject, body, variables } =
        request.body as any;

      try {
        // Check if exists
        const existing = await (fastify.prisma as any)
          .notificationTemplate.findUnique({
          where: {
            eventType_channel_locale: {
              eventType,
              channel,
              locale,
            },
          },
        });

        let result;
        if (existing) {
          result = await (fastify.prisma as any).notificationTemplate.update({
            where: {
              id: existing.id,
            },
            data: {
              subject,
              body,
              variables,
              updatedAt: new Date(),
            },
          });
        } else {
          result = await (fastify.prisma as any).notificationTemplate.create({
            data: {
              id: crypto.randomUUID(),
              eventType,
              channel,
              locale,
              subject,
              body,
              variables,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }

        return reply.code(201).send(result);
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ error: "Internal server error" });
      }
    }
  );

  // ========================================================================
  // POST /notifications/test
  // ========================================================================
  fastify.post(
    "/notifications/test",
    {
      onRequest: requireAdmin,
      schema: {
        description: "Send test notification to self (admin only)",
        body: TestNotificationSchema,
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt((request.user as any).sub);
      const { eventType, channel, testData } = request.body as any;

      try {
        const notificationService = (fastify as any).notificationService;

        const payload = {
          timestamp: Date.now(),
          userId,
          dropzoneId: 1, // Default for testing
          ...testData,
        };

        // Dispatch to specific channel
        const notificationData = {
          userId,
          eventType,
          channel,
          variables: testData,
        };

        switch (channel) {
          case "in_app":
            await notificationService.sendInApp({
              id: crypto.randomUUID(),
              userId,
              dropzoneId: 1,
              eventType,
              eventPayload: payload,
              channels: ["in_app"],
              read: false,
              createdAt: new Date(),
            });
            break;
          case "email":
            await notificationService.sendEmail(notificationData);
            break;
          case "whatsapp":
            await notificationService.sendWhatsApp(notificationData);
            break;
          case "sms":
            await notificationService.sendSMS(notificationData);
            break;
        }

        return reply.send({
          success: true,
          message: `Test notification sent via ${channel}`,
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ error: "Internal server error" });
      }
    }
  );

  // ========================================================================
  // GET /webhooks
  // ========================================================================
  fastify.get(
    "/webhooks",
    {
      onRequest: requireDzManager,
      schema: {
        description:
          "List webhooks for user's dropzone (DZ manager or admin only)",
        response: {
          200: Type.Array(WebhookSchema),
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt((request.user as any).sub);

      try {
        // Get user's managed dropzone
        const user = await (fastify.prisma as any).user.findUnique({
          where: { id: userId },
          select: { managedDropzoneId: true, role: true },
        });

        let dropzoneId: number;

        if (user?.role === "admin") {
          // Admins can query all, default to first DZ or query param
          dropzoneId = parseInt(
            (request.query as any).dropzoneId || "1",
            10
          );
        } else if (user?.managedDropzoneId) {
          dropzoneId = user.managedDropzoneId;
        } else {
          return reply
            .code(403)
            .send({ error: "User does not manage a dropzone" });
        }

        const webhooks = await (fastify.prisma as any).webhook.findMany({
          where: { dropzoneId },
          orderBy: { createdAt: "desc" },
        });

        return reply.send(webhooks);
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ error: "Internal server error" });
      }
    }
  );

  // ========================================================================
  // POST /webhooks
  // ========================================================================
  fastify.post(
    "/webhooks",
    {
      onRequest: requireDzManager,
      schema: {
        description: "Create a webhook for dropzone",
        body: CreateWebhookSchema,
        response: {
          201: WebhookSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt((request.user as any).sub);
      const { url, eventTypes } = request.body as any;

      try {
        const user = await (fastify.prisma as any).user.findUnique({
          where: { id: userId },
          select: { managedDropzoneId: true, role: true },
        });

        let dropzoneId: number;

        if (user?.role === "admin") {
          dropzoneId = parseInt(
            (request.query as any).dropzoneId || "1",
            10
          );
        } else if (user?.managedDropzoneId) {
          dropzoneId = user.managedDropzoneId;
        } else {
          return reply
            .code(403)
            .send({ error: "User does not manage a dropzone" });
        }

        const secret = crypto.randomBytes(32).toString("hex");

        const webhook = await (fastify.prisma as any).webhook.create({
          data: {
            id: crypto.randomUUID(),
            dropzoneId,
            url,
            secret,
            eventTypes,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        return reply.code(201).send(webhook);
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ error: "Internal server error" });
      }
    }
  );

  // ========================================================================
  // PATCH /webhooks/:id
  // ========================================================================
  fastify.patch(
    "/webhooks/:id",
    {
      onRequest: requireDzManager,
      schema: {
        description: "Update a webhook",
        params: Type.Object({
          id: Type.String(),
        }),
        body: UpdateWebhookSchema,
        response: {
          200: WebhookSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt((request.user as any).sub);
      const { id } = request.params as any;
      const updates = request.body as any;

      try {
        // Verify ownership
        const webhook = await (fastify.prisma as any).webhook.findUnique({
          where: { id },
          select: { dropzoneId: true },
        });

        if (!webhook) {
          return reply.code(404).send({ error: "Webhook not found" });
        }

        const user = await (fastify.prisma as any).user.findUnique({
          where: { id: userId },
          select: { managedDropzoneId: true, role: true },
        });

        if (
          user?.role !== "admin" &&
          webhook.dropzoneId !== user?.managedDropzoneId
        ) {
          return reply.code(403).send({ error: "Forbidden" });
        }

        const updated = await (fastify.prisma as any).webhook.update({
          where: { id },
          data: {
            ...updates,
            updatedAt: new Date(),
          },
        });

        return reply.send(updated);
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ error: "Internal server error" });
      }
    }
  );

  // ========================================================================
  // DELETE /webhooks/:id
  // ========================================================================
  fastify.delete(
    "/webhooks/:id",
    {
      onRequest: requireDzManager,
      schema: {
        description: "Delete a webhook",
        params: Type.Object({
          id: Type.String(),
        }),
        response: {
          204: Type.Void(),
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt((request.user as any).sub);
      const { id } = request.params as any;

      try {
        const webhook = await (fastify.prisma as any).webhook.findUnique({
          where: { id },
          select: { dropzoneId: true },
        });

        if (!webhook) {
          return reply.code(404).send({ error: "Webhook not found" });
        }

        const user = await (fastify.prisma as any).user.findUnique({
          where: { id: userId },
          select: { managedDropzoneId: true, role: true },
        });

        if (
          user?.role !== "admin" &&
          webhook.dropzoneId !== user?.managedDropzoneId
        ) {
          return reply.code(403).send({ error: "Forbidden" });
        }

        await (fastify.prisma as any).webhook.delete({
          where: { id },
        });

        return reply.code(204).send();
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ error: "Internal server error" });
      }
    }
  );

  // ========================================================================
  // POST /webhooks/:id/test
  // ========================================================================
  fastify.post(
    "/webhooks/:id/test",
    {
      onRequest: requireDzManager,
      schema: {
        description: "Send a test event to webhook",
        params: Type.Object({
          id: Type.String(),
        }),
        body: TestWebhookSchema,
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            statusCode: Type.Optional(Type.Number()),
            message: Type.String(),
          }),
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = parseInt((request.user as any).sub);
      const { id } = request.params as any;
      const { eventType, testPayload } = request.body as any;

      try {
        const webhook = await (fastify.prisma as any).webhook.findUnique({
          where: { id },
        });

        if (!webhook) {
          return reply.code(404).send({ error: "Webhook not found" });
        }

        const user = await (fastify.prisma as any).user.findUnique({
          where: { id: userId },
          select: { managedDropzoneId: true, role: true },
        });

        if (
          user?.role !== "admin" &&
          webhook.dropzoneId !== user?.managedDropzoneId
        ) {
          return reply.code(403).send({ error: "Forbidden" });
        }

        // Prepare test payload
        const payload = {
          timestamp: Date.now(),
          userId,
          dropzoneId: webhook.dropzoneId,
          eventType,
          ...(testPayload || {}),
        };

        // Sign and send
        const body = JSON.stringify(payload);
        const signature = crypto
          .createHmac("sha256", webhook.secret)
          .update(body)
          .digest("hex");

        const result = await new Promise<{
          success: boolean;
          statusCode?: number;
          message: string;
        }>((resolve) => {
          const https = require("https");
          const options = {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(body),
              "X-Signature": signature,
              "X-Event-Type": eventType,
              "X-Timestamp": Date.now().toString(),
            },
          };

          const req = https.request(webhook.url, options, (res: any) => {
            resolve({
              success: res.statusCode >= 200 && res.statusCode < 300,
              statusCode: res.statusCode,
              message: `Webhook responded with ${res.statusCode}`,
            });
          });

          req.on("error", (err: any) => {
            resolve({
              success: false,
              message: `Webhook request failed: ${err.message}`,
            });
          });

          req.write(body);
          req.end();
        });

        return reply.send(result);
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ error: "Internal server error" });
      }
    }
  );

  // ========================================================================
  // DELIVERY RETRIES — retry failed notification deliveries
  // ========================================================================

  /**
   * POST /notifications/retry-failed
   * Retries all FAILED deliveries up to 3 attempts. Marks as permanently failed after.
   */
  fastify.post(
    "/notifications/retry-failed",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = parseInt((request as any).user?.sub ?? "0");

        // Find failed deliveries with fewer than 3 attempts
        const failedDeliveries = await (fastify.prisma as any).notificationDelivery.findMany({
          where: {
            status: "FAILED",
            attempts: { lt: 3 },
          },
          take: 50,
          orderBy: { createdAt: "asc" },
        });

        let retried = 0;
        let permanentlyFailed = 0;

        for (const delivery of failedDeliveries) {
          const newAttempts = (delivery.attempts ?? 0) + 1;

          if (newAttempts >= 3) {
            // Mark as permanently failed
            await (fastify.prisma as any).notificationDelivery.update({
              where: { id: delivery.id },
              data: { status: "PERMANENTLY_FAILED", attempts: newAttempts },
            });
            permanentlyFailed++;
          } else {
            // Reset to PENDING for re-delivery
            await (fastify.prisma as any).notificationDelivery.update({
              where: { id: delivery.id },
              data: { status: "PENDING", attempts: newAttempts },
            });
            retried++;
          }
        }

        return reply.send({
          success: true,
          data: {
            processed: failedDeliveries.length,
            retried,
            permanentlyFailed,
          },
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ error: "Failed to retry deliveries" });
      }
    }
  );

  // ========================================================================
  // STALE TOKEN CLEANUP — remove expired/invalid push device tokens
  // ========================================================================

  /**
   * POST /notifications/cleanup-stale-tokens
   * Removes push device tokens that haven't been seen in 90+ days
   * or that have been explicitly marked as inactive.
   */
  fastify.post(
    "/notifications/cleanup-stale-tokens",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const staleCutoff = new Date();
        staleCutoff.setDate(staleCutoff.getDate() - 90);

        // Deactivate stale tokens
        const deactivated = await (fastify.prisma as any).pushDevice.updateMany({
          where: {
            active: true,
            lastSeenAt: { lt: staleCutoff },
          },
          data: { active: false },
        });

        // Delete inactive tokens older than 180 days
        const deleteCutoff = new Date();
        deleteCutoff.setDate(deleteCutoff.getDate() - 180);

        const deleted = await (fastify.prisma as any).pushDevice.deleteMany({
          where: {
            active: false,
            lastSeenAt: { lt: deleteCutoff },
          },
        });

        return reply.send({
          success: true,
          data: {
            deactivated: deactivated.count ?? 0,
            deleted: deleted.count ?? 0,
            staleCutoffDate: staleCutoff.toISOString(),
            deleteCutoffDate: deleteCutoff.toISOString(),
          },
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ error: "Failed to cleanup stale tokens" });
      }
    }
  );

  /**
   * GET /notifications/delivery-stats
   * Returns counts of deliveries by status for monitoring.
   */
  fastify.get(
    "/notifications/delivery-stats",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const [pending, sent, delivered, failed, read] = await Promise.all([
          (fastify.prisma as any).notificationDelivery.count({ where: { status: "PENDING" } }),
          (fastify.prisma as any).notificationDelivery.count({ where: { status: "SENT" } }),
          (fastify.prisma as any).notificationDelivery.count({ where: { status: "DELIVERED" } }),
          (fastify.prisma as any).notificationDelivery.count({ where: { status: "FAILED" } }),
          (fastify.prisma as any).notificationDelivery.count({ where: { status: "READ" } }),
        ]);

        const activeTokens = await (fastify.prisma as any).pushDevice.count({
          where: { active: true },
        });

        return reply.send({
          success: true,
          data: {
            deliveries: { pending, sent, delivered, failed, read },
            activeTokens,
          },
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ error: "Failed to fetch delivery stats" });
      }
    }
  );
}

export default notificationsAdvancedRoutes;
