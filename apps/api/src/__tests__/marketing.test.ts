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
import { authRoutes } from "../routes/auth";
import { marketingRoutes } from "../routes/marketing";
import { AppError } from "../utils/errors";
import { generateTokenPair } from "../utils/jwt";
import { cleanupTestData, uniqueEmail, seedTestDropzone } from "./setup";

/**
 * Build a Fastify instance with marketing routes registered.
 */
async function buildMarketingApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false, bodyLimit: 1_048_576 });

  await fastify.register(helmet, { contentSecurityPolicy: false });
  await fastify.register(cors, { origin: "*", credentials: true });
  await fastify.register(rateLimit, {
    max: 1000,
    timeWindow: "1 minute",
    allowList: ["127.0.0.1"],
  });
  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || "test-secret-minimum-thirty-two-characters-long!!",
    sign: { algorithm: "HS256" },
  });

  await fastify.register(prismaPlugin);
  await fastify.register(authPlugin);
  await fastify.register(websocketPlugin);
  await fastify.register(notificationsPlugin);

  fastify.get("/health", async (_request, reply) => {
    reply.code(200).send({ status: "ok" });
  });

  await fastify.register(
    async function apiRoutes(api) {
      await api.register(authRoutes);
      await api.register(marketingRoutes);
    },
    { prefix: "/api" },
  );

  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.code(error.statusCode).send({
        success: false,
        error: error.message,
        code: error.code,
      });
    } else if (error.statusCode === 429) {
      reply.code(429).send({ success: false, error: "Too many requests." });
    } else if (error.statusCode === 400) {
      reply.code(400).send({ success: false, error: "Validation failed", details: error.message });
    } else {
      reply.code(500).send({ success: false, error: "Internal server error" });
    }
  });

  await fastify.ready();
  return fastify;
}

// =============================================================================
// MARKETING ROUTES TESTS
// =============================================================================

