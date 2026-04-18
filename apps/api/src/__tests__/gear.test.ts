/**
 * Gear Routes Tests — Equipment management and safety checks
 *
 * Tests: GET /gear, POST /gear, GET /gear/:id, POST /gear/:id/check
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
import { gearRoutes } from "../routes/gear";

// ---------------------------------------------------------------------------
// App builder
// ---------------------------------------------------------------------------
async function buildGearApp(): Promise<FastifyInstance> {
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
    await api.register(gearRoutes);
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
describe("Gear Routes", () => {
  let app: FastifyInstance;
  let adminToken: string;
  let userToken: string;
  let userId: number;
  let dropzoneId: number;
  let gearItemId: number;
  let ownerId: number;

  beforeAll(async () => {
    app = await buildGearApp();
    const seed = await seedTestDropzone(app.prisma, "gear");
    dropzoneId = seed.dropzoneId;
    ownerId = seed.ownerId;

    // Create a test user
    const user = await app.prisma.user.create({
      data: {
        uuid: `gear-user-${Date.now()}`,
        email: `gear-user-${Date.now()}@skylara.test`,
        firstName: "Gear",
        lastName: "Tester",
        passwordHash: "$2b$10$placeholder",
      },
    });
    userId = user.id;

    // Tokens
    const adminPair = generateTokenPair({
      sub: String(seed.ownerId),
      email: `gear-admin@skylara.test`,
      dropzoneId: String(dropzoneId),
      roles: ["DZ_OWNER", "DZ_MANAGER", "PLATFORM_ADMIN"],
    });
    adminToken = adminPair.accessToken;

    const userPair = generateTokenPair({
      sub: String(userId),
      email: `gear-user@skylara.test`,
      dropzoneId: String(dropzoneId),
      roles: ["JUMPER"],
    });
    userToken = userPair.accessToken;

    // Seed a gear item
    const gear = await app.prisma.gearItem.create({
      data: {
        dropzoneId,
        ownerId: userId,
        manufacturer: "Performance Designs",
        model: "Sabre 3 170",
        serialNumber: `SN-TEST-${Date.now()}`,
        gearType: "MAIN",
        dom: new Date("2024-01-15"),
      },
    });
    gearItemId = gear.id;
  });

  afterAll(async () => {
    await app.prisma.gearCheck.deleteMany({ where: { gearItem: { dropzoneId } } }).catch(() => {});
    await app.prisma.gearItem.deleteMany({ where: { dropzoneId } }).catch(() => {});
    await cleanupTestData(app.prisma);
    await app.close();
  });

  // ─── GET /api/gear ──────────────────────────────────────────────────
  it("GET /gear — returns gear list for authenticated user", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/gear",
      headers: authHeader(userToken),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /gear — filters by gear type", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/gear?gearType=MAIN",
      headers: authHeader(userToken),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    body.data.forEach((g: any) => {
      expect(g.gearType).toBe("MAIN");
    });
  });

  it("GET /gear — 401 without auth token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/gear",
    });
    expect(res.statusCode).toBe(401);
  });

  // ─── POST /api/gear ─────────────────────────────────────────────────
  it("POST /gear — admin creates a new gear item", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/gear",
      headers: authHeader(adminToken),
      payload: {
        make: "Vigil",
        model: "Cuatro",
        serialNumber: `SN-AAD-${Date.now()}`,
        gearType: "AAD",
        purchaseDate: "2024-06-01",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("id");
    expect(body.data.manufacturer).toBe("Vigil"); // Route maps make → manufacturer
  });

  it("POST /gear — rejects invalid gear type", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/gear",
      headers: authHeader(adminToken),
      payload: {
        make: "Test",
        model: "Bad",
        serialNumber: "SN-BAD",
        gearType: "INVALID_TYPE",
        purchaseDate: "2024-01-01",
      },
    });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  // ─── POST /api/gear/:id/check ───────────────────────────────────────
  it("POST /gear/:id/check — records a gear check", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/gear/${gearItemId}/check`,
      headers: authHeader(adminToken),
      payload: {
        status: "PASS",
        notes: "Gear in good condition",
        checkedBy: String(ownerId),
      },
    });

    // Could be 200 or 201 depending on implementation
    expect(res.statusCode).toBeLessThan(300);
    const body = res.json();
    expect(body.success).toBe(true);
  });

  it("POST /gear/:id/check — rejects invalid check status", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/gear/${gearItemId}/check`,
      headers: authHeader(adminToken),
      payload: {
        status: "MAYBE",
        notes: "Invalid status",
        checkedBy: "Test",
      },
    });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});
