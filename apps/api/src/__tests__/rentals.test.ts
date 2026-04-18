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
import { rentalsRoutes } from "../routes/rentals";
import { AppError } from "../utils/errors";
import { generateTokenPair } from "../utils/jwt";
import { cleanupTestData, uniqueEmail, seedTestDropzone } from "./setup";

/**
 * Build a Fastify instance with rentals routes registered.
 */
async function buildRentalsApp(): Promise<FastifyInstance> {
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
      await api.register(rentalsRoutes);
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
// RENTALS ROUTES TESTS
// =============================================================================

describe("Rentals Routes", () => {
  let app: FastifyInstance;
  let hostToken: string;
  let guestToken: string;
  let hostUserId: number;
  let guestUserId: number;
  let dropzoneId: number;

  const password = "Test@1234!Secure";
  const hostEmail = uniqueEmail("rent-host");
  const guestEmail = uniqueEmail("rent-guest");

  beforeAll(async () => {
    app = await buildRentalsApp();
    await cleanupTestData(app.prisma);

    // Seed org > dropzone > branch > aircraft
    const seed = await seedTestDropzone(app.prisma, "rentals");
    dropzoneId = seed.dropzoneId;

    // Register host user
    const hostReg = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: hostEmail, password, firstName: "Host", lastName: "Owner" },
    });
    hostUserId = hostReg.json().data.user.id;

    // Assign DZ_MANAGER role for listing creation
    let managerRole = await app.prisma.role.findFirst({ where: { name: "DZ_MANAGER" } });
    if (!managerRole) {
      managerRole = await app.prisma.role.create({ data: { name: "DZ_MANAGER", displayName: "DZ Manager" } });
    }
    await app.prisma.userRole.create({
      data: { userId: hostUserId, roleId: managerRole.id, dropzoneId },
    });

    hostToken = generateTokenPair({
      sub: String(hostUserId),
      email: hostEmail,
      dropzoneId: String(dropzoneId),
      roles: ["DZ_MANAGER"],
    }).accessToken;

    // Register guest user
    const guestReg = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: guestEmail, password, firstName: "Guest", lastName: "Jumper" },
    });
    guestUserId = guestReg.json().data.user.id;

    let jumperRole = await app.prisma.role.findFirst({ where: { name: "JUMPER" } });
    if (!jumperRole) {
      jumperRole = await app.prisma.role.create({ data: { name: "JUMPER", displayName: "Jumper" } });
    }
    await app.prisma.userRole.create({
      data: { userId: guestUserId, roleId: jumperRole.id, dropzoneId },
    });

    guestToken = generateTokenPair({
      sub: String(guestUserId),
      email: guestEmail,
      dropzoneId: String(dropzoneId),
      roles: ["JUMPER"],
    }).accessToken;
  });

  afterAll(async () => {
    // Clean up rentals data in dependency order
    await app.prisma.rentalReview.deleteMany({ where: { listing: { dropzoneId } } }).catch(() => {});
    await app.prisma.rentalSavedProperty.deleteMany({ where: { listing: { dropzoneId } } }).catch(() => {});
    await app.prisma.rentalBooking.deleteMany({ where: { listing: { dropzoneId } } }).catch(() => {});
    await app.prisma.rentalAvailabilityBlock.deleteMany({ where: { listing: { dropzoneId } } }).catch(() => {});
    await app.prisma.rentalListing.deleteMany({ where: { dropzoneId } }).catch(() => {});
    await app.prisma.rentalHost.deleteMany({ where: { userId: hostUserId } }).catch(() => {});
    await app.prisma.auditLog.deleteMany({ where: { dropzoneId } }).catch(() => {});
    await cleanupTestData(app.prisma);
    await app.prisma.dropzone.delete({ where: { id: dropzoneId } }).catch(() => {});
    await app.close();
  });

  // ===========================================================================
  // AUTH ENFORCEMENT
  // ===========================================================================
  describe("Auth enforcement", () => {
    it("should return 401 on GET /api/rentals/search without auth", async () => {
      const res = await app.inject({ method: "GET", url: "/api/rentals/search" });
      expect(res.statusCode).toBe(401);
    });

    it("should return 401 on POST /api/rentals/listings without auth", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/rentals/listings",
        payload: { title: "test" },
      });
      expect(res.statusCode).toBe(401);
    });

    it("should return 401 on POST /api/rentals/bookings without auth", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/rentals/bookings",
        payload: { listingId: 1 },
      });
      expect(res.statusCode).toBe(401);
    });

    it("should return 401 on GET /api/rentals/bookings/me without auth", async () => {
      const res = await app.inject({ method: "GET", url: "/api/rentals/bookings/me" });
      expect(res.statusCode).toBe(401);
    });

    it("should return 401 on GET /api/rentals/saved/me without auth", async () => {
      const res = await app.inject({ method: "GET", url: "/api/rentals/saved/me" });
      expect(res.statusCode).toBe(401);
    });
  });

  // ===========================================================================
  // LISTINGS CRUD
  // ===========================================================================
  describe("Listings CRUD", () => {
    let listingId: number;
    const listingSlug = `test-listing-${Date.now()}`;

    it("should create a listing", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/rentals/listings",
        headers: { authorization: `Bearer ${hostToken}` },
        payload: {
          title: "Cozy DZ Bunkhouse",
          slug: listingSlug,
          description: "A comfortable bunkhouse right next to the dropzone.",
          listingType: "BUNKHOUSE",
          hostType: "DROPZONE",
          address: "1234 Skydive Lane, Eloy, AZ",
          city: "Eloy",
          country: "US",
          latitude: 32.756,
          longitude: -111.555,
          distanceToDropzone: 0.2,
          sleepingCapacity: 8,
          bathrooms: 2,
          petPolicy: "NOT_ALLOWED",
          cancellationPolicy: "MODERATE",
          bookingMode: "REQUEST_TO_BOOK",
          basePrice: 45.00,
          currency: "USD",
          amenities: ["wifi", "kitchen", "laundry"],
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty("id");
      expect(body.data.title).toBe("Cozy DZ Bunkhouse");
      expect(body.data.slug).toBe(listingSlug);
      listingId = body.data.id;
    });

    it("should search listings", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/rentals/search?dropzoneId=${dropzoneId}`,
        headers: { authorization: `Bearer ${guestToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("should get listing by slug", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/rentals/property/${listingSlug}`,
        headers: { authorization: `Bearer ${guestToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty("id");
      expect(body.data.slug).toBe(listingSlug);
    });

    it("should return 404 for non-existent slug", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/rentals/property/does-not-exist-9999",
        headers: { authorization: `Bearer ${guestToken}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it("should get my listings", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/rentals/listings/mine",
        headers: { authorization: `Bearer ${hostToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });

    it("should update a listing", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/rentals/listings/${listingId}`,
        headers: { authorization: `Bearer ${hostToken}` },
        payload: { title: "Cozy DZ Bunkhouse - Updated" },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.title).toBe("Cozy DZ Bunkhouse - Updated");
    });
  });

  // ===========================================================================
  // BOOKINGS
  // ===========================================================================
  describe("Bookings", () => {
    let listingId: number;
    let bookingId: number;

    beforeAll(async () => {
      // Create a listing for booking tests — set it to approved visibility
      const slug = `booking-test-${Date.now()}`;
      const createRes = await app.inject({
        method: "POST",
        url: "/api/rentals/listings",
        headers: { authorization: `Bearer ${hostToken}` },
        payload: {
          title: "Booking Test Listing",
          slug,
          listingType: "APARTMENT",
          address: "789 Jump St, Eloy, AZ",
          latitude: 32.75,
          longitude: -111.55,
          distanceToDropzone: 1.0,
          basePrice: 80.00,
          sleepingCapacity: 4,
          bathrooms: 1,
        },
      });
      listingId = createRes.json().data.id;

      // Manually approve the listing so it can be booked
      await app.prisma.rentalListing.update({
        where: { id: listingId },
        data: { visibility: "PUBLISHED", complianceStatus: "APPROVED" },
      }).catch(() => {});
    });

    it("should create a booking", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/rentals/bookings",
        headers: { authorization: `Bearer ${guestToken}` },
        payload: {
          listingId,
          checkInDate: "2026-06-01",
          checkOutDate: "2026-06-05",
          numberOfGuests: 2,
          specialRequests: "Late check-in please",
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty("id");
      expect(body.data.status).toBeDefined();
      bookingId = body.data.id;
    });

    it("should list my bookings", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/rentals/bookings/me",
        headers: { authorization: `Bearer ${guestToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });

    it("should get booking details", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/rentals/bookings/${bookingId}`,
        headers: { authorization: `Bearer ${guestToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty("id");
      expect(body.data.id).toBe(bookingId);
    });

    it("should cancel a booking", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/rentals/bookings/${bookingId}/cancel`,
        headers: { authorization: `Bearer ${guestToken}` },
        payload: {},
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("CANCELLED");
    });

    it("should return 404 for non-existent booking", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/rentals/bookings/999999",
        headers: { authorization: `Bearer ${guestToken}` },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ===========================================================================
  // REVIEWS
  // ===========================================================================
  describe("Reviews", () => {
    let listingId: number;

    beforeAll(async () => {
      // Create a listing for review tests
      const slug = `review-test-${Date.now()}`;
      const createRes = await app.inject({
        method: "POST",
        url: "/api/rentals/listings",
        headers: { authorization: `Bearer ${hostToken}` },
        payload: {
          title: "Review Test Listing",
          slug,
          listingType: "HOTEL_ROOM",
          address: "456 Review Ave, Eloy, AZ",
          latitude: 32.76,
          longitude: -111.56,
          distanceToDropzone: 0.5,
          basePrice: 60.00,
          sleepingCapacity: 2,
          bathrooms: 1,
        },
      });
      listingId = createRes.json().data.id;
    });

    it("should reject review without completed booking", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/rentals/reviews",
        headers: { authorization: `Bearer ${guestToken}` },
        payload: {
          listingId,
          rating: 5,
          title: "Amazing stay!",
          body: "Close to the DZ, clean, and affordable. Would stay again.",
        },
      });

      // Reviews require a completed booking — this should be rejected
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
      const body = res.json();
      expect(body.success).toBe(false);
    });

    it("should list reviews for a listing (empty)", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/rentals/reviews/${listingId}`,
        headers: { authorization: `Bearer ${guestToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  // ===========================================================================
  // SAVED PROPERTIES
  // ===========================================================================
  describe("Saved Properties", () => {
    let listingId: number;

    beforeAll(async () => {
      // Create a listing for save tests
      const slug = `save-test-${Date.now()}`;
      const createRes = await app.inject({
        method: "POST",
        url: "/api/rentals/listings",
        headers: { authorization: `Bearer ${hostToken}` },
        payload: {
          title: "Save Test Listing",
          slug,
          listingType: "CAMPSITE",
          address: "101 Camp Rd, Eloy, AZ",
          latitude: 32.77,
          longitude: -111.57,
          distanceToDropzone: 2.0,
          basePrice: 25.00,
          sleepingCapacity: 2,
          bathrooms: 0,
        },
      });
      listingId = createRes.json().data.id;
    });

    it("should save a property", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/rentals/saved",
        headers: { authorization: `Bearer ${guestToken}` },
        payload: { listingId },
      });

      expect(res.statusCode).toBeLessThan(300);
      const body = res.json();
      expect(body.success).toBe(true);
    });

    it("should list saved properties", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/rentals/saved/me",
        headers: { authorization: `Bearer ${guestToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });

    it("should unsave a property", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: `/api/rentals/saved/${listingId}`,
        headers: { authorization: `Bearer ${guestToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
    });

    it("should show empty saved after unsave", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/rentals/saved/me",
        headers: { authorization: `Bearer ${guestToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(0);
    });
  });
});
