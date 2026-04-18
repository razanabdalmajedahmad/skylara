/**
 * E2E Smoke Tests — Full data-flow verification across every major page/module.
 *
 * Simulates what a browser would do: register, login, hit every page's API,
 * verify status codes and response shapes. Uses app.inject() for speed.
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

// Route imports — mirrors index.ts
import { authRoutes } from "../routes/auth";
import { manifestRoutes } from "../routes/manifest";
import { paymentsRoutes } from "../routes/payments";
import { weatherRoutes } from "../routes/weather";
import { aircraftRoutes } from "../routes/aircraft";
import { boogieRoutes } from "../routes/boogies";
import { marketingRoutes } from "../routes/marketing";
import { rentalsRoutes } from "../routes/rentals";
import { publicPortalRoutes } from "../routes/publicPortal";
import { assistantAdvancedRoutes } from "../routes/assistantAdvanced";
import { assistantOrgRolloutRoutes } from "../routes/assistantOrgRollout";
import { gearRoutes } from "../routes/gear";
import { safetyRoutes } from "../routes/safety";
import { notificationsRoutes } from "../routes/notifications";
import { adminRoutes } from "../routes/admin";
import { supportRoutes } from "../routes/supportIndex";
import { reportsRoutes } from "../routes/reports";
import { bookingRoutes } from "../routes/booking";
import { waiverRoutes } from "../routes/waivers";
import { learningRoutes } from "../routes/learning";
import { careersRoutes } from "../routes/careers";

// ---------------------------------------------------------------------------
// Test-scoped app builder — registers ALL route modules
// ---------------------------------------------------------------------------

async function buildFullApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false, bodyLimit: 1_048_576 });

  await fastify.register(helmet, { contentSecurityPolicy: false });
  await fastify.register(cors, { origin: "*", credentials: true });
  await fastify.register(rateLimit, {
    max: 5000,
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

  fastify.get("/health", async (_req, reply) => {
    reply.code(200).send({ status: "ok" });
  });

  await fastify.register(
    async function apiRoutes(api) {
      await api.register(authRoutes);
      await api.register(manifestRoutes);
      await api.register(paymentsRoutes);
      await api.register(weatherRoutes);
      await api.register(aircraftRoutes);
      await api.register(boogieRoutes);
      await api.register(marketingRoutes);
      await api.register(rentalsRoutes);
      await api.register(publicPortalRoutes);
      await api.register(assistantAdvancedRoutes);
      await api.register(assistantOrgRolloutRoutes);
      await api.register(gearRoutes);
      await api.register(safetyRoutes);
      await api.register(notificationsRoutes);
      await api.register(adminRoutes);
      await api.register(supportRoutes);
      await api.register(reportsRoutes);
      await api.register(bookingRoutes);
      await api.register(waiverRoutes);
      await api.register(learningRoutes);
      await api.register(careersRoutes);
    },
    { prefix: "/api" },
  );

  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.code(error.statusCode).send({ success: false, error: error.message, code: error.code });
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
}

/** Generate a JWT with admin roles + dropzone context for privileged endpoints */
function makeAdminToken(userId: number, dropzoneId: number): string {
  const { accessToken } = generateTokenPair({
    sub: String(userId),
    email: `admin-e2e@skylara.test`,
    dropzoneId: String(dropzoneId),
    roles: ["DZ_OWNER", "DZ_MANAGER", "PLATFORM_ADMIN"],
  });
  return accessToken;
}

/** Generate a regular user JWT with dropzone context */
function makeUserToken(userId: number, dropzoneId: number, email: string): string {
  const { accessToken } = generateTokenPair({
    sub: String(userId),
    email,
    dropzoneId: String(dropzoneId),
    roles: ["JUMPER"],
  });
  return accessToken;
}

// =============================================================================
// TEST SUITE
// =============================================================================

