/**
 * Waiver Routes Tests — Digital waiver signing flow (legal compliance)
 *
 * Tests: GET /waivers, GET /waivers/:id, POST /waivers/:id/sign,
 *        GET /waivers/admin/signatures
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
import { waiverRoutes } from "../routes/waivers";

// ---------------------------------------------------------------------------
// App builder
// ---------------------------------------------------------------------------
async function buildWaiverApp(): Promise<FastifyInstance> {
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
    await api.register(waiverRoutes);
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
describe("Waiver Routes", () => {
  let app: FastifyInstance;
  let adminToken: string;
  let userToken: string;
  let userId: number;
  let dropzoneId: number;
  let waiverId: number;

  beforeAll(async () => {
    app = await buildWaiverApp();

    const seed = await seedTestDropzone(app.prisma, "waiver");
    dropzoneId = seed.dropzoneId;

    // Create a test user for signing waivers
    const user = await app.prisma.user.create({
      data: {
        uuid: `waiver-user-${Date.now()}`,
        email: `waiver-user-${Date.now()}@skylara.test`,
        firstName: "Waiver",
        lastName: "Tester",
        passwordHash: "$2b$10$placeholder",
      },
    });
    userId = user.id;

    // Create admin token with DZ context
    const adminPair = generateTokenPair({
      sub: String(seed.ownerId),
      email: `waiver-admin@skylara.test`,
      dropzoneId: String(dropzoneId),
      roles: ["DZ_OWNER", "DZ_MANAGER", "PLATFORM_ADMIN"],
    });
    adminToken = adminPair.accessToken;

    // Create user token
    const userPair = generateTokenPair({
      sub: String(userId),
      email: user.email,
      dropzoneId: String(dropzoneId),
      roles: ["JUMPER"],
    });
    userToken = userPair.accessToken;

    // Create a test waiver
    const waiver = await app.prisma.waiver.create({
      data: {
        dropzoneId,
        title: "Test Liability Waiver",
        waiverType: "EXPERIENCED",
        version: 1,
        content: "By signing this waiver, you acknowledge the inherent risks of skydiving and release SkyLara from liability. This is a comprehensive test waiver content that must be at least 200 characters to pass the preview check.",
        isActive: true,
      },
    });
    waiverId = waiver.id;
  });

  afterAll(async () => {
    // Clean up in dependency order
    await app.prisma.waiverSignature.deleteMany({ where: { waiver: { dropzoneId } } }).catch(() => {});
    await app.prisma.waiver.deleteMany({ where: { dropzoneId } }).catch(() => {});
    await cleanupTestData(app.prisma);
    await app.close();
  });

  // ─── GET /api/waivers ───────────────────────────────────────────────
  it("GET /waivers — returns active waivers for authenticated user", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/waivers",
      headers: authHeader(userToken),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);

    const waiver = body.data.find((w: any) => w.id === waiverId);
    expect(waiver).toBeDefined();
    expect(waiver.title).toBe("Test Liability Waiver");
    expect(waiver.isSigned).toBe(false);
  });

  it("GET /waivers — 401 without auth token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/waivers",
    });
    expect(res.statusCode).toBe(401);
  });

  // ─── POST /api/waivers/sign ──────────────────────────────────────────
  it("POST /waivers/sign — signs a waiver successfully", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/waivers/sign`,
      headers: authHeader(userToken),
      payload: {
        waiverId,
        signatureData: "data:image/png;base64,iVBORw0KGgo=TESTSIGNATURE",
        agreedToTerms: true,
      },
    });

    // Route returns 201 for created signatures
    if (res.statusCode >= 400) {
      console.log("SIGN ERROR:", res.json());
    }
    expect(res.statusCode).toBeLessThan(300);
    const body = res.json();
    expect(body.success).toBe(true);
  });

  it("POST /waivers/sign — rejects without agreeing to terms", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/waivers/sign`,
      headers: authHeader(userToken),
      payload: {
        waiverId,
        signatureData: "data:image/png;base64,iVBORw0KGgo=TESTSIG2",
        agreedToTerms: false,
      },
    });

    // Should be 400 or validation error
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  // ─── GET /api/waivers/admin/signatures ──────────────────────────────
  it("GET /waivers/admin/signatures — admin can view all signatures", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/waivers/admin/signatures",
      headers: authHeader(adminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("GET /waivers/admin/signatures — 403 for regular user", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/waivers/admin/signatures",
      headers: authHeader(userToken),
    });

    expect(res.statusCode).toBe(403);
  });
});
