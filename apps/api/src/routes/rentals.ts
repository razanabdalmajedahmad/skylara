import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import { createAuditService } from "../services/auditService";
import { S3Service } from "../services/s3Service";
import { PaymentService } from "../services/paymentService";
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ValidationError,
} from "../utils/errors";

// ============================================================================
// RENTALS ROUTES — Property listings, bookings, reviews, compliance
// ============================================================================

// ── Validation Schemas ──────────────────────────────────────────────────────

const searchQuerySchema = z.object({
  dropzoneId: z.string().optional(),
  city: z.string().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  guests: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  listingType: z.string().optional(),
  amenities: z.string().optional(), // comma-separated
  sort: z.enum(["price_asc", "price_desc", "distance", "rating", "newest"]).optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
});

const createBookingSchema = z.object({
  listingId: z.number().int().positive(),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  numberOfGuests: z.number().int().positive().default(1),
  specialRequests: z.string().optional(),
});

const createListingSchema = z.object({
  title: z.string().min(3).max(255),
  slug: z.string().min(3).max(255).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  listingType: z.enum([
    "HOTEL_ROOM", "APARTMENT", "VILLA", "ROOM_SHARE", "BUNKHOUSE",
    "HOSTEL_BED", "RV_HOOKUP", "CAMPSITE", "MONTHLY_FURNISHED", "EVENT_PACKAGE",
  ]),
  hostType: z.enum(["INDIVIDUAL", "BUSINESS", "DROPZONE", "PARTNER"]).default("INDIVIDUAL"),
  address: z.string().min(5).max(500),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  distanceToDropzone: z.number().nonnegative(),
  sleepingCapacity: z.number().int().positive().default(1),
  bathrooms: z.number().int().nonnegative().default(1),
  petPolicy: z.enum(["ALLOWED", "NOT_ALLOWED", "BY_REQUEST"]).default("NOT_ALLOWED"),
  cancellationPolicy: z.enum(["FLEXIBLE", "MODERATE", "STRICT"]).default("MODERATE"),
  bookingMode: z.enum([
    "INSTANT_BOOK", "REQUEST_TO_BOOK", "HOLD_THEN_CONFIRM",
    "EXTERNAL_REDIRECT", "PARTNER_BOOKING",
  ]).default("REQUEST_TO_BOOK"),
  basePrice: z.number().positive(),
  currency: z.string().length(3).default("USD"),
  weeklyDiscount: z.number().min(0).max(100).optional(),
  monthlyDiscount: z.number().min(0).max(100).optional(),
  amenities: z.array(z.string()).optional(),
  skydiverAmenities: z.record(z.boolean()).optional(),
  heroImageUrl: z.string().url().optional(),
});

const updateListingSchema = createListingSchema.partial().extend({
  visibility: z.enum(["DRAFT", "PUBLISHED", "PAUSED", "ARCHIVED"]).optional(),
});

const blockAvailabilitySchema = z.object({
  listingId: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["AVAILABLE", "BLOCKED"]).default("BLOCKED"),
  priceOverride: z.number().positive().optional(),
  note: z.string().max(255).optional(),
});

const pricingRuleSchema = z.object({
  listingId: z.number().int().positive(),
  weeklyDiscount: z.number().min(0).max(100).optional(),
  monthlyDiscount: z.number().min(0).max(100).optional(),
  basePrice: z.number().positive().optional(),
});

const createReviewSchema = z.object({
  listingId: z.number().int().positive(),
  bookingId: z.number().int().positive().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).optional(),
  body: z.string().max(5000).optional(),
});

