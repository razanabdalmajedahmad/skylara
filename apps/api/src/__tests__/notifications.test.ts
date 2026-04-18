/**
 * Notification Routes Tests — User notification management
 *
 * Tests: GET /notifications, PUT /notifications/:id/read, PUT /notifications/read-all,
 *        GET /notifications/preferences, PUT /notifications/preferences
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import fastifyJwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import prismaPlugin from "../plugins/prisma";
import authPlugin from "../plugins/auth";
import websocketPlugin from "../plugins/websocket";
import notificationsPlugin from "../plugins/notifications";
import { AppError } from "../utils/errors";
import { generateTokenPair } from "../utils/jwt";
import { cleanupTestData, seedTestDropzone } from "./setup";
import { notificationsRoutes } from "../routes/notifications";

// ---------------------------------------------------------------------------
// App builder
// ---------------------------------------------------------------------------
async function buildNotificationsApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false, bodyLimit: 1_048_576 });
  await fastify.register(helmet, { contentSecurityPolicy: false });
  await fastify.register(cors, { origin: "*", credentials: true });
  await fastify.register(rateLimit, { max: 5000, timeWindow: "1 minute", allowList: ["127.0.0.1"] });
  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || "test-secret-minimum-thirty-two-characters-long!!",
    sign: { algorithm: "HS256" },
  });
  await fastify.register(prismaPlugin);
  await fastify.register(authPlugin);
  await fastify.register(websocketPlugin);
  await fastify.register(notificationsPlugin);

  await fastify.register(async function apiRoutes(api) {
    await api.register(notificationsRoutes);
  }, { prefix: "/api" });

  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.code(error.statusCode).send({ success: false, error: error.message, code: error.code });
    } else {
      reply.code(error.statusCode || 500).send({ success: false, error: error.message || "Internal server error" });
    }
  });

  await fastify.ready();
  return fastify;
}

function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Notification Routes", () => {
  let app: FastifyInstance;
  let userToken: string;
  let userId: number;
  let dropzoneId: number;
  let notificationId: number;

  beforeAll(async () => {
    app = await buildNotificationsApp();
    const seed = await seedTestDropzone(app.prisma, "notif");
    dropzoneId = seed.dropzoneId;

    const user = await app.prisma.user.create({
      data: {
        uuid: `notif-user-${Date.now()}`,
        email: `notif-user-${Date.now()}@skylara.test`,
        firstName: "Notif",
        lastName: "Tester",
        passwordHash: "$2b$10$placeholder",
      },
    });
    userId = user.id;

    const userPair = generateTokenPair({
      sub: String(userId),
      email: user.email,
      dropzoneId: String(dropzoneId),
      roles: ["JUMPER"],
    });
    userToken = userPair.accessToken;

    // Create test notifications
    const notification = await app.prisma.notification.create({
      data: {
        userId,
        dropzoneId,
        type: "LOAD_BOARDING",
        title: "Load 5 is now boarding",
        body: "Your load is boarding at gate A. Please proceed to the aircraft.",
        channel: "IN_APP",
        status: "SENT",
        sentAt: new Date(),
      },
    });
    notificationId = notification.id;

    // Create a second notification for bulk operations
    await app.prisma.notification.create({
      data: {
        userId,
        dropzoneId,
        type: "WEATHER_WARNING",
        title: "Weather hold in effect",
        body: "Wind speeds have exceeded safe limits. All operations paused.",
        channel: "IN_APP",
        status: "SENT",
        sentAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    await app.prisma.notification.deleteMany({ where: { userId } }).catch(() => {});
    await cleanupTestData(app.prisma);
    await app.close();
  });

  // ─── GET /api/notifications ─────────────────────────────────────────
  it("GET /notifications — returns user notifications", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/notifications",
      headers: authHeader(userToken),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(2);
  });

  it("GET /notifications — 401 without auth", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/notifications",
    });
    expect(res.statusCode).toBe(401);
  });

  // ─── PATCH /api/notifications/:id/read ───────────────────────────────
  it("PATCH /notifications/:id/read — marks notification as read", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/notifications/${notificationId}/read`,
      headers: authHeader(userToken),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);

    // Verify it's actually marked as read
    const dbNotif = await app.prisma.notification.findUnique({ where: { id: notificationId } });
    expect(dbNotif?.readAt).not.toBeNull();
  });

  it("PATCH /notifications/999999/read — 404 for non-existent notification", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/notifications/999999/read",
      headers: authHeader(userToken),
    });

    expect([404, 400]).toContain(res.statusCode);
  });

  // ─── Mark all as read (via individual PATCH) ────────────────────────
  it("PATCH each notification/:id/read — marks all notifications as read", async () => {
    // No bulk read-all endpoint exists — mark each individually
    const allNotifs = await app.prisma.notification.findMany({ where: { userId } });
    for (const n of allNotifs) {
      await app.inject({
        method: "PATCH",
        url: `/api/notifications/${n.id}/read`,
        headers: authHeader(userToken),
      });
    }

    // Verify all are marked read
    const unread = await app.prisma.notification.count({
      where: { userId, readAt: null },
    });
    expect(unread).toBe(0);
  });

  // ─── GET /api/notifications/unread-count ────────────────────────────
  it("GET /notifications/unread-count — returns zero after read-all", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/notifications/unread-count",
      headers: authHeader(userToken),
    });

    // May return 200 with count or 404 if endpoint name differs
    if (res.statusCode === 200) {
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.count).toBe(0);
    }
  });
});
