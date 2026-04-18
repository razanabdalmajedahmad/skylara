/**
 * Test setup — builds a Fastify instance with all plugins and routes,
 * provides helper utilities for auth tokens and data cleanup.
 */
import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import fastifyJwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import prismaPlugin from "../plugins/prisma";
import authPlugin from "../plugins/auth";
import websocketPlugin from "../plugins/websocket";
import notificationsPlugin from "../plugins/notifications";
import { authRoutes } from "../routes/auth";
import { manifestRoutes } from "../routes/manifest";
import { paymentsRoutes } from "../routes/payments";
import { AppError } from "../utils/errors";
import { PrismaClient } from "@prisma/client";

// Ensure test-compatible env vars are set before anything reads them
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL || "mysql://root:password@localhost:3306/skylara_test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-minimum-thirty-two-characters-long!!";
process.env.LOG_LEVEL = "error"; // suppress noise in tests

const TEST_JWT_SECRET = process.env.JWT_SECRET!;

/**
 * Build a fully-wired Fastify instance suitable for `fastify.inject()` testing.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: false,
    bodyLimit: 1_048_576,
  });

  // Security plugins (mirrors index.ts)
  await fastify.register(helmet, { contentSecurityPolicy: false });
  await fastify.register(cors, { origin: "*", credentials: true });
  await fastify.register(rateLimit, {
    max: 1000, // high limit so tests don't get throttled
    timeWindow: "1 minute",
    allowList: ["127.0.0.1"],
  });

  // JWT — HS256 with shared secret for tests
  await fastify.register(fastifyJwt, {
    secret: TEST_JWT_SECRET,
    sign: { algorithm: "HS256" },
  });

  // Core plugins
  await fastify.register(prismaPlugin);
  await fastify.register(authPlugin);
  await fastify.register(websocketPlugin);
  await fastify.register(notificationsPlugin);

  // Health check
  fastify.get("/health", async (_request, reply) => {
    reply.code(200).send({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Register routes under /api prefix (same as production)
  await fastify.register(
    async function apiRoutes(api) {
      await api.register(authRoutes);
      await api.register(manifestRoutes);
      await api.register(paymentsRoutes);
    },
    { prefix: "/api" }
  );

  // Global error handler (mirrors index.ts)
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.code(error.statusCode).send({
        success: false,
        error: error.message,
        code: error.code,
      });
    } else if (error.statusCode === 429) {
      reply.code(429).send({
        success: false,
        error: "Too many requests. Please try again later.",
      });
    } else if (error.statusCode === 400) {
      reply.code(400).send({
        success: false,
        error: "Validation failed",
        details: error.message,
      });
    } else {
      reply.code(500).send({
        success: false,
        error: "Internal server error",
      });
    }
  });

  await fastify.ready();
  return fastify;
}

/**
 * Register a test user and return an access token + refresh token pair.
 * If the user already exists, logs in instead.
 */
export async function getAuthToken(
  app: FastifyInstance,
  email: string = "testuser@skylara.test",
  password: string = "Test@1234!Secure"
): Promise<{ accessToken: string; refreshToken: string; userId: number }> {
  // Try to register first
  const registerRes = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: {
      email,
      password,
      firstName: "Test",
      lastName: "User",
    },
  });

  if (registerRes.statusCode === 201) {
    const body = registerRes.json();
    return {
      accessToken: body.data.accessToken,
      refreshToken: body.data.refreshToken,
      userId: body.data.user.id,
    };
  }

  // Already exists — login instead
  const loginRes = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email, password },
  });

  const body = loginRes.json();
  return {
    accessToken: body.data.accessToken,
    refreshToken: body.data.refreshToken,
    userId: body.data.user.id,
  };
}

/**
 * Clean up test data created during test runs.
 * Deletes data in dependency order to avoid FK constraint violations.
 */
