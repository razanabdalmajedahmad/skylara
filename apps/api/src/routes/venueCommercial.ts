import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { tenantScope } from "../middleware/tenantScope";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
  AppError,
} from "../utils/errors";
import { AuditService } from "../services/auditService";
import {
  AuditAction,
  VenueBookingStatus,
  VenueSpaceType,
  VenueSpaceUseMode,
  VenueSpaceStatus,
  Prisma,
} from "@prisma/client";
import { randomUUID } from "crypto";

const VENUE_MANAGER_ROLES = [
  "PLATFORM_ADMIN",
  "REGION_ADMIN",
  "DZ_OWNER",
  "DZ_MANAGER",
  "DZ_OPERATOR",
  "FACILITY_MANAGER",
  "COMMERCIAL_ADMIN",
  "MARKETING_MANAGER",
];

function requireDropzoneId(request: { user?: { dropzoneId?: string | number } }): number {
  const raw = request.user?.dropzoneId;
  const n =
    typeof raw === "string" ? parseInt(raw, 10) : typeof raw === "number" ? raw : NaN;
  if (!Number.isFinite(n) || n <= 0) {
    throw new ForbiddenError("Dropzone context required for this operation");
  }
  return n;
}

/** Statuses that reserve the space on the calendar (overlap check). */
const BOOKING_BLOCKING: VenueBookingStatus[] = [
  VenueBookingStatus.AWAITING_APPROVAL,
  VenueBookingStatus.APPROVED,
  VenueBookingStatus.QUOTED,
  VenueBookingStatus.CONFIRMED,
  VenueBookingStatus.PAID_PARTIAL,
  VenueBookingStatus.COMPLETED,
];

const createSpaceSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  description: z.string().max(8000).optional(),
  spaceType: z.nativeEnum(VenueSpaceType).optional(),
  useMode: z.nativeEnum(VenueSpaceUseMode).optional(),
  capacity: z.number().int().positive().optional().nullable(),
  indoor: z.boolean().optional(),
  basePriceCents: z.number().int().nonnegative().optional().nullable(),
  currency: z.string().length(3).optional(),
  status: z.nativeEnum(VenueSpaceStatus).optional(),
});

const updateSpaceSchema = createSpaceSchema.partial();

const createBookingSchema = z.object({
  venueSpaceId: z.number().int().positive(),
  title: z.string().min(2).max(255),
  description: z.string().max(8000).optional(),
  organizerName: z.string().max(200).optional(),
  organizerEmail: z.string().email().optional().or(z.literal("")),
  organizerPhone: z.string().max(40).optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  initialStatus: z
    .enum(["DRAFT_INQUIRY", "AWAITING_APPROVAL"])
    .optional()
    .default("AWAITING_APPROVAL"),
});