describe("Marketing Routes", () => {
  let app: FastifyInstance;
  let adminToken: string;
  let userToken: string;
  let userId: number;
  let dropzoneId: number;

  const password = "Test@1234!Secure";
  const adminEmail = uniqueEmail("mkt-admin");
  const userEmail = uniqueEmail("mkt-user");

  beforeAll(async () => {
    app = await buildMarketingApp();
    await cleanupTestData(app.prisma);

    // Seed org > dropzone > branch > aircraft
    const seed = await seedTestDropzone(app.prisma, "marketing");
    dropzoneId = seed.dropzoneId;

    // Register admin user
    const regRes = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: adminEmail, password, firstName: "Mkt", lastName: "Admin" },
    });
    userId = regRes.json().data.user.id;

    // Assign DZ_MANAGER role
    let managerRole = await app.prisma.role.findFirst({ where: { name: "DZ_MANAGER" } });
    if (!managerRole) {
      managerRole = await app.prisma.role.create({ data: { name: "DZ_MANAGER", displayName: "DZ Manager" } });
    }
    await app.prisma.userRole.create({
      data: { userId, roleId: managerRole.id, dropzoneId },
    });

    // Admin token with DZ_MANAGER role
    adminToken = generateTokenPair({
      sub: String(userId),
      email: adminEmail,
      dropzoneId: String(dropzoneId),
      roles: ["DZ_MANAGER"],
    }).accessToken;

    // Register a regular user (no admin roles)
    const userReg = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: userEmail, password, firstName: "Regular", lastName: "User" },
    });
    const regularUserId = userReg.json().data.user.id;

    // Assign JUMPER role for the regular user
    let jumperRole = await app.prisma.role.findFirst({ where: { name: "JUMPER" } });
    if (!jumperRole) {
      jumperRole = await app.prisma.role.create({ data: { name: "JUMPER", displayName: "Jumper" } });
    }
    await app.prisma.userRole.create({
      data: { userId: regularUserId, roleId: jumperRole.id, dropzoneId },
    });

    userToken = generateTokenPair({
      sub: String(regularUserId),
      email: userEmail,
      dropzoneId: String(dropzoneId),
      roles: ["JUMPER"],
    }).accessToken;
  });

  afterAll(async () => {
    // Clean up marketing data
    await app.prisma.marketingCampaign.deleteMany({ where: { dropzoneId } }).catch(() => {});
    await app.prisma.survey.deleteMany({ where: { dropzoneId } }).catch(() => {});
    await app.prisma.referralLink.deleteMany({ where: { dropzoneId } }).catch(() => {});
    await app.prisma.localNewsItem.deleteMany({ where: { dropzoneId } }).catch(() => {});
    await app.prisma.auditLog.deleteMany({ where: { dropzoneId } }).catch(() => {});
    await cleanupTestData(app.prisma);
    await app.prisma.dropzone.delete({ where: { id: dropzoneId } }).catch(() => {});
    await app.close();
  });

  // ===========================================================================
  // AUTH ENFORCEMENT
  // ===========================================================================
  describe("Auth enforcement", () => {
    it("should return 401 on GET /api/marketing/campaigns without auth", async () => {
      const res = await app.inject({ method: "GET", url: "/api/marketing/campaigns" });
      expect(res.statusCode).toBe(401);
    });

    it("should return 401 on POST /api/marketing/campaigns without auth", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/marketing/campaigns",
        payload: { name: "test" },
      });
      expect(res.statusCode).toBe(401);
    });

    it("should return 401 on GET /api/marketing/surveys without auth", async () => {
      const res = await app.inject({ method: "GET", url: "/api/marketing/surveys" });
      expect(res.statusCode).toBe(401);
    });

    it("should return 401 on GET /api/marketing/referrals/me without auth", async () => {
      const res = await app.inject({ method: "GET", url: "/api/marketing/referrals/me" });
      expect(res.statusCode).toBe(401);
    });

    it("should return 401 on GET /api/marketing/news without auth", async () => {
      const res = await app.inject({ method: "GET", url: "/api/marketing/news" });
      expect(res.statusCode).toBe(401);
    });
  });

  // ===========================================================================
  // CAMPAIGNS CRUD
  // ===========================================================================
  describe("Campaigns CRUD", () => {
    let campaignId: number;

    it("should list campaigns (empty initially)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/marketing/campaigns",
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("should create a campaign", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/marketing/campaigns",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: "Summer Jump Fest",
          channel: "EMAIL",
          description: "Join us for the biggest summer event!",
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty("id");
      expect(body.data.name).toBe("Summer Jump Fest");
      expect(body.data.status).toBe("DRAFT");
      campaignId = body.data.id;
    });

    it("should update a campaign", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/marketing/campaigns/${campaignId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { name: "Summer Jump Fest 2026" },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.name).toBe("Summer Jump Fest 2026");
    });

    it("should publish a campaign", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/marketing/campaigns/${campaignId}/publish`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("PUBLISHED");
    });

    it("should pause a campaign", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/marketing/campaigns/${campaignId}/pause`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("PAUSED");
    });

    it("should reject campaign creation from non-admin user", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/marketing/campaigns",
        headers: { authorization: `Bearer ${userToken}` },
        payload: { name: "Unauthorized", type: "EMAIL" },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ===========================================================================
  // SURVEYS
  // ===========================================================================
  describe("Surveys", () => {
    let surveyId: number;

    it("should list surveys (empty initially)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/marketing/surveys",
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("should create a survey", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/marketing/surveys",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          title: "Post-Jump Feedback",
          description: "Tell us about your jump experience",
          questions: [
            { text: "How was your experience?", type: "RATING", order: 1 },
            { text: "Would you recommend us?", type: "NPS", order: 2 },
          ],
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty("id");
      expect(body.data.title).toBe("Post-Jump Feedback");
      surveyId = body.data.id;
    });

    it("should submit a survey response", async () => {
      // First activate the survey so responses are accepted
      await app.inject({
        method: "PATCH",
        url: `/api/marketing/surveys/${surveyId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { status: "ACTIVE" },
      });

      const res = await app.inject({
        method: "POST",
        url: `/api/marketing/surveys/${surveyId}/respond`,
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          answers: [
            { questionIndex: 0, value: "5" },
            { questionIndex: 1, value: "9" },
          ],
        },
      });

      // 200 or 201 depending on implementation
      expect(res.statusCode).toBeLessThan(300);
      const body = res.json();
      expect(body.success).toBe(true);
    });

    it("should get survey results", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/marketing/surveys/${surveyId}/results`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty("totalResponses");
    });
  });

  // ===========================================================================
  // REFERRALS
  // ===========================================================================
  describe("Referrals", () => {
    it("should create a referral link", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/marketing/referrals/create-link",
        headers: { authorization: `Bearer ${userToken}` },
        payload: {},
      });

      // 200 or 201 depending on implementation
      expect(res.statusCode).toBeLessThan(300);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty("code");
    });

    it("should get my referrals", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/marketing/referrals/me",
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });
  });

  // ===========================================================================
  // GAMIFICATION — Leaderboards & Rewards/Badges
  // ===========================================================================
  describe("Gamification", () => {
    it("should get leaderboards", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/marketing/leaderboards",
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("should get my rewards", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/marketing/rewards/me",
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
    });

    it("should get badges list", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/marketing/gamification/badges",
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  // ===========================================================================
  // NEWS
  // ===========================================================================
  describe("News", () => {
    it("should list news (empty initially)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/marketing/news",
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("should create a news item (admin only)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/marketing/news",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          title: "New Turbine Aircraft Arriving",
          body: "We are excited to announce a new King Air B200 joining our fleet.",
          category: "ANNOUNCEMENT",
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty("id");
      expect(body.data.title).toBe("New Turbine Aircraft Arriving");
    });

    it("should reject news creation from non-admin user", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/marketing/news",
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          title: "Unauthorized News",
          body: "This should be rejected",
          category: "ANNOUNCEMENT",
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });
});