export async function cleanupTestData(prisma: PrismaClient): Promise<void> {
  // Delete in reverse-dependency order
  await prisma.refreshToken.deleteMany({
    where: { user: { email: { contains: "@skylara.test" } } },
  });
  await prisma.slot.deleteMany({
    where: { user: { email: { contains: "@skylara.test" } } },
  });
  await prisma.transaction.deleteMany({
    where: { wallet: { user: { email: { contains: "@skylara.test" } } } },
  });
  await prisma.wallet.deleteMany({
    where: { user: { email: { contains: "@skylara.test" } } },
  });
  await prisma.userRole.deleteMany({
    where: { user: { email: { contains: "@skylara.test" } } },
  });
  // Clean up password reset tokens
  await prisma.passwordResetToken.deleteMany({
    where: { user: { email: { contains: "@skylara.test" } } },
  }).catch(() => {});
  // Clean up audit logs
  await prisma.auditLog.deleteMany({
    where: { user: { email: { contains: "@skylara.test" } } },
  }).catch(() => {});
  // Clean up test loads/slots/aircraft/branches/dropzones/orgs
  await prisma.slot.deleteMany({
    where: { load: { dropzone: { slug: { contains: "test-" } } } },
  }).catch(() => {});
  await prisma.load.deleteMany({
    where: { dropzone: { slug: { contains: "test-" } } },
  }).catch(() => {});
  await prisma.aircraft.deleteMany({
    where: { dropzone: { slug: { contains: "test-" } } },
  }).catch(() => {});
  await prisma.dzBranch.deleteMany({
    where: { dropzone: { slug: { contains: "test-" } } },
  }).catch(() => {});
  await prisma.syncOutbox.deleteMany({
    where: { dropzone: { slug: { contains: "test-" } } },
  }).catch(() => {});
  await prisma.dropzone.deleteMany({
    where: { slug: { contains: "test-" } },
  }).catch(() => {});
  await prisma.organization.deleteMany({
    where: { slug: { contains: "test-org-" } },
  }).catch(() => {});
  await prisma.user.deleteMany({
    where: { email: { contains: "@skylara.test" } },
  });
}

/**
 * Generate a unique test email to avoid collisions between parallel test files.
 */
export function uniqueEmail(prefix: string = "test"): string {
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${rand}@skylara.test`;
}

/**
 * Seed a complete org > dropzone > branch > aircraft chain for tests that need tenant data.
 * Returns all created IDs. Also creates an owner user.
 */
export async function seedTestDropzone(
  prisma: PrismaClient,
  suffix: string = ""
): Promise<{
  ownerId: number;
  organizationId: number;
  dropzoneId: number;
  branchId: number;
  aircraftId: number;
}> {
  const { randomUUID } = await import("crypto");
  const ts = Date.now();

  // Owner user
  const owner = await prisma.user.create({
    data: {
      uuid: randomUUID(),
      email: `owner-${suffix}-${ts}@skylara.test`,
      firstName: "Test",
      lastName: "Owner",
      passwordHash: "$2b$10$placeholder",
    },
  });

  const org = await prisma.organization.create({
    data: {
      uuid: randomUUID(),
      name: `Test Org ${suffix}`,
      slug: `test-org-${suffix}-${ts}`,
      ownerId: owner.id,
    },
  });

  const dz = await prisma.dropzone.create({
    data: {
      uuid: randomUUID(),
      organizationId: org.id,
      name: `Test DZ ${suffix}`,
      slug: `test-dz-${suffix}-${ts}`,
      timezone: "America/Chicago",
      latitude: 32.0,
      longitude: -97.0,
    },
  });

  const branch = await prisma.dzBranch.create({
    data: {
      dropzoneId: dz.id,
      name: "Main Branch",
      isDefault: true,
    },
  });

  const aircraft = await prisma.aircraft.create({
    data: {
      dropzoneId: dz.id,
      registration: `N-TEST-${suffix}-${ts}`.substring(0, 20),
      type: "Cessna 208B",
      maxCapacity: 15,
      maxWeight: 3600,
      emptyWeight: 2150,
    },
  });

  return {
    ownerId: owner.id,
    organizationId: org.id,
    dropzoneId: dz.id,
    branchId: branch.id,
    aircraftId: aircraft.id,
  };
}
