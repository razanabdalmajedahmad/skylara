import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import { NotFoundError, ConflictError } from "../utils/errors";
import { AuditService } from "../services/auditService";
import { BookingService } from "../services/bookingService";
import { EodReconciliationService } from "../services/eodReconciliation";
import {
  getSupportedCurrencies,
  getRates,
  convertFromAED,
  formatCurrency,
  isSupportedCurrency,
  SupportedCurrency,
} from "../services/fxService";

// ============================================================================
// BOOKING ROUTES — Packages, bookings, pricing, EOD reconciliation
// ============================================================================

const createBookingSchema = z.object({
  packageId: z.number().int().positive().optional(),
  bookingType: z.string(),
  scheduledDate: z.string(), // YYYY-MM-DD
  scheduledTime: z.string().optional(),
  notes: z.string().optional(),
});

const createPackageSchema = z.object({
  name: z.string().min(1),
  activityType: z.string(),
  description: z.string().optional(),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().default("USD"),
  includes: z.array(z.string()).optional(),
});

export async function bookingRoutes(fastify: FastifyInstance) {
  const auditService = new AuditService(fastify.prisma);
  const bookingService = new BookingService(fastify.prisma);
  const eodService = new EodReconciliationService(fastify.prisma);

  // ── BOOKING PACKAGES (public listing) ──────────────────────────────

  fastify.get(
    "/booking-packages",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);

      const packages = await fastify.prisma.bookingPackage.findMany({
        where: { dropzoneId, isActive: true },
        orderBy: { priceCents: "asc" },
      });

      reply.send({ success: true, data: packages });
    }
  );

  // Create package (DZ_MANAGER+)
  fastify.post(
    "/booking-packages",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const body = createPackageSchema.parse(request.body);

      const pkg = await fastify.prisma.bookingPackage.create({
        data: {
          dropzoneId,
          name: body.name,
          activityType: body.activityType,
          description: body.description,
          priceCents: body.priceCents,
          currency: body.currency,
          includes: body.includes ?? [],
        },
      });

      reply.code(201).send({ success: true, data: pkg });
    }
  );

  // ── MY BOOKINGS (athlete-facing) ────────────────────────────────────

  // GET /booking/my-bookings?status=CONFIRMED,PENDING
  fastify.get(
    "/booking/my-bookings",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = parseInt(String(request.user!.sub));
        const query = request.query as { status?: string };

        const where: any = { userId };

        // Filter by comma-separated statuses if provided
        if (query.status) {
          const statuses = query.status
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          if (statuses.length > 0) {
            where.status = { in: statuses };
          }
        }

        const bookings = await fastify.prisma.booking.findMany({
          where,
          orderBy: { scheduledDate: "desc" },
          include: {
            package: {
              select: { name: true, description: true, priceCents: true, currency: true },
            },
          },
          take: 50,
        });

        const data = bookings.map((b: any) => ({
          id: b.id,
          packageName: b.package?.name ?? b.bookingType,
          status: b.status,
          date: b.scheduledDate,
          jumpType: b.bookingType,
          price: b.package?.priceCents ?? null,
          currency: b.package?.currency ?? null,
          createdAt: b.createdAt,
        }));

        reply.send({ success: true, data });
      } catch (error) {
        fastify.log.error(error, "Failed to fetch my bookings");
        reply.code(500).send({ success: false, error: "Failed to fetch bookings" });
      }
    }
  );

  // ── BOOKINGS ───────────────────────────────────────────────────────

  // Create booking
  fastify.post(
    "/bookings",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
        const userId = parseInt(String(request.user!.sub));
        const body = createBookingSchema.parse(request.body);

        const booking = await bookingService.createBooking({
          userId,
          dropzoneId,
          packageId: body.packageId,
          bookingType: body.bookingType,
          scheduledDate: new Date(body.scheduledDate),
          scheduledTime: body.scheduledTime,
          notes: body.notes,
        });

        await auditService.log({
          userId,
          dropzoneId,
          action: "BOOKING_CREATE",
          entityType: "Booking",
          entityId: booking.id,
          afterState: { bookingType: body.bookingType, scheduledDate: body.scheduledDate },
        });

        fastify.broadcastToDropzone(dropzoneId.toString(), {
          type: "BOOKING_CREATED",
          data: { bookingId: booking.id, bookingType: booking.bookingType },
        });

        reply.code(201).send({ success: true, data: booking });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else if (error instanceof ConflictError) {
          reply.code(409).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to create booking" });
        }
      }
    }
  );

  // List bookings
  fastify.get(
    "/bookings",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const query = request.query as any;
      const isStaff = (request.user!.roles || []).some((r: string) =>
        ["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"].includes(r)
      );

      const result = await bookingService.listBookings(dropzoneId, {
        userId: isStaff ? query.userId ? parseInt(query.userId) : undefined : parseInt(String(request.user!.sub)),
        status: query.status,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
        limit: query.limit ? parseInt(query.limit) : 50,
        offset: query.offset ? parseInt(query.offset) : 0,
      });

      reply.send({ success: true, data: result.bookings, meta: { total: result.total } });
    }
  );

  // Get booking detail
  fastify.get<{ Params: { bookingId: string } }>(
    "/bookings/:bookingId",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const bookingId = parseInt((request.params as any).bookingId);

      const booking = await fastify.prisma.booking.findFirst({
        where: { id: bookingId, dropzoneId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          package: true,
          bookingRequests: {
            include: {
              instructor: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });

      if (!booking) throw new NotFoundError("Booking");

      reply.send({ success: true, data: booking });
    }
  );

  // Confirm booking
  fastify.post<{ Params: { bookingId: string } }>(
    "/bookings/:bookingId/confirm",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      try {
        const bookingId = parseInt((request.params as any).bookingId);
        const body = request.body as { paymentIntentId?: number };

        const booking = await bookingService.confirmBooking(
          bookingId,
          body.paymentIntentId
        );

        reply.send({ success: true, data: booking });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else if (error instanceof ConflictError) {
          reply.code(409).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to confirm booking" });
        }
      }
    }
  );

  // Cancel booking
  fastify.post<{ Params: { bookingId: string } }>(
    "/bookings/:bookingId/cancel",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      try {
        const bookingId = parseInt((request.params as any).bookingId);
        const userId = parseInt(String(request.user!.sub));
        const body = request.body as { reason?: string };

        const booking = await bookingService.cancelBooking(
          bookingId,
          userId,
          body.reason
        );

        await auditService.log({
          userId,
          dropzoneId: parseInt(request.user!.dropzoneId!, 10),
          action: "BOOKING_CANCEL",
          entityType: "Booking",
          entityId: bookingId,
          afterState: { reason: body.reason },
        });

        reply.send({ success: true, data: booking });
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.code(404).send({ success: false, error: error.message });
        } else if (error instanceof ConflictError) {
          reply.code(409).send({ success: false, error: error.message });
        } else {
          reply.code(500).send({ success: false, error: "Failed to cancel booking" });
        }
      }
    }
  );

  // ── PRICING ────────────────────────────────────────────────────────

  fastify.get(
    "/pricing",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const pricing = await bookingService.getPricing(dropzoneId);
      reply.send({ success: true, data: pricing });
    }
  );

  // Set/update DZ pricing
  fastify.post(
    "/pricing",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const body = request.body as {
        activityType: string;
        basePriceCents: number;
        currency?: string;
        peakMultiplier?: number;
        groupDiscountPct?: number;
      };

      const pricing = await fastify.prisma.dzPricing.upsert({
        where: {
          dropzoneId_activityType: {
            dropzoneId,
            activityType: body.activityType,
          },
        },
        create: {
          dropzoneId,
          activityType: body.activityType,
          basePriceCents: body.basePriceCents,
          currency: body.currency ?? "USD",
          peakMultiplier: body.peakMultiplier ?? 1.0,
          groupDiscountPct: body.groupDiscountPct ?? 0,
        },
        update: {
          basePriceCents: body.basePriceCents,
          currency: body.currency,
          peakMultiplier: body.peakMultiplier,
          groupDiscountPct: body.groupDiscountPct,
        },
      });

      reply.send({ success: true, data: pricing });
    }
  );

  // ── EOD RECONCILIATION ─────────────────────────────────────────────

  fastify.get(
    "/reconciliation/daily",
    {
      preHandler: [
        authenticate,
        tenantScope,
        authorize(["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const dropzoneId = parseInt(request.user!.dropzoneId!, 10);
      const dateParam = (request.query as any).date;
      const date = dateParam ? new Date(dateParam) : new Date();

      const report = await eodService.generateReport(dropzoneId, date);

      reply.send({ success: true, data: report });
    }
  );

  // ── EVENT OUTBOX HEALTH ────────────────────────────────────────────

  fastify.get(
    "/outbox/health",
    {
      preHandler: [
        authenticate,
        authorize(["DZ_OWNER", "PLATFORM_ADMIN"]),
      ],
    },
    async (request, reply) => {
      const { EventOutboxRelay } = await import("../services/eventOutboxRelay");
      const relay = new EventOutboxRelay(fastify.prisma);
      const health = await relay.getHealth();

      reply.send({ success: true, data: health });
    }
  );

  // ── FX / CURRENCY ENDPOINTS ────────────────────────────────────────

  // Get supported currencies with rates
  fastify.get(
    "/currencies",
    { preHandler: [authenticate] },
    async (request, reply) => {
      reply.send({
        success: true,
        data: {
          baseCurrency: 'AED',
          currencies: getSupportedCurrencies(),
          rates: getRates(),
        },
      });
    }
  );

  // Convert price from AED to display currency
  fastify.get(
    "/pricing/convert",
    { preHandler: [authenticate, tenantScope] },
    async (request, reply) => {
      const query = request.query as { amount?: string; to?: string };
      const amount = parseInt(query.amount || '0');
      const toCurrency = (query.to || 'AED') as SupportedCurrency;

      if (!isSupportedCurrency(toCurrency)) {
        reply.code(400).send({ success: false, error: `Unsupported currency: ${toCurrency}` });
        return;
      }

      const converted = convertFromAED(amount, toCurrency);

      reply.send({
        success: true,
        data: {
          originalAmountFils: amount,
          originalCurrency: 'AED',
          convertedAmount: converted,
          targetCurrency: toCurrency,
          formatted: formatCurrency(converted, toCurrency),
          rate: getRates()[toCurrency],
        },
      });
    }
  );
}