const complianceSubmitSchema = z.object({
  listingId: z.number().int().positive(),
  permitMetadata: z.record(z.unknown()).optional(),
  complianceNotes: z.string().optional(),
  documentUrls: z.array(z.string().url()).optional(),
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function computeNights(checkIn: string, checkOut: string): number {
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
}

function buildSortOrder(sort?: string): Record<string, string> {
  switch (sort) {
    case "price_asc":
      return { basePrice: "asc" };
    case "price_desc":
      return { basePrice: "desc" };
    case "distance":
      return { distanceToDropzone: "asc" };
    case "newest":
      return { createdAt: "desc" };
    default:
      return { distanceToDropzone: "asc" };
  }
}

async function ensureHostProfile(prisma: any, userId: number, displayName: string) {
  let host = await prisma.rentalHost.findUnique({ where: { userId } });
  if (!host) {
    host = await prisma.rentalHost.create({
      data: { userId, displayName },
    });
  }
  return host;
}

async function verifyListingOwnership(prisma: any, listingId: number, userId: number) {
  const listing = await prisma.rentalListing.findUnique({
    where: { id: listingId },
    include: { host: true },
  });
  if (!listing) throw new NotFoundError("Listing");
  if (listing.host.userId !== userId) throw new ForbiddenError("You do not own this listing");
  return listing;
}

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

export async function rentalsRoutes(fastify: FastifyInstance) {
  const audit = createAuditService(fastify.prisma);

  // ── SEARCH & DISCOVERY ──────────────────────────────────────────────────

  // GET /rentals/search — search listings with filters
  fastify.get(
    "/rentals/search",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const query = searchQuerySchema.parse(request.query);
        const limit = Math.min(parseInt(query.limit || "20"), 100);
        const offset = parseInt(query.offset || "0");

        const where: any = {
          visibility: "PUBLISHED",
          complianceStatus: "APPROVED",
        };

        if (query.dropzoneId) where.dropzoneId = parseInt(query.dropzoneId);
        if (query.city) where.city = { contains: query.city, mode: "insensitive" };
        if (query.guests) where.sleepingCapacity = { gte: parseInt(query.guests) };
        if (query.listingType) where.listingType = query.listingType;
        if (query.minPrice || query.maxPrice) {
          where.basePrice = {};
          if (query.minPrice) where.basePrice.gte = parseFloat(query.minPrice);
          if (query.maxPrice) where.basePrice.lte = parseFloat(query.maxPrice);
        }
        if (query.amenities) {
          const amenityList = query.amenities.split(",").map((a) => a.trim());
          where.amenities = { array_contains: amenityList };
        }

        // Exclude dates that are blocked
        if (query.checkIn && query.checkOut) {
          where.NOT = {
            availability: {
              some: {
                status: "BLOCKED",
                startDate: { lte: new Date(query.checkOut) },
                endDate: { gte: new Date(query.checkIn) },
              },
            },
          };
        }

        const orderBy = buildSortOrder(query.sort);

        const [listings, total] = await Promise.all([
          fastify.prisma.rentalListing.findMany({
            where,
            include: {
              photos: { orderBy: { sortOrder: "asc" }, take: 3 },
              host: { select: { id: true, displayName: true, hostType: true, verifiedAt: true } },
              _count: { select: { reviews: true, bookings: true } },
            },
            orderBy,
            take: limit,
            skip: offset,
          }),
          fastify.prisma.rentalListing.count({ where }),
        ]);

        reply.send({
          success: true,
          data: listings,
          meta: { total, limit, offset },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ success: false, error: "Invalid search parameters", details: error.errors });
        } else {
          reply.code(500).send({ success: false, error: "Search failed" });
        }
      }
    }
  );

  // GET /rentals/dropzone/:dropzoneId — listings near a dropzone
  fastify.get(
    "/rentals/dropzone/:dropzoneId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { dropzoneId } = request.params as { dropzoneId: string };
        const query = request.query as { limit?: string; offset?: string };
        const limit = Math.min(parseInt(query.limit || "20"), 100);
        const offset = parseInt(query.offset || "0");

        const [listings, total] = await Promise.all([
          fastify.prisma.rentalListing.findMany({
            where: {
              dropzoneId: parseInt(dropzoneId),
              visibility: "PUBLISHED",
              complianceStatus: "APPROVED",
            },
            include: {
              photos: { orderBy: { sortOrder: "asc" }, take: 3 },
              host: { select: { id: true, displayName: true, hostType: true, verifiedAt: true } },
              _count: { select: { reviews: true } },
            },
            orderBy: { distanceToDropzone: "asc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.rentalListing.count({
            where: {
              dropzoneId: parseInt(dropzoneId),
              visibility: "PUBLISHED",
              complianceStatus: "APPROVED",
            },
          }),
        ]);

        reply.send({ success: true, data: listings, meta: { total, limit, offset } });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch dropzone listings" });
      }
    }
  );

  // GET /rentals/property/:slug — listing detail
  fastify.get(
    "/rentals/property/:slug",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { slug } = request.params as { slug: string };

        const listing = await fastify.prisma.rentalListing.findUnique({
          where: { slug },
          include: {
            photos: { orderBy: { sortOrder: "asc" } },
            host: {
              select: {
                id: true,
                displayName: true,
                bio: true,
                hostType: true,
                verifiedAt: true,
              },
            },
            reviews: {
              orderBy: { createdAt: "desc" },
              take: 10,
            },
            availability: {
              where: {
                endDate: { gte: new Date() },
              },
              orderBy: { startDate: "asc" },
            },
            _count: { select: { reviews: true, bookings: true, savedBy: true } },
          },
        });

        if (!listing) throw new NotFoundError("Listing");

        // Compute average rating
        const ratingAgg = await fastify.prisma.rentalReview.aggregate({
          where: { listingId: listing.id },
          _avg: { rating: true },
          _count: { rating: true },
        });

        reply.send({
          success: true,
          data: {
            ...listing,
            averageRating: ratingAgg._avg.rating ?? null,
            reviewCount: ratingAgg._count.rating,
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to fetch listing detail" });
        }
      }
    }
  );

  // GET /rentals/event/:eventId — listings near an event venue
  fastify.get(
    "/rentals/event/:eventId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { eventId } = request.params as { eventId: string };
        const query = request.query as { limit?: string; offset?: string; radius?: string };
        const limit = Math.min(parseInt(query.limit || "20"), 100);
        const offset = parseInt(query.offset || "0");

        // Look up the event to find its dropzone
        const event = await fastify.prisma.event.findUnique({
          where: { id: parseInt(eventId) },
          select: { dropzoneId: true },
        });

        if (!event) throw new NotFoundError("Event");

        const [listings, total] = await Promise.all([
          fastify.prisma.rentalListing.findMany({
            where: {
              dropzoneId: event.dropzoneId,
              visibility: "PUBLISHED",
              complianceStatus: "APPROVED",
            },
            include: {
              photos: { orderBy: { sortOrder: "asc" }, take: 3 },
              host: { select: { id: true, displayName: true, hostType: true, verifiedAt: true } },
              _count: { select: { reviews: true } },
            },
            orderBy: { distanceToDropzone: "asc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.rentalListing.count({
            where: {
              dropzoneId: event.dropzoneId,
              visibility: "PUBLISHED",
              complianceStatus: "APPROVED",
            },
          }),
        ]);

        reply.send({ success: true, data: listings, meta: { total, limit, offset } });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to fetch event listings" });
        }
      }
    }
  );

  // ── BOOKINGS ────────────────────────────────────────────────────────────

  // POST /rentals/bookings — create booking
  fastify.post(
    "/rentals/bookings",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseInt(String(request.user.sub));
        const body = createBookingSchema.parse(request.body);

        // Validate listing exists and is bookable
        const listing = await fastify.prisma.rentalListing.findUnique({
          where: { id: body.listingId },
        });
        if (!listing) throw new NotFoundError("Listing");
        if (listing.visibility !== "PUBLISHED") {
          throw new ConflictError("Listing is not currently available for booking");
        }
        if (listing.complianceStatus !== "APPROVED") {
          throw new ConflictError("Listing has not passed compliance review");
        }

        // Validate dates
        const checkIn = new Date(body.checkInDate);
        const checkOut = new Date(body.checkOutDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        if (checkIn < now) throw new ValidationError({}, "Check-in date cannot be in the past");
        if (checkOut <= checkIn) throw new ValidationError({}, "Check-out must be after check-in");

        // Validate guest capacity
        if (body.numberOfGuests > listing.sleepingCapacity) {
          throw new ValidationError({}, `Maximum capacity is ${listing.sleepingCapacity} guests`);
        }

        // Check for date conflicts (existing bookings or blocks)
        const conflictingBooking = await fastify.prisma.rentalBooking.findFirst({
          where: {
            listingId: body.listingId,
            status: { in: ["PENDING", "HELD", "CONFIRMED"] },
            checkInDate: { lt: checkOut },
            checkOutDate: { gt: checkIn },
          },
        });
        if (conflictingBooking) {
          throw new ConflictError("Selected dates are not available — conflicting booking exists");
        }

        const conflictingBlock = await fastify.prisma.rentalAvailabilityBlock.findFirst({
          where: {
            listingId: body.listingId,
            status: "BLOCKED",
            startDate: { lte: checkOut },
            endDate: { gte: checkIn },
          },
        });
        if (conflictingBlock) {
          throw new ConflictError("Selected dates are blocked by the host");
        }

        // Compute pricing
        const numberOfNights = computeNights(body.checkInDate, body.checkOutDate);
        const basePricePerNight = Number(listing.basePrice);
        let totalPrice = basePricePerNight * numberOfNights;

        // Apply weekly/monthly discounts
        if (numberOfNights >= 28 && listing.monthlyDiscount) {
          totalPrice *= 1 - listing.monthlyDiscount / 100;
        } else if (numberOfNights >= 7 && listing.weeklyDiscount) {
          totalPrice *= 1 - listing.weeklyDiscount / 100;
        }

        const bookingFee = Math.round(totalPrice * 0.05 * 100) / 100; // 5% platform fee
        totalPrice = Math.round((totalPrice + bookingFee) * 100) / 100;

        // Determine initial status based on booking mode
        const initialStatus =
          listing.bookingMode === "INSTANT_BOOK" ? "CONFIRMED" : "PENDING";

        const booking = await fastify.prisma.rentalBooking.create({
          data: {
            listingId: body.listingId,
            guestId: userId,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            numberOfGuests: body.numberOfGuests,
            numberOfNights,
            totalPrice,
            bookingFee,
            currency: listing.currency,
            status: initialStatus,
            bookingMode: listing.bookingMode,
            specialRequests: body.specialRequests,
          },
          include: {
            listing: {
              select: { title: true, slug: true, address: true, city: true },
            },
          },
        });

        reply.code(201).send({ success: true, data: booking });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ success: false, error: "Invalid booking data", details: error.errors });
        } else if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else if (error instanceof ConflictError) {
          reply.code(409).send({ success: false, error: error.message });
        } else if (error instanceof ValidationError) {
          reply.code(400).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to create booking" });
        }
      }
    }
  );

  // GET /rentals/bookings/me — my bookings
  fastify.get(
    "/rentals/bookings/me",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseInt(String(request.user.sub));
        const query = request.query as { status?: string; limit?: string; offset?: string };
        const limit = Math.min(parseInt(query.limit || "20"), 100);
        const offset = parseInt(query.offset || "0");

        const where: any = { guestId: userId };
        if (query.status) where.status = query.status;

        const [bookings, total] = await Promise.all([
          fastify.prisma.rentalBooking.findMany({
            where,
            include: {
              listing: {
                select: {
                  title: true,
                  slug: true,
                  heroImageUrl: true,
                  address: true,
                  city: true,
                  country: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.rentalBooking.count({ where }),
        ]);

        reply.send({ success: true, data: bookings, meta: { total, limit, offset } });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch bookings" });
      }
    }
  );

  // GET /rentals/bookings/:id — booking detail
  fastify.get(
    "/rentals/bookings/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseInt(String(request.user.sub));
        const { id } = request.params as { id: string };

        const booking = await fastify.prisma.rentalBooking.findUnique({
          where: { id: parseInt(id) },
          include: {
            listing: {
              include: {
                photos: { orderBy: { sortOrder: "asc" }, take: 5 },
                host: { select: { id: true, userId: true, displayName: true, phoneNumber: true } },
              },
            },
          },
        });

        if (!booking) throw new NotFoundError("Booking");

        // Only the guest or the host can view booking details
        const isGuest = booking.guestId === userId;
        const isHost = booking.listing.host.userId === userId;
        const isAdmin = (request.user!.roles || []).some((r: string) =>
          ["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"].includes(r)
        );

        if (!isGuest && !isHost && !isAdmin) {
          throw new ForbiddenError("You do not have access to this booking");
        }

        reply.send({ success: true, data: booking });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else if (error instanceof ForbiddenError) {
          reply.code(403).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to fetch booking" });
        }
      }
    }
  );

  // POST /rentals/bookings/:id/cancel — cancel booking
  fastify.post(
    "/rentals/bookings/:id/cancel",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseInt(String(request.user.sub));
        const { id } = request.params as { id: string };
        const body = request.body as { reason?: string };

        const booking = await fastify.prisma.rentalBooking.findUnique({
          where: { id: parseInt(id) },
          include: {
            listing: { include: { host: true } },
          },
        });

        if (!booking) throw new NotFoundError("Booking");

        const isGuest = booking.guestId === userId;
        const isHost = booking.listing.host.userId === userId;
        const isAdmin = (request.user!.roles || []).some((r: string) =>
          ["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"].includes(r)
        );

        if (!isGuest && !isHost && !isAdmin) {
          throw new ForbiddenError("You cannot cancel this booking");
        }

        if (["CANCELLED", "COMPLETED", "EXPIRED"].includes(booking.status)) {
          throw new ConflictError(`Booking is already ${booking.status.toLowerCase()}`);
        }

        const cancellationBy = isHost ? "HOST" : isAdmin ? "PLATFORM" : "GUEST";

        const updated = await fastify.prisma.rentalBooking.update({
          where: { id: parseInt(id) },
          data: {
            status: "CANCELLED",
            cancellationReason: body.reason || null,
            cancellationBy,
          },
        });

        reply.send({ success: true, data: updated });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else if (error instanceof ForbiddenError) {
          reply.code(403).send({ success: false, error: error.message });
        } else if (error instanceof ConflictError) {
          reply.code(409).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to cancel booking" });
        }
      }
    }
  );

  // POST /rentals/bookings/:id/confirm — host confirms booking (REQUEST_TO_BOOK)
  fastify.post(
    "/rentals/bookings/:id/confirm",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseInt(String(request.user.sub));
        const { id } = request.params as { id: string };

        const booking = await fastify.prisma.rentalBooking.findUnique({
          where: { id: parseInt(id) },
          include: {
            listing: { include: { host: true } },
          },
        });

        if (!booking) throw new NotFoundError("Booking");

        // Only the host or an admin can confirm
        const isHost = booking.listing.host.userId === userId;
        const isAdmin = (request.user!.roles || []).some((r: string) =>
          ["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"].includes(r)
        );

        if (!isHost && !isAdmin) {
          throw new ForbiddenError("Only the host or an admin can confirm bookings");
        }

        if (booking.status !== "PENDING") {
          throw new ConflictError(`Booking cannot be confirmed — current status is ${booking.status}`);
        }

        const updated = await fastify.prisma.rentalBooking.update({
          where: { id: parseInt(id) },
          data: { status: "CONFIRMED" },
        });

        reply.send({ success: true, data: updated });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else if (error instanceof ForbiddenError) {
          reply.code(403).send({ success: false, error: error.message });
        } else if (error instanceof ConflictError) {
          reply.code(409).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to confirm booking" });
        }
      }
    }
  );

  // ── HOST & DASHBOARD ────────────────────────────────────────────────────

  // POST /rentals/listings — create listing
  fastify.post(
    "/rentals/listings",
    {
      preHandler: [
        authenticate,
        authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const userId = parseInt(String(request.user.sub));
        const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
        const body = createListingSchema.parse(request.body);

        // Check slug uniqueness
        const existingSlug = await fastify.prisma.rentalListing.findUnique({
          where: { slug: body.slug },
        });
        if (existingSlug) throw new ConflictError("A listing with this slug already exists");

        // Ensure host profile exists
        const host = await ensureHostProfile(
          fastify.prisma,
          userId,
          request.user.email || "Host"
        );

        const listing = await fastify.prisma.rentalListing.create({
          data: {
            dropzoneId,
            hostId: host.id,
            title: body.title,
            slug: body.slug,
            description: body.description,
            listingType: body.listingType,
            hostType: body.hostType,
            address: body.address,
            city: body.city,
            country: body.country,
            latitude: body.latitude,
            longitude: body.longitude,
            distanceToDropzone: body.distanceToDropzone,
            sleepingCapacity: body.sleepingCapacity,
            bathrooms: body.bathrooms,
            petPolicy: body.petPolicy,
            cancellationPolicy: body.cancellationPolicy,
            bookingMode: body.bookingMode,
            basePrice: body.basePrice,
            currency: body.currency,
            weeklyDiscount: body.weeklyDiscount,
            monthlyDiscount: body.monthlyDiscount,
            amenities: body.amenities ?? [],
            skydiverAmenities: body.skydiverAmenities ?? {},
            heroImageUrl: body.heroImageUrl,
            visibility: "DRAFT",
            complianceStatus: "DRAFT",
          },
          include: {
            host: { select: { id: true, displayName: true } },
          },
        });

        reply.code(201).send({ success: true, data: listing });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ success: false, error: "Invalid listing data", details: error.errors });
        } else if (error instanceof ConflictError) {
          reply.code(409).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to create listing" });
        }
      }
    }
  );

  // PATCH /rentals/listings/:id — update listing
  fastify.patch(
    "/rentals/listings/:id",
    {
      preHandler: [
        authenticate,
        authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const userId = parseInt(String(request.user.sub));
        const { id } = request.params as { id: string };
        const body = updateListingSchema.parse(request.body);

        await verifyListingOwnership(fastify.prisma, parseInt(id), userId);

        // If slug is being updated, check uniqueness
        if (body.slug) {
          const existingSlug = await fastify.prisma.rentalListing.findFirst({
            where: { slug: body.slug, id: { not: parseInt(id) } },
          });
          if (existingSlug) throw new ConflictError("A listing with this slug already exists");
        }

        const updated = await fastify.prisma.rentalListing.update({
          where: { id: parseInt(id) },
          data: body as any,
          include: {
            host: { select: { id: true, displayName: true } },
            photos: { orderBy: { sortOrder: "asc" } },
          },
        });

        reply.send({ success: true, data: updated });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ success: false, error: "Invalid listing data", details: error.errors });
        } else if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else if (error instanceof ForbiddenError) {
          reply.code(403).send({ success: false, error: error.message });
        } else if (error instanceof ConflictError) {
          reply.code(409).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to update listing" });
        }
      }
    }
  );

  // GET /rentals/listings/mine — host's own listings
  fastify.get(
    "/rentals/listings/mine",
    {
      preHandler: [
        authenticate,
        authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const userId = parseInt(String(request.user.sub));
        const query = request.query as { status?: string; limit?: string; offset?: string };
        const limit = Math.min(parseInt(query.limit || "20"), 100);
        const offset = parseInt(query.offset || "0");

        const host = await fastify.prisma.rentalHost.findUnique({
          where: { userId },
        });

        if (!host) {
          reply.send({ success: true, data: [], meta: { total: 0, limit, offset } });
          return;
        }

        const where: any = { hostId: host.id };
        if (query.status) where.visibility = query.status;

        const [listings, total] = await Promise.all([
          fastify.prisma.rentalListing.findMany({
            where,
            include: {
              photos: { orderBy: { sortOrder: "asc" }, take: 3 },
              _count: { select: { bookings: true, reviews: true } },
            },
            orderBy: { updatedAt: "desc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.rentalListing.count({ where }),
        ]);

        reply.send({ success: true, data: listings, meta: { total, limit, offset } });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch listings" });
      }
    }
  );

  // POST /rentals/availability/block — block dates for a listing
  fastify.post(
    "/rentals/availability/block",
    {
      preHandler: [
        authenticate,
        authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const userId = parseInt(String(request.user.sub));
        const body = blockAvailabilitySchema.parse(request.body);

        await verifyListingOwnership(fastify.prisma, body.listingId, userId);

        const startDate = new Date(body.startDate);
        const endDate = new Date(body.endDate);
        if (endDate <= startDate) {
          throw new ValidationError({}, "End date must be after start date");
        }

        const block = await fastify.prisma.rentalAvailabilityBlock.create({
          data: {
            listingId: body.listingId,
            startDate,
            endDate,
            status: body.status,
            priceOverride: body.priceOverride,
            note: body.note,
          },
        });

        reply.code(201).send({ success: true, data: block });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ success: false, error: "Invalid availability data", details: error.errors });
        } else if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else if (error instanceof ForbiddenError) {
          reply.code(403).send({ success: false, error: error.message });
        } else if (error instanceof ValidationError) {
          reply.code(400).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to block availability" });
        }
      }
    }
  );

  // POST /rentals/pricing/rules — set pricing rules for a listing
  fastify.post(
    "/rentals/pricing/rules",
    {
      preHandler: [
        authenticate,
        authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const userId = parseInt(String(request.user.sub));
        const body = pricingRuleSchema.parse(request.body);

        await verifyListingOwnership(fastify.prisma, body.listingId, userId);

        const updateData: any = {};
        if (body.weeklyDiscount !== undefined) updateData.weeklyDiscount = body.weeklyDiscount;
        if (body.monthlyDiscount !== undefined) updateData.monthlyDiscount = body.monthlyDiscount;
        if (body.basePrice !== undefined) updateData.basePrice = body.basePrice;

        const updated = await fastify.prisma.rentalListing.update({
          where: { id: body.listingId },
          data: updateData,
          select: {
            id: true,
            title: true,
            basePrice: true,
            weeklyDiscount: true,
            monthlyDiscount: true,
            currency: true,
          },
        });

        reply.send({ success: true, data: updated });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ success: false, error: "Invalid pricing data", details: error.errors });
        } else if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else if (error instanceof ForbiddenError) {
          reply.code(403).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to update pricing" });
        }
      }
    }
  );

  // ── REVIEWS ─────────────────────────────────────────────────────────────

  // POST /rentals/reviews — leave a review
  fastify.post(
    "/rentals/reviews",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseInt(String(request.user.sub));
        const body = createReviewSchema.parse(request.body);

        // Verify the listing exists
        const listing = await fastify.prisma.rentalListing.findUnique({
          where: { id: body.listingId },
        });
        if (!listing) throw new NotFoundError("Listing");

        // Verify the user had a completed booking for this listing
        const completedBooking = await fastify.prisma.rentalBooking.findFirst({
          where: {
            listingId: body.listingId,
            guestId: userId,
            status: { in: ["CONFIRMED", "COMPLETED"] },
            checkOutDate: { lte: new Date() },
          },
        });
        if (!completedBooking) {
          throw new ForbiddenError("You can only review listings where you have completed a stay");
        }

        // Check for duplicate review
        const existingReview = await fastify.prisma.rentalReview.findFirst({
          where: {
            listingId: body.listingId,
            userId,
            bookingId: body.bookingId ?? completedBooking.id,
          },
        });
        if (existingReview) {
          throw new ConflictError("You have already reviewed this booking");
        }

        const review = await fastify.prisma.rentalReview.create({
          data: {
            listingId: body.listingId,
            userId,
            bookingId: body.bookingId ?? completedBooking.id,
            rating: body.rating,
            title: body.title,
            body: body.body,
          },
        });

        reply.code(201).send({ success: true, data: review });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ success: false, error: "Invalid review data", details: error.errors });
        } else if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else if (error instanceof ForbiddenError) {
          reply.code(403).send({ success: false, error: error.message });
        } else if (error instanceof ConflictError) {
          reply.code(409).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to create review" });
        }
      }
    }
  );

  // GET /rentals/reviews/:listingId — list reviews for a listing
  fastify.get(
    "/rentals/reviews/:listingId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { listingId } = request.params as { listingId: string };
        const query = request.query as { limit?: string; offset?: string; sort?: string };
        const limit = Math.min(parseInt(query.limit || "20"), 100);
        const offset = parseInt(query.offset || "0");

        const listingExists = await fastify.prisma.rentalListing.findUnique({
          where: { id: parseInt(listingId) },
          select: { id: true },
        });
        if (!listingExists) throw new NotFoundError("Listing");

        const orderBy =
          query.sort === "rating_asc"
            ? { rating: "asc" as const }
            : query.sort === "rating_desc"
              ? { rating: "desc" as const }
              : { createdAt: "desc" as const };

        const [reviews, total, ratingAgg] = await Promise.all([
          fastify.prisma.rentalReview.findMany({
            where: { listingId: parseInt(listingId) },
            orderBy,
            take: limit,
            skip: offset,
          }),
          fastify.prisma.rentalReview.count({
            where: { listingId: parseInt(listingId) },
          }),
          fastify.prisma.rentalReview.aggregate({
            where: { listingId: parseInt(listingId) },
            _avg: { rating: true },
          }),
        ]);

        reply.send({
          success: true,
          data: reviews,
          meta: {
            total,
            limit,
            offset,
            averageRating: ratingAgg._avg.rating ?? null,
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to fetch reviews" });
        }
      }
    }
  );

  // ── SAVED PROPERTIES ────────────────────────────────────────────────────

  // POST /rentals/saved — save a property
  fastify.post(
    "/rentals/saved",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseInt(String(request.user.sub));
        const body = request.body as { listingId: number };

        if (!body.listingId || typeof body.listingId !== "number") {
          throw new ValidationError({}, "listingId is required and must be a number");
        }

        const listing = await fastify.prisma.rentalListing.findUnique({
          where: { id: body.listingId },
          select: { id: true },
        });
        if (!listing) throw new NotFoundError("Listing");

        // Upsert to handle duplicates gracefully
        const saved = await fastify.prisma.rentalSavedProperty.upsert({
          where: {
            userId_listingId: { userId, listingId: body.listingId },
          },
          create: { userId, listingId: body.listingId },
          update: {}, // no-op if already saved
        });

        reply.code(201).send({ success: true, data: saved });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else if (error instanceof ValidationError) {
          reply.code(400).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to save property" });
        }
      }
    }
  );

  // DELETE /rentals/saved/:listingId — unsave a property
  fastify.delete(
    "/rentals/saved/:listingId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseInt(String(request.user.sub));
        const { listingId } = request.params as { listingId: string };

        await fastify.prisma.rentalSavedProperty.deleteMany({
          where: {
            userId,
            listingId: parseInt(listingId),
          },
        });

        reply.send({ success: true, data: { removed: true } });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to unsave property" });
      }
    }
  );

  // GET /rentals/saved/me — my saved properties
  fastify.get(
    "/rentals/saved/me",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseInt(String(request.user.sub));
        const query = request.query as { limit?: string; offset?: string };
        const limit = Math.min(parseInt(query.limit || "20"), 100);
        const offset = parseInt(query.offset || "0");

        const [saved, total] = await Promise.all([
          fastify.prisma.rentalSavedProperty.findMany({
            where: { userId },
            include: {
              listing: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  heroImageUrl: true,
                  basePrice: true,
                  currency: true,
                  city: true,
                  country: true,
                  listingType: true,
                  sleepingCapacity: true,
                  distanceToDropzone: true,
                },
              },
            },
            orderBy: { savedAt: "desc" },
            take: limit,
            skip: offset,
          }),
          fastify.prisma.rentalSavedProperty.count({ where: { userId } }),
        ]);

        reply.send({ success: true, data: saved, meta: { total, limit, offset } });
      } catch (error) {
        reply.code(500).send({ success: false, error: "Failed to fetch saved properties" });
      }
    }
  );

  // ── COMPLIANCE ──────────────────────────────────────────────────────────

  // POST /rentals/compliance — submit compliance record
  fastify.post(
    "/rentals/compliance",
    {
      preHandler: [
        authenticate,
        authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
        const body = complianceSubmitSchema.parse(request.body);

        const listing = await fastify.prisma.rentalListing.findUnique({
          where: { id: body.listingId },
          select: { id: true, dropzoneId: true },
        });
        if (!listing) throw new NotFoundError("Listing");
        if (listing.dropzoneId !== dropzoneId) {
          throw new ForbiddenError("Listing does not belong to your dropzone");
        }

        const record = await fastify.prisma.rentalComplianceRecord.create({
          data: {
            listingId: body.listingId,
            dropzoneId,
            approvalState: "PENDING_APPROVAL",
            permitMetadata: body.permitMetadata ? JSON.parse(JSON.stringify(body.permitMetadata)) : undefined,
            complianceNotes: body.complianceNotes,
            documentUrls: body.documentUrls ?? [],
          },
        });

        // Update listing compliance status to pending
        await fastify.prisma.rentalListing.update({
          where: { id: body.listingId },
          data: { complianceStatus: "PENDING_APPROVAL" },
        });

        reply.code(201).send({ success: true, data: record });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ success: false, error: "Invalid compliance data", details: error.errors });
        } else if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else if (error instanceof ForbiddenError) {
          reply.code(403).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to submit compliance record" });
        }
      }
    }
  );

  // GET /rentals/compliance/:listingId — get compliance status for a listing
  fastify.get(
    "/rentals/compliance/:listingId",
    {
      preHandler: [
        authenticate,
        authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const { listingId } = request.params as { listingId: string };

        const records = await fastify.prisma.rentalComplianceRecord.findMany({
          where: { listingId: parseInt(listingId) },
          orderBy: { createdAt: "desc" },
        });

        const listing = await fastify.prisma.rentalListing.findUnique({
          where: { id: parseInt(listingId) },
          select: { id: true, complianceStatus: true, title: true },
        });

        if (!listing) throw new NotFoundError("Listing");

        reply.send({
          success: true,
          data: {
            listing: {
              id: listing.id,
              title: listing.title,
              complianceStatus: listing.complianceStatus,
            },
            records,
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to fetch compliance status" });
        }
      }
    }
  );

  // PATCH /rentals/compliance/:id/approve — approve a listing
  fastify.patch(
    "/rentals/compliance/:id/approve",
    {
      preHandler: [
        authenticate,
        authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const userId = parseInt(String(request.user.sub));
        const { id } = request.params as { id: string };
        const body = request.body as { approved: boolean; notes?: string };

        const record = await fastify.prisma.rentalComplianceRecord.findUnique({
          where: { id: parseInt(id) },
        });
        if (!record) throw new NotFoundError("Compliance record");

        const newState = body.approved ? "APPROVED" : "REJECTED";

        const updated = await fastify.prisma.rentalComplianceRecord.update({
          where: { id: parseInt(id) },
          data: {
            approvalState: newState,
            complianceNotes: body.notes
              ? `${record.complianceNotes ? record.complianceNotes + "\n" : ""}${body.notes}`
              : record.complianceNotes,
            verifiedAt: new Date(),
            verifiedById: userId,
          },
        });

        // Sync listing compliance status
        await fastify.prisma.rentalListing.update({
          where: { id: record.listingId },
          data: {
            complianceStatus: newState,
            // Auto-publish if approved and currently in DRAFT visibility
            ...(body.approved ? { visibility: "PUBLISHED" } : {}),
          },
        });

        reply.send({ success: true, data: updated });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to update compliance status" });
        }
      }
    }
  );

  // ── LISTING PHOTOS ────────────────────────────────────────────────────

  const s3 = new S3Service();

  // POST /rentals/listings/:listingId/photos — upload a photo for a listing
  fastify.post(
    "/rentals/listings/:listingId/photos",
    {
      preHandler: [
        authenticate,
        authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const userId = parseInt(String(request.user.sub));
        const { listingId } = request.params as { listingId: string };
        const listingIdNum = parseInt(listingId);
        const body = request.body as { fileName: string; contentType: string; caption?: string };

        if (!body.fileName || !body.contentType) {
          throw new ValidationError({}, "fileName and contentType are required");
        }

        // Verify ownership
        const listing = await verifyListingOwnership(fastify.prisma, listingIdNum, userId);

        // Generate presigned upload URL (S3 or local fallback)
        const presignResult = await s3.getPresignedUploadUrl({
          category: "rental",
          fileName: body.fileName,
          contentType: body.contentType,
          dropzoneId: String(listing.dropzoneId),
          userId: String(userId),
        });
        const uploadUrl = presignResult.uploadUrl;
        const fileKey = presignResult.fileKey;

        // Construct the public URL from the file key
        let publicUrl: string;
        if (s3.isLocalFallback()) {
          // Local storage — URL served by our own GET /uploads/* route
          const port = process.env.API_PORT || process.env.PORT || "3001";
          publicUrl = `http://localhost:${port}/uploads/${fileKey}`;
        } else {
          const bucket = process.env.S3_BUCKET_NAME || "skylara-uploads";
          publicUrl = `https://${bucket}.s3.amazonaws.com/${fileKey}`;
        }

        // If base64 data is provided in the body, write the file locally now
        const bodyWithData = body as { fileName: string; contentType: string; caption?: string; data?: string };
        if (bodyWithData.data && s3.isLocalFallback()) {
          const buffer = Buffer.from(bodyWithData.data, "base64");
          s3.saveLocal(fileKey, buffer);
        }

        // Determine next sort order
        const maxSort = await fastify.prisma.rentalPhoto.aggregate({
          where: { listingId: listingIdNum },
          _max: { sortOrder: true },
        });
        const nextSortOrder = (maxSort._max.sortOrder ?? -1) + 1;

        // Create the RentalPhoto record with the S3 URL
        const photo = await fastify.prisma.rentalPhoto.create({
          data: {
            listingId: listingIdNum,
            url: publicUrl,
            caption: body.caption || null,
            sortOrder: nextSortOrder,
          },
        });

        reply.code(201).send({
          success: true,
          data: {
            uploadUrl,
            photoId: photo.id,
            publicUrl,
            fileKey,
            s3Configured: !s3.isLocalFallback(),
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else if (error instanceof ForbiddenError) {
          reply.code(403).send({ success: false, error: error.message });
        } else if (error instanceof ValidationError) {
          reply.code(400).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to upload photo" });
        }
      }
    }
  );

  // DELETE /rentals/listings/:listingId/photos/:photoId — delete a listing photo
  fastify.delete(
    "/rentals/listings/:listingId/photos/:photoId",
    {
      preHandler: [
        authenticate,
        authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const userId = parseInt(String(request.user.sub));
        const { listingId, photoId } = request.params as { listingId: string; photoId: string };
        const listingIdNum = parseInt(listingId);
        const photoIdNum = parseInt(photoId);

        // Verify ownership
        await verifyListingOwnership(fastify.prisma, listingIdNum, userId);

        // Find the photo
        const photo = await fastify.prisma.rentalPhoto.findFirst({
          where: { id: photoIdNum, listingId: listingIdNum },
        });
        if (!photo) throw new NotFoundError("Photo");

        // Attempt to delete from S3 if configured
        const s3Available = await s3.isAvailable();
        if (s3Available) {
          try {
            // Extract the file key from the URL
            const url = new URL(photo.url);
            const fileKey = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
            if (fileKey) {
              await s3.deleteFile(fileKey);
            }
          } catch {
            // S3 deletion is best-effort; log but don't block DB cleanup
            console.warn(`[Rentals] Failed to delete S3 object for photo ${photoIdNum}`);
          }
        }

        // Delete the DB record
        await fastify.prisma.rentalPhoto.delete({
          where: { id: photoIdNum },
        });

        reply.send({ success: true, data: { deleted: true, photoId: photoIdNum } });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else if (error instanceof ForbiddenError) {
          reply.code(403).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to delete photo" });
        }
      }
    }
  );

  // ── HOST STRIPE CONNECT ─────────────────────────────────────────────────

  // POST /rentals/hosts/connect-stripe — create or retrieve Stripe Connect account
  fastify.post(
    "/rentals/hosts/connect-stripe",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        // Check if Stripe is configured
        if (!process.env.STRIPE_SECRET_KEY) {
          reply.code(503).send({
            success: false,
            error: "Stripe not configured — set STRIPE_SECRET_KEY in environment",
          });
          return;
        }

        const userId = parseInt(String(request.user.sub));
        const isTestMode = (process.env.STRIPE_SECRET_KEY || "").startsWith("sk_test_");

        // Ensure the user has a host profile
        const host = await ensureHostProfile(
          fastify.prisma,
          userId,
          request.user.email || "Host"
        );

        // ── Stripe test mode: mock connected account ───────────────────
        if (isTestMode) {
          fastify.log.info("[Stripe] Running in Stripe test mode — connect-stripe");

          if (host.stripeConnectId) {
            reply.send({
              success: true,
              data: {
                accountId: host.stripeConnectId,
                status: "ACTIVE",
                chargesEnabled: true,
                payoutsEnabled: true,
                testMode: true,
              },
            });
            return;
          }

          // Create a mock connected account ID
          const mockAccountId = `acct_test_${userId}_${Date.now()}`;

          // Store the mock Stripe Connect ID on the host profile
          await fastify.prisma.rentalHost.update({
            where: { id: host.id },
            data: { stripeConnectId: mockAccountId },
          });

          // Create a mock StripeAccount record so DB queries don't fail later
          await fastify.prisma.stripeAccount.create({
            data: {
              stripeAccountId: mockAccountId,
              userId,
              dropzoneId: null,
              accountType: "express",
              chargesEnabled: true,
              payoutsEnabled: true,
              onboardingComplete: true,
              detailsSubmitted: true,
              defaultCurrency: "usd",
              metadata: { testMode: true, createdAt: new Date().toISOString() },
            },
          });

          reply.code(201).send({
            success: true,
            data: {
              accountId: mockAccountId,
              onboardingUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/rentals/host/stripe/success?test=1`,
              testMode: true,
            },
          });
          return;
        }

        // ── Live Stripe path ───────────────────────────────────────────

        // Check if host already has a Stripe Connect account
        if (host.stripeConnectId) {
          // Retrieve the existing account status from our DB
          const stripeAccount = await fastify.prisma.stripeAccount.findUnique({
            where: { stripeAccountId: host.stripeConnectId },
          });

          if (stripeAccount && stripeAccount.onboardingComplete) {
            reply.send({
              success: true,
              data: {
                accountId: host.stripeConnectId,
                status: "ACTIVE",
                chargesEnabled: stripeAccount.chargesEnabled,
                payoutsEnabled: stripeAccount.payoutsEnabled,
              },
            });
            return;
          }

          // Account exists but onboarding incomplete — generate a fresh onboarding link
          const paymentService = new PaymentService(fastify.prisma);
          const frontendBase = process.env.FRONTEND_URL || "http://localhost:3000";
          if (!process.env.FRONTEND_URL && process.env.NODE_ENV === "production") {
            fastify.log.warn("FRONTEND_URL not set in production — Stripe redirects will use localhost");
          }
          const refreshUrl = `${frontendBase}/rentals/host/stripe/refresh`;
          const returnUrl = `${frontendBase}/rentals/host/stripe/success`;
          const onboardingUrl = await paymentService.getOnboardingLink(
            host.stripeConnectId,
            refreshUrl,
            returnUrl
          );

          reply.send({
            success: true,
            data: {
              accountId: host.stripeConnectId,
              status: "ONBOARDING_INCOMPLETE",
              onboardingUrl,
            },
          });
          return;
        }

        // No existing account — create a new Stripe Connect Express account
        const paymentService = new PaymentService(fastify.prisma);
        const result = await paymentService.createConnectedAccount(userId, null, "express");

        // Store the Stripe Connect ID on the host profile
        await fastify.prisma.rentalHost.update({
          where: { id: host.id },
          data: { stripeConnectId: result.stripeAccountId },
        });

        reply.code(201).send({
          success: true,
          data: {
            accountId: result.stripeAccountId,
            onboardingUrl: result.accountLink,
          },
        });
      } catch (error: any) {
        reply.code(500).send({
          success: false,
          error: error.message || "Failed to set up Stripe Connect account",
        });
      }
    }
  );

  // GET /rentals/hosts/payout-status — get host Stripe Connect status and payouts
  fastify.get(
    "/rentals/hosts/payout-status",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        // Check if Stripe is configured
        if (!process.env.STRIPE_SECRET_KEY) {
          reply.code(503).send({
            success: false,
            error: "Stripe not configured — set STRIPE_SECRET_KEY in environment",
          });
          return;
        }

        const userId = parseInt(String(request.user.sub));
        const isTestMode = (process.env.STRIPE_SECRET_KEY || "").startsWith("sk_test_");

        const host = await fastify.prisma.rentalHost.findUnique({
          where: { userId },
        });

        if (!host) {
          reply.send({
            success: true,
            data: {
              hasHostProfile: false,
              stripeConnected: false,
            },
          });
          return;
        }

        if (!host.stripeConnectId) {
          reply.send({
            success: true,
            data: {
              hasHostProfile: true,
              stripeConnected: false,
              payoutEnabled: host.payoutEnabled,
            },
          });
          return;
        }

        // ── Stripe test mode: return mock payout data ──────────────────
        if (isTestMode) {
          fastify.log.info("[Stripe] Running in Stripe test mode — payout-status");
          reply.send({
            success: true,
            data: {
              hasHostProfile: true,
              stripeConnected: true,
              accountId: host.stripeConnectId,
              status: "TEST_MODE",
              chargesEnabled: true,
              payoutsEnabled: true,
              onboardingComplete: true,
              detailsSubmitted: true,
              defaultCurrency: "usd",
              payoutEnabled: host.payoutEnabled,
              testMode: true,
              payouts: [],
            },
          });
          return;
        }

        // ── Live Stripe path ───────────────────────────────────────────

        // Get Stripe account details from our DB
        const stripeAccount = await fastify.prisma.stripeAccount.findUnique({
          where: { stripeAccountId: host.stripeConnectId },
        });

        // Get payout history
        const payouts = await fastify.prisma.payout.findMany({
          where: { stripeAccountId: stripeAccount?.id },
          orderBy: { initiatedAt: "desc" },
          take: 20,
        });

        reply.send({
          success: true,
          data: {
            hasHostProfile: true,
            stripeConnected: true,
            accountId: host.stripeConnectId,
            chargesEnabled: stripeAccount?.chargesEnabled ?? false,
            payoutsEnabled: stripeAccount?.payoutsEnabled ?? false,
            onboardingComplete: stripeAccount?.onboardingComplete ?? false,
            detailsSubmitted: stripeAccount?.detailsSubmitted ?? false,
            defaultCurrency: stripeAccount?.defaultCurrency ?? "usd",
            payoutEnabled: host.payoutEnabled,
            payouts: payouts.map((p: any) => ({
              id: p.id,
              amount: p.amount,
              currency: p.currency,
              status: p.status,
              initiatedAt: p.initiatedAt,
              scheduledAt: p.scheduledAt,
              paidAt: p.paidAt,
              failureReason: p.failureReason,
            })),
          },
        });
      } catch (error: any) {
        reply.code(500).send({
          success: false,
          error: error.message || "Failed to fetch payout status",
        });
      }
    }
  );

  // ── PARTNER SYNC ────────────────────────────────────────────────────────

  // POST /rentals/partner-sync — Trigger partner inventory sync
  fastify.post(
    "/rentals/partner-sync",
    {
      preHandler: [
        authenticate,
        authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const userId = parseInt(String(request.user.sub));
        const dropzoneId = parseInt(String(request.user.dropzoneId));
        if (!dropzoneId) {
          return reply.code(400).send({ success: false, error: "No dropzone context" });
        }

        const {
          RentalPartnerSyncService,
          DemoPartnerAdapter,
          BookingComAdapter,
          AirbnbAdapter,
          ChannelManagerAdapter,
        } = await import("../services/rentalPartnerSync");
        const syncService = new RentalPartnerSyncService(fastify.prisma);
        syncService.registerAdapter(new DemoPartnerAdapter());
        syncService.registerAdapter(new BookingComAdapter());
        syncService.registerAdapter(new AirbnbAdapter());
        syncService.registerAdapter(new ChannelManagerAdapter());

        // Ensure host profile
        let host = await fastify.prisma.rentalHost.findUnique({ where: { userId } });
        if (!host) {
          host = await fastify.prisma.rentalHost.create({
            data: { userId, displayName: request.user.email || "Host" },
          });
        }

        const body = (request.body as any) || {};
        const partnerName = body.partner || "demo";
        const config = body.config || {};

        const result = await syncService.syncPartner(partnerName, dropzoneId, host.id, config);

        reply.send({ success: true, data: result });
      } catch (error: any) {
        reply.code(500).send({
          success: false,
          error: error.message || "Partner sync failed",
        });
      }
    }
  );

  // GET /rentals/partner-adapters — List available partner adapters
  fastify.get(
    "/rentals/partner-adapters",
    {
      preHandler: [
        authenticate,
        authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (_request, reply) => {
      const {
        RentalPartnerSyncService,
        DemoPartnerAdapter,
        BookingComAdapter,
        AirbnbAdapter,
        ChannelManagerAdapter,
      } = await import("../services/rentalPartnerSync");
      const syncService = new RentalPartnerSyncService(fastify.prisma);
      syncService.registerAdapter(new DemoPartnerAdapter());
      syncService.registerAdapter(new BookingComAdapter());
      syncService.registerAdapter(new AirbnbAdapter());
      syncService.registerAdapter(new ChannelManagerAdapter());
      const adapters = await syncService.listAdapters();
      reply.send({ success: true, data: { adapters } });
    }
  );
}