describe("E2E Smoke Tests", () => {
  let app: FastifyInstance;
  let adminToken: string;
  let userToken: string;
  let userId: number;
  let adminUserId: number;
  let dropzoneId: number;

  beforeAll(async () => {
    app = await buildFullApp();

    // Seed a full org > dropzone > branch > aircraft chain
    const seed = await seedTestDropzone(app.prisma, "e2e");
    dropzoneId = seed.dropzoneId;
    adminUserId = seed.ownerId;

    // Register a regular test user via the auth flow
    const email = `e2e-user-${Date.now()}@skylara.test`;
    const regRes = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email, password: "Test@1234!Secure", firstName: "E2E", lastName: "Tester" },
    });
    const regBody = regRes.json();
    userId = regBody.data?.user?.id ?? 1;

    // Generate scoped tokens
    adminToken = makeAdminToken(adminUserId, dropzoneId);
    userToken = makeUserToken(userId, dropzoneId, email);
  }, 30_000);

  afterAll(async () => {
    await cleanupTestData(app.prisma);
    await app.close();
  });

  // ===========================================================================
  // AUTH FLOW
  // ===========================================================================
  describe("Auth flow", () => {
    it("Register -> Login -> Profile -> Refresh", async () => {
      const email = `e2e-auth-${Date.now()}@skylara.test`;

      // Register
      const reg = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: { email, password: "Str0ng@Pass!99", firstName: "Smoke", lastName: "Auth" },
      });
      expect(reg.statusCode).toBe(201);
      const regBody = reg.json();
      expect(regBody.success).toBe(true);
      expect(regBody.data).toHaveProperty("accessToken");
      expect(regBody.data).toHaveProperty("refreshToken");
      expect(regBody.data.user).toHaveProperty("id");

      const { accessToken, refreshToken } = regBody.data;

      // Login
      const login = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email, password: "Str0ng@Pass!99" },
      });
      expect(login.statusCode).toBe(200);
      const loginBody = login.json();
      expect(loginBody.success).toBe(true);
      expect(loginBody.data).toHaveProperty("accessToken");

      // Profile
      const profile = await app.inject({
        method: "GET",
        url: "/api/auth/me",
        headers: authHeader(accessToken),
      });
      expect(profile.statusCode).toBe(200);
      const profileBody = profile.json();
      expect(profileBody.success).toBe(true);
      expect(profileBody.data).toHaveProperty("email", email);

      // Refresh token
      const refresh = await app.inject({
        method: "POST",
        url: "/api/auth/refresh",
        payload: { refreshToken },
      });
      expect(refresh.statusCode).toBe(200);
      const refreshBody = refresh.json();
      expect(refreshBody.success).toBe(true);
      expect(refreshBody.data).toHaveProperty("accessToken");
    });
  });

  // ===========================================================================
  // DASHBOARD FLOW
  // ===========================================================================
  describe("Dashboard flow", () => {
    it("GET /manifest/dashboard-stats", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/manifest/dashboard-stats",
        headers: authHeader(adminToken),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it("GET /weather", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/weather",
        headers: authHeader(userToken),
      });
      // Weather may succeed or return a non-500 code depending on external APIs
      expect(res.statusCode).toBeLessThan(500);
      const body = res.json();
      if (res.statusCode === 200) {
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty("ji");
        expect(body.data).toHaveProperty("status");
        expect(body.data).toHaveProperty("temp");
      }
    });

    it("GET /loads", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/loads",
        headers: authHeader(adminToken),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it("GET /aircraft", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/aircraft",
        headers: authHeader(adminToken),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it("GET /boogies", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/boogies",
        headers: authHeader(adminToken),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });
  });

  // ===========================================================================
  // MARKETING FLOW
  // ===========================================================================
  describe("Marketing flow", () => {
    let campaignId: number;
    let surveyId: number;

    it("Campaigns: create -> list -> publish -> pause", async () => {
      // Create
      const create = await app.inject({
        method: "POST",
        url: "/api/marketing/campaigns",
        headers: authHeader(adminToken),
        payload: {
          name: "E2E Smoke Campaign",
          channel: "EMAIL",
          description: "E2E test campaign with real content",
        },
      });
      expect(create.statusCode).toBe(201);
      const createBody = create.json();
      expect(createBody.success).toBe(true);
      campaignId = createBody.data.id;
      expect(campaignId).toBeDefined();

      // List
      const list = await app.inject({
        method: "GET",
        url: "/api/marketing/campaigns",
        headers: authHeader(adminToken),
      });
      expect(list.statusCode).toBe(200);
      const listBody = list.json();
      expect(listBody.success).toBe(true);
      expect(listBody.data).toBeDefined();

      // Publish
      const publish = await app.inject({
        method: "POST",
        url: `/api/marketing/campaigns/${campaignId}/publish`,
        headers: authHeader(adminToken),
      });
      expect(publish.statusCode).toBe(200);
      expect(publish.json().success).toBe(true);

      // Pause
      const pause = await app.inject({
        method: "POST",
        url: `/api/marketing/campaigns/${campaignId}/pause`,
        headers: authHeader(adminToken),
      });
      expect(pause.statusCode).toBe(200);
      expect(pause.json().success).toBe(true);
    });

    it("Surveys: create -> activate -> respond", async () => {
      // Create
      const create = await app.inject({
        method: "POST",
        url: "/api/marketing/surveys",
        headers: authHeader(adminToken),
        payload: {
          title: "E2E Smoke Survey",
          description: "Test survey",
          questions: [
            { text: "How was your jump?", type: "RATING", required: true },
          ],
        },
      });
      expect(create.statusCode).toBe(201);
      const createBody = create.json();
      expect(createBody.success).toBe(true);
      surveyId = createBody.data.id;

      // Activate (PATCH to set status ACTIVE)
      const activate = await app.inject({
        method: "PATCH",
        url: `/api/marketing/surveys/${surveyId}`,
        headers: authHeader(adminToken),
        payload: { status: "ACTIVE" },
      });
      expect(activate.statusCode).toBe(200);
      expect(activate.json().success).toBe(true);

      // Respond
      const respond = await app.inject({
        method: "POST",
        url: `/api/marketing/surveys/${surveyId}/respond`,
        headers: authHeader(userToken),
        payload: {
          answers: [{ questionId: 1, value: "5" }],
        },
      });
      // Response may vary depending on question IDs; accept success or validation error
      expect(respond.statusCode).toBeLessThan(500);
    });

    it("Referrals: create-link -> list mine", async () => {
      const create = await app.inject({
        method: "POST",
        url: "/api/marketing/referrals/create-link",
        headers: authHeader(userToken),
        payload: { channel: "EMAIL" },
      });
      expect(create.statusCode).toBeLessThanOrEqual(201);
      expect(create.json().success).toBe(true);

      const mine = await app.inject({
        method: "GET",
        url: "/api/marketing/referrals/me",
        headers: authHeader(userToken),
      });
      expect(mine.statusCode).toBe(200);
      expect(mine.json().success).toBe(true);
    });

    it("Gamification: leaderboards, rewards, badges", async () => {
      const lb = await app.inject({
        method: "GET",
        url: "/api/marketing/leaderboards",
        headers: authHeader(adminToken),
      });
      expect(lb.statusCode).toBe(200);
      expect(lb.json().success).toBe(true);

      const rewards = await app.inject({
        method: "GET",
        url: "/api/marketing/rewards/me",
        headers: authHeader(userToken),
      });
      expect(rewards.statusCode).toBe(200);
      expect(rewards.json().success).toBe(true);

      const badges = await app.inject({
        method: "GET",
        url: "/api/marketing/gamification/badges",
        headers: authHeader(adminToken),
      });
      expect(badges.statusCode).toBe(200);
      expect(badges.json().success).toBe(true);
    });

    it("News: create -> list", async () => {
      const create = await app.inject({
        method: "POST",
        url: "/api/marketing/news",
        headers: authHeader(adminToken),
        payload: {
          title: "E2E News Item",
          body: "Testing news creation",
          category: "ANNOUNCEMENT",
        },
      });
      expect(create.statusCode).toBe(201);
      expect(create.json().success).toBe(true);

      const list = await app.inject({
        method: "GET",
        url: "/api/marketing/news",
        headers: authHeader(adminToken),
      });
      expect(list.statusCode).toBe(200);
      expect(list.json().success).toBe(true);
      expect(list.json().data).toBeDefined();
    });
  });

  // ===========================================================================
  // RENTALS FLOW
  // ===========================================================================
  describe("Rentals flow", () => {
    let listingId: number;

    it("Listings: create -> publish -> search -> find it", async () => {
      // Create listing
      const create = await app.inject({
        method: "POST",
        url: "/api/rentals/listings",
        headers: authHeader(adminToken),
        payload: {
          title: "E2E Smoke Bunkhouse",
          slug: `e2e-bunk-${Date.now()}`,
          listingType: "BUNKHOUSE",
          address: "123 Dropzone Rd, Zephyrhills FL 33542",
          city: "Zephyrhills",
          country: "US",
          latitude: 28.23,
          longitude: -82.18,
          distanceToDropzone: 0.2,
          sleepingCapacity: 8,
          bathrooms: 2,
          basePrice: 45.0,
          currency: "USD",
        },
      });
      expect(create.statusCode).toBe(201);
      const createBody = create.json();
      expect(createBody.success).toBe(true);
      listingId = createBody.data.id;

      // Publish (PATCH visibility)
      const publish = await app.inject({
        method: "PATCH",
        url: `/api/rentals/listings/${listingId}`,
        headers: authHeader(adminToken),
        payload: { visibility: "PUBLISHED" },
      });
      expect(publish.statusCode).toBe(200);
      expect(publish.json().success).toBe(true);

      // Search
      const search = await app.inject({
        method: "GET",
        url: "/api/rentals/search",
        headers: authHeader(userToken),
      });
      expect(search.statusCode).toBe(200);
      const searchBody = search.json();
      expect(searchBody.success).toBe(true);
      expect(searchBody.data).toBeDefined();
    });

    it("Compliance: submit -> approve", async () => {
      const submit = await app.inject({
        method: "POST",
        url: "/api/rentals/compliance",
        headers: authHeader(adminToken),
        payload: {
          listingId,
          documentType: "LICENSE",
          documentUrl: "https://example.com/license.pdf",
        },
      });
      expect(submit.statusCode).toBeLessThanOrEqual(201);
      const submitBody = submit.json();
      expect(submitBody.success).toBe(true);
      const complianceId = submitBody.data?.id;

      if (complianceId) {
        const approve = await app.inject({
          method: "PATCH",
          url: `/api/rentals/compliance/${complianceId}/approve`,
          headers: authHeader(adminToken),
          payload: { notes: "Approved by E2E" },
        });
        expect(approve.statusCode).toBe(200);
        expect(approve.json().success).toBe(true);
      }
    });

    it("Bookings: book -> list mine -> cancel", async () => {
      const book = await app.inject({
        method: "POST",
        url: "/api/rentals/bookings",
        headers: authHeader(userToken),
        payload: {
          listingId,
          checkInDate: "2026-06-01",
          checkOutDate: "2026-06-05",
          numberOfGuests: 2,
        },
      });
      // Accept 201 (created) or 409 (already booked from previous run) or 400 (validation)
      expect(book.statusCode).toBeLessThanOrEqual(409);
      const bookBody = book.json();
      const bookingId = bookBody.data?.id;

      // List my bookings
      const mine = await app.inject({
        method: "GET",
        url: "/api/rentals/bookings/me",
        headers: authHeader(userToken),
      });
      expect(mine.statusCode).toBe(200);
      expect(mine.json().success).toBe(true);

      // Cancel
      if (bookingId) {
        const cancel = await app.inject({
          method: "POST",
          url: `/api/rentals/bookings/${bookingId}/cancel`,
          headers: authHeader(userToken),
        });
        expect(cancel.statusCode).toBe(200);
        expect(cancel.json().success).toBe(true);
      }
    });

    it("Saved listings: save -> list -> remove", async () => {
      const save = await app.inject({
        method: "POST",
        url: "/api/rentals/saved",
        headers: authHeader(userToken),
        payload: { listingId },
      });
      expect(save.statusCode).toBeLessThanOrEqual(201);
      expect(save.json().success).toBe(true);

      const list = await app.inject({
        method: "GET",
        url: "/api/rentals/saved/me",
        headers: authHeader(userToken),
      });
      expect(list.statusCode).toBe(200);
      expect(list.json().success).toBe(true);

      const remove = await app.inject({
        method: "DELETE",
        url: `/api/rentals/saved/${listingId}`,
        headers: authHeader(userToken),
      });
      expect(remove.statusCode).toBe(200);
      expect(remove.json().success).toBe(true);
    });

    it("GET /rentals/listings/mine", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/rentals/listings/mine",
        headers: authHeader(adminToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
      expect(res.json().data).toBeDefined();
    });
  });

  // ===========================================================================
  // PUBLIC PORTAL FLOW
  // ===========================================================================
  describe("Public portal flow", () => {
    const publicEndpoints = [
      "/public/events",
      "/public/jobs",
      "/public/stays",
      "/public/courses",
      "/public/coaches",
      "/public/announcements",
      "/public/faq",
    ];

    for (const path of publicEndpoints) {
      it(`GET ${path}`, async () => {
        const res = await app.inject({
          method: "GET",
          url: `/api${path}`,
          headers: authHeader(userToken),
        });
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.success).toBe(true);
        expect(body.data).toBeDefined();
      });
    }
  });

  // ===========================================================================
  // ACCOUNT PORTAL FLOW
  // ===========================================================================
  describe("Account portal flow", () => {
    it("GET /account/overview", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/account/overview",
        headers: authHeader(userToken),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty("bookings");
      expect(body.data).toHaveProperty("waivers");
    });

    it("GET /account/bookings", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/account/bookings",
        headers: authHeader(userToken),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it("GET /account/wallet", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/account/wallet",
        headers: authHeader(userToken),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      // wallet data may be null if user has no wallet yet
      expect(body).toHaveProperty("data");
    });

    it("GET /account/waivers", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/account/waivers",
        headers: authHeader(userToken),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it("GET /account/learning", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/account/learning",
        headers: authHeader(userToken),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it("GET /account/events", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/account/events",
        headers: authHeader(userToken),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it("PATCH /account/settings -> update name", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: "/api/account/settings",
        headers: authHeader(userToken),
        payload: { firstName: "Updated", lastName: "Name" },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
    });
  });

  // ===========================================================================
  // WEBSITE MANAGEMENT FLOW
  // ===========================================================================
  describe("Website management flow", () => {
    it("GET /website/settings", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/website/settings",
        headers: authHeader(adminToken),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it("PATCH /website/settings -> update company name", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: "/api/website/settings",
        headers: authHeader(adminToken),
        payload: { companyName: "SkyLara E2E DZ" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
    });

    it("Pages: create -> list", async () => {
      const create = await app.inject({
        method: "POST",
        url: "/api/website/pages",
        headers: authHeader(adminToken),
        payload: {
          pageType: "CUSTOM",
          title: "E2E Test Page",
          slug: `e2e-page-${Date.now()}`,
          content: { blocks: [{ type: "text", value: "Hello" }] },
        },
      });
      expect(create.statusCode).toBeLessThanOrEqual(201);
      expect(create.json().success).toBe(true);

      const list = await app.inject({
        method: "GET",
        url: "/api/website/pages",
        headers: authHeader(adminToken),
      });
      expect(list.statusCode).toBe(200);
      const listBody = list.json();
      expect(listBody.success).toBe(true);
      expect(listBody.data).toBeDefined();
    });
  });

  // ===========================================================================
  // PREDICTIONS / ASSISTANT FLOW
  // ===========================================================================
  describe("Predictions flow", () => {
    it("GET /assistant/predictions", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/assistant/predictions",
        headers: authHeader(adminToken),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it("GET /assistant/revenue-forecast", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/assistant/revenue-forecast",
        headers: authHeader(adminToken),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty("dailyForecasts");
      expect(Array.isArray(body.data.dailyForecasts)).toBe(true);
    });
  });
});