const updateBookingSchema = z.object({
  title: z.string().min(2).max(255).optional(),
  description: z.string().max(8000).optional().nullable(),
  organizerName: z.string().max(200).optional().nullable(),
  organizerEmail: z.string().email().optional().nullable(),
  organizerPhone: z.string().max(40).optional().nullable(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  status: z.nativeEnum(VenueBookingStatus).optional(),
  quotedAmountCents: z.number().int().nonnegative().optional().nullable(),
  currency: z.string().length(3).optional(),
  internalNotes: z.string().max(8000).optional().nullable(),
});

const transitionSchema = z.object({
  action: z.enum([
    "submit",
    "approve",
    "reject",
    "quote",
    "confirm",
    "mark_paid_partial",
    "complete",
    "cancel",
  ]),
  quotedAmountCents: z.number().int().nonnegative().optional(),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function venueCommercialRoutes(fastify: FastifyInstance) {
  const audit = new AuditService(fastify.prisma);

  const pre = [
    authenticate,
    tenantScope,
    authorize(VENUE_MANAGER_ROLES),
  ] as const;

  // ── Venue spaces ───────────────────────────────────────────────────────

  fastify.get("/venue-spaces", { preHandler: [...pre] }, async (request, reply) => {
    const dropzoneId = requireDropzoneId(request);
    const q = request.query as { status?: string };
    const where: Prisma.VenueSpaceWhereInput = { dropzoneId };
    if (q.status) {
      where.status = q.status as Prisma.EnumVenueSpaceStatusFilter["equals"];
    }
    const rows = await fastify.prisma.venueSpace.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    reply.send({ success: true, data: rows });
  });

  fastify.post("/venue-spaces", { preHandler: [...pre] }, async (request, reply) => {
    const dropzoneId = requireDropzoneId(request);
    const userId = parseInt(String(request.user!.sub), 10);
    const body = createSpaceSchema.parse(request.body);
    let slug = body.slug ?? slugify(body.name);
    const exists = await fastify.prisma.venueSpace.findFirst({
      where: { dropzoneId, slug },
    });
    if (exists) slug = `${slug}-${randomUUID().slice(0, 8)}`;

    const row = await fastify.prisma.venueSpace.create({
      data: {
        dropzoneId,
        name: body.name,
        slug,
        description: body.description,
        spaceType: body.spaceType ?? VenueSpaceType.OTHER,
        useMode: body.useMode ?? VenueSpaceUseMode.MIXED_USE,
        capacity: body.capacity ?? undefined,
        indoor: body.indoor ?? true,
        basePriceCents: body.basePriceCents ?? undefined,
        currency: body.currency ?? "USD",
        status: body.status ?? VenueSpaceStatus.DRAFT,
        createdByUserId: userId,
      },
    });

    await audit.log({
      userId,
      dropzoneId,
      action: AuditAction.CREATE,
      entityType: "VenueSpace",
      entityId: row.id,
      afterState: { id: row.id, slug: row.slug, name: row.name },
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    reply.code(201).send({ success: true, data: row });
  });

  fastify.get("/venue-spaces/:id", { preHandler: [...pre] }, async (request, reply) => {
    const dropzoneId = requireDropzoneId(request);
    const id = parseInt((request.params as { id: string }).id, 10);
    const row = await fastify.prisma.venueSpace.findFirst({
      where: { id, dropzoneId },
    });
    if (!row) throw new NotFoundError("Venue space not found");
    reply.send({ success: true, data: row });
  });

  fastify.patch("/venue-spaces/:id", { preHandler: [...pre] }, async (request, reply) => {
    const dropzoneId = requireDropzoneId(request);
    const userId = parseInt(String(request.user!.sub), 10);
    const id = parseInt((request.params as { id: string }).id, 10);
    const existing = await fastify.prisma.venueSpace.findFirst({
      where: { id, dropzoneId },
    });
    if (!existing) throw new NotFoundError("Venue space not found");
    const body = updateSpaceSchema.parse(request.body);

    const data: Prisma.VenueSpaceUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.slug !== undefined) data.slug = body.slug;
    if (body.description !== undefined) data.description = body.description;
    if (body.spaceType !== undefined) data.spaceType = body.spaceType;
    if (body.useMode !== undefined) data.useMode = body.useMode;
    if (body.capacity !== undefined) data.capacity = body.capacity;
    if (body.indoor !== undefined) data.indoor = body.indoor;
    if (body.basePriceCents !== undefined) data.basePriceCents = body.basePriceCents;
    if (body.currency !== undefined) data.currency = body.currency;
    if (body.status !== undefined) data.status = body.status;

    const row = await fastify.prisma.venueSpace.update({
      where: { id },
      data,
    });

    await audit.log({
      userId,
      dropzoneId,
      action: AuditAction.UPDATE,
      entityType: "VenueSpace",
      entityId: row.id,
      beforeState: { id: existing.id, name: existing.name, status: existing.status },
      afterState: { id: row.id, name: row.name, status: row.status },
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    reply.send({ success: true, data: row });
  });

  fastify.delete("/venue-spaces/:id", { preHandler: [...pre] }, async (request, reply) => {
    const dropzoneId = requireDropzoneId(request);
    const userId = parseInt(String(request.user!.sub), 10);
    const id = parseInt((request.params as { id: string }).id, 10);
    const existing = await fastify.prisma.venueSpace.findFirst({
      where: { id, dropzoneId },
    });
    if (!existing) throw new NotFoundError("Venue space not found");

    const activeBookings = await fastify.prisma.venueBooking.count({
      where: {
        venueSpaceId: id,
        status: {
          notIn: [
            VenueBookingStatus.CANCELLED,
            VenueBookingStatus.REJECTED,
            VenueBookingStatus.COMPLETED,
          ],
        },
      },
    });
    if (activeBookings > 0) {
      throw new AppError(
        "Cannot archive space with active bookings. Complete or cancel bookings first.",
        400
      );
    }

    const row = await fastify.prisma.venueSpace.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    await audit.log({
      userId,
      dropzoneId,
      action: AuditAction.UPDATE,
      entityType: "VenueSpace",
      entityId: row.id,
      beforeState: { status: existing.status },
      afterState: { status: "ARCHIVED" },
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    reply.send({ success: true, data: row });
  });

  // ── Venue bookings ──────────────────────────────────────────────────────

  async function assertNoOverlap(
    dropzoneId: number,
    venueSpaceId: number,
    startAt: Date,
    endAt: Date,
    excludeBookingId?: number
  ) {
    if (startAt >= endAt) {
      throw new ValidationError({}, "endAt must be after startAt");
    }
    const overlap = await fastify.prisma.venueBooking.findFirst({
      where: {
        dropzoneId,
        venueSpaceId,
        status: { in: BOOKING_BLOCKING },
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
        AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }],
      },
    });
    if (overlap) {
      throw new ConflictError("Time range overlaps an existing booking");
    }
  }

  fastify.get("/venue-bookings", { preHandler: [...pre] }, async (request, reply) => {
    const dropzoneId = requireDropzoneId(request);
    const q = request.query as { status?: string; venueSpaceId?: string };
    const where: Prisma.VenueBookingWhereInput = { dropzoneId };
    if (q.status) {
      where.status = q.status as Prisma.EnumVenueBookingStatusFilter["equals"];
    }
    if (q.venueSpaceId) {
      where.venueSpaceId = parseInt(q.venueSpaceId, 10);
    }
    const rows = await fastify.prisma.venueBooking.findMany({
      where,
      include: { venueSpace: { select: { id: true, name: true, slug: true } } },
      orderBy: { startAt: "asc" },
      take: 200,
    });
    reply.send({ success: true, data: rows });
  });

  fastify.post("/venue-bookings", { preHandler: [...pre] }, async (request, reply) => {
    const dropzoneId = requireDropzoneId(request);
    const userId = parseInt(String(request.user!.sub), 10);
    const body = createBookingSchema.parse(request.body);

    const space = await fastify.prisma.venueSpace.findFirst({
      where: { id: body.venueSpaceId, dropzoneId, status: { not: "ARCHIVED" } },
    });
    if (!space) throw new NotFoundError("Venue space not found or archived");

    const startAt = new Date(body.startAt);
    const endAt = new Date(body.endAt);
    await assertNoOverlap(dropzoneId, body.venueSpaceId, startAt, endAt);

    const initial =
      body.initialStatus === "DRAFT_INQUIRY"
        ? VenueBookingStatus.DRAFT_INQUIRY
        : VenueBookingStatus.AWAITING_APPROVAL;

    const row = await fastify.prisma.venueBooking.create({
      data: {
        dropzoneId,
        venueSpaceId: body.venueSpaceId,
        requesterUserId: userId,
        title: body.title,
        description: body.description,
        organizerName: body.organizerName,
        organizerEmail: body.organizerEmail || undefined,
        organizerPhone: body.organizerPhone,
        startAt,
        endAt,
        status: initial,
        createdByUserId: userId,
      },
      include: { venueSpace: { select: { id: true, name: true, slug: true } } },
    });

    await audit.log({
      userId,
      dropzoneId,
      action: AuditAction.CREATE,
      entityType: "VenueBooking",
      entityId: row.id,
      afterState: { id: row.id, status: row.status, venueSpaceId: row.venueSpaceId },
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    reply.code(201).send({ success: true, data: row });
  });

  fastify.get("/venue-bookings/:id", { preHandler: [...pre] }, async (request, reply) => {
    const dropzoneId = requireDropzoneId(request);
    const id = parseInt((request.params as { id: string }).id, 10);
    const row = await fastify.prisma.venueBooking.findFirst({
      where: { id, dropzoneId },
      include: { venueSpace: true },
    });
    if (!row) throw new NotFoundError("Booking not found");
    reply.send({ success: true, data: row });
  });

  fastify.patch("/venue-bookings/:id", { preHandler: [...pre] }, async (request, reply) => {
    const dropzoneId = requireDropzoneId(request);
    const userId = parseInt(String(request.user!.sub), 10);
    const id = parseInt((request.params as { id: string }).id, 10);
    const existing = await fastify.prisma.venueBooking.findFirst({
      where: { id, dropzoneId },
    });
    if (!existing) throw new NotFoundError("Booking not found");
    const body = updateBookingSchema.parse(request.body);

    let startAt = existing.startAt;
    let endAt = existing.endAt;
    if (body.startAt) startAt = new Date(body.startAt);
    if (body.endAt) endAt = new Date(body.endAt);
    if (body.startAt || body.endAt) {
      await assertNoOverlap(dropzoneId, existing.venueSpaceId, startAt, endAt, id);
    }

    const data: Prisma.VenueBookingUpdateInput = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.organizerName !== undefined) data.organizerName = body.organizerName;
    if (body.organizerEmail !== undefined) data.organizerEmail = body.organizerEmail;
    if (body.organizerPhone !== undefined) data.organizerPhone = body.organizerPhone;
    if (body.startAt !== undefined) data.startAt = startAt;
    if (body.endAt !== undefined) data.endAt = endAt;
    if (body.quotedAmountCents !== undefined) data.quotedAmountCents = body.quotedAmountCents;
    if (body.currency !== undefined) data.currency = body.currency;
    if (body.internalNotes !== undefined) data.internalNotes = body.internalNotes;
    if (body.status !== undefined) data.status = body.status;

    const row = await fastify.prisma.venueBooking.update({
      where: { id },
      data,
      include: { venueSpace: { select: { id: true, name: true, slug: true } } },
    });

    await audit.log({
      userId,
      dropzoneId,
      action: AuditAction.UPDATE,
      entityType: "VenueBooking",
      entityId: row.id,
      beforeState: { status: existing.status },
      afterState: { status: row.status },
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    reply.send({ success: true, data: row });
  });

  fastify.post(
    "/venue-bookings/:id/transition",
    { preHandler: [...pre] },
    async (request, reply) => {
      const dropzoneId = requireDropzoneId(request);
      const userId = parseInt(String(request.user!.sub), 10);
      const id = parseInt((request.params as { id: string }).id, 10);
      const body = transitionSchema.parse(request.body);

      const existing = await fastify.prisma.venueBooking.findFirst({
        where: { id, dropzoneId },
      });
      if (!existing) throw new NotFoundError("Booking not found");

      let next: VenueBookingStatus = existing.status;
      const s = existing.status;

      switch (body.action) {
        case "submit":
          if (s !== VenueBookingStatus.DRAFT_INQUIRY) {
            throw new ValidationError({}, "submit only from DRAFT_INQUIRY");
          }
          next = VenueBookingStatus.AWAITING_APPROVAL;
          break;
        case "approve":
          if (s !== VenueBookingStatus.AWAITING_APPROVAL) {
            throw new ValidationError({}, "approve only from AWAITING_APPROVAL");
          }
          await assertNoOverlap(
            dropzoneId,
            existing.venueSpaceId,
            existing.startAt,
            existing.endAt,
            id
          );
          next = VenueBookingStatus.APPROVED;
          break;
        case "reject":
          if (
            s !== VenueBookingStatus.AWAITING_APPROVAL &&
            s !== VenueBookingStatus.DRAFT_INQUIRY
          ) {
            throw new ValidationError(
              {},
              "reject only from inquiry or awaiting approval"
            );
          }
          next = VenueBookingStatus.REJECTED;
          break;
        case "quote":
          if (s !== VenueBookingStatus.APPROVED) {
            throw new ValidationError({}, "quote only from APPROVED");
          }
          if (body.quotedAmountCents == null) {
            throw new ValidationError({}, "quotedAmountCents required for quote");
          }
          next = VenueBookingStatus.QUOTED;
          break;
        case "confirm":
          if (s !== VenueBookingStatus.APPROVED && s !== VenueBookingStatus.QUOTED) {
            throw new ValidationError({}, "confirm from APPROVED or QUOTED");
          }
          next = VenueBookingStatus.CONFIRMED;
          break;
        case "mark_paid_partial":
          if (s !== VenueBookingStatus.CONFIRMED && s !== VenueBookingStatus.QUOTED) {
            throw new ValidationError({}, "mark_paid_partial from QUOTED or CONFIRMED");
          }
          next = VenueBookingStatus.PAID_PARTIAL;
          break;
        case "complete":
          if (
            s !== VenueBookingStatus.CONFIRMED &&
            s !== VenueBookingStatus.PAID_PARTIAL
          ) {
            throw new ValidationError({}, "complete from CONFIRMED or PAID_PARTIAL");
          }
          next = VenueBookingStatus.COMPLETED;
          break;
        case "cancel":
          if (
            s === VenueBookingStatus.COMPLETED ||
            s === VenueBookingStatus.CANCELLED ||
            s === VenueBookingStatus.REJECTED
          ) {
            throw new ValidationError({}, "cannot cancel terminal booking");
          }
          next = VenueBookingStatus.CANCELLED;
          break;
        default:
          throw new ValidationError({}, "Unknown action");
      }

      const row = await fastify.prisma.venueBooking.update({
        where: { id },
        data: {
          status: next,
          ...(body.action === "quote" && body.quotedAmountCents != null
            ? { quotedAmountCents: body.quotedAmountCents }
            : {}),
          ...(body.action === "approve" || body.action === "reject"
            ? { reviewedByUserId: userId, reviewedAt: new Date() }
            : {}),
        },
        include: { venueSpace: { select: { id: true, name: true, slug: true } } },
      });

      await audit.log({
        userId,
        dropzoneId,
        action: AuditAction.UPDATE,
        entityType: "VenueBooking",
        entityId: row.id,
        beforeState: { status: s },
        afterState: { status: next, action: body.action },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      reply.send({ success: true, data: row });
    }
  );
}
