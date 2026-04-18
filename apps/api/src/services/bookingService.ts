import { PrismaClient, BookingStatus } from "@prisma/client";
import { NotFoundError, ConflictError, ValidationError } from "../utils/errors";
import { EventOutboxRelay } from "./eventOutboxRelay";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// BOOKING SERVICE — Package-based booking with pricing & payment integration
// ============================================================================

export interface CreateBookingParams {
  userId: number;
  dropzoneId: number;
  packageId?: number;
  bookingType: string;
  scheduledDate: Date;
  scheduledTime?: string;
  notes?: string;
  participantCount?: number;
}

export interface BookingDetail {
  id: number;
  uuid: string;
  status: string;
  bookingType: string;
  scheduledDate: Date;
  scheduledTime: string | null;
  package: { name: string; priceCents: number; currency: string } | null;
  user: { id: number; name: string; email: string };
  notes: string | null;
  createdAt: Date;
}

export class BookingService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new booking with optional package pricing.
   */
  async createBooking(params: CreateBookingParams): Promise<BookingDetail> {
    // Validate package exists if specified
    let pkg = null;
    if (params.packageId) {
      pkg = await this.prisma.bookingPackage.findFirst({
        where: { id: params.packageId, dropzoneId: params.dropzoneId, isActive: true },
      });
      if (!pkg) throw new NotFoundError("Booking package");
    }

    // Check for duplicate bookings (same user, same date, same type)
    const existing = await this.prisma.booking.findFirst({
      where: {
        userId: params.userId,
        dropzoneId: params.dropzoneId,
        scheduledDate: params.scheduledDate,
        bookingType: params.bookingType,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });

    if (existing) {
      throw new ConflictError("User already has a booking of this type on this date");
    }

    const booking = await this.prisma.booking.create({
      data: {
        uuid: uuidv4(),
        dropzoneId: params.dropzoneId,
        userId: params.userId,
        packageId: params.packageId,
        bookingType: params.bookingType,
        scheduledDate: params.scheduledDate,
        scheduledTime: params.scheduledTime,
        status: "PENDING",
        notes: params.notes,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        package: true,
      },
    });

    // Enqueue financial event in outbox (same transaction in production)
    await EventOutboxRelay.enqueue(this.prisma, {
      eventType: "booking.created",
      aggregateType: "Booking",
      aggregateId: booking.id,
      tenantId: params.dropzoneId,
      payload: {
        bookingId: booking.id,
        userId: params.userId,
        bookingType: params.bookingType,
        priceCents: pkg?.priceCents ?? 0,
        scheduledDate: params.scheduledDate,
      },
      metadata: { userId: params.userId, timestamp: new Date().toISOString() },
    });

    return this.toDetail(booking);
  }

  /**
   * Confirm a booking (after payment or manual confirmation).
   */
  async confirmBooking(
    bookingId: number,
    paymentIntentId?: number
  ): Promise<BookingDetail> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        package: true,
      },
    });

    if (!booking) throw new NotFoundError("Booking");
    if (booking.status !== "PENDING") {
      throw new ConflictError(`Cannot confirm booking in ${booking.status} status`);
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CONFIRMED",
        paymentIntentId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        package: true,
      },
    });

    await EventOutboxRelay.enqueue(this.prisma, {
      eventType: "booking.confirmed",
      aggregateType: "Booking",
      aggregateId: bookingId,
      tenantId: booking.dropzoneId,
      payload: { bookingId, paymentIntentId },
      metadata: { timestamp: new Date().toISOString() },
    });

    return this.toDetail(updated);
  }

  /**
   * Cancel a booking with optional refund trigger.
   */
  async cancelBooking(
    bookingId: number,
    cancelledBy: number,
    reason?: string
  ): Promise<BookingDetail> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        package: true,
      },
    });

    if (!booking) throw new NotFoundError("Booking");
    if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
      throw new ConflictError(`Cannot cancel booking in ${booking.status} status`);
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        notes: reason
          ? `${booking.notes ?? ""}\n[Cancelled]: ${reason}`.trim()
          : booking.notes,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        package: true,
      },
    });

    await EventOutboxRelay.enqueue(this.prisma, {
      eventType: "booking.cancelled",
      aggregateType: "Booking",
      aggregateId: bookingId,
      tenantId: booking.dropzoneId,
      payload: { bookingId, cancelledBy, reason },
      metadata: { userId: cancelledBy, timestamp: new Date().toISOString() },
    });

    return this.toDetail(updated);
  }

  /**
   * List bookings with filters.
   */
  async listBookings(
    dropzoneId: number,
    filters?: {
      userId?: number;
      status?: string;
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ bookings: BookingDetail[]; total: number }> {
    const where: any = { dropzoneId };
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.status) where.status = filters.status;
    if (filters?.dateFrom || filters?.dateTo) {
      where.scheduledDate = {};
      if (filters.dateFrom) where.scheduledDate.gte = filters.dateFrom;
      if (filters.dateTo) where.scheduledDate.lte = filters.dateTo;
    }

    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          package: true,
        },
        orderBy: { scheduledDate: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      bookings: bookings.map((b) => this.toDetail(b)),
      total,
    };
  }

  /**
   * Get DZ pricing for activity types.
   */
  async getPricing(dropzoneId: number): Promise<any[]> {
    return this.prisma.dzPricing.findMany({
      where: { dropzoneId },
      orderBy: { activityType: "asc" },
    });
  }

  private toDetail(booking: any): BookingDetail {
    return {
      id: booking.id,
      uuid: booking.uuid,
      status: booking.status,
      bookingType: booking.bookingType,
      scheduledDate: booking.scheduledDate,
      scheduledTime: booking.scheduledTime,
      package: booking.package
        ? {
            name: booking.package.name,
            priceCents: booking.package.priceCents,
            currency: booking.package.currency,
          }
        : null,
      user: {
        id: booking.user.id,
        name: `${booking.user.firstName} ${booking.user.lastName}`,
        email: booking.user.email,
      },
      notes: booking.notes,
      createdAt: booking.createdAt,
    };
  }
}

export function createBookingService(prisma: PrismaClient): BookingService {
  return new BookingService(prisma);
}
