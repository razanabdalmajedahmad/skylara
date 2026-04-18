import { PrismaClient } from "@prisma/client";

// ============================================================================
// EOD RECONCILIATION SERVICE — Daily revenue summary & ledger verification
// ============================================================================

export interface DailyReconciliation {
  date: string;
  dropzoneId: number;
  bookingCount: number;
  loadCount: number;
  slotCount: number;
  grossRevenueCents: number;
  refundsCents: number;
  netRevenueCents: number;
  byActivityType: Record<string, { count: number; revenueCents: number }>;
  walletTopupsCents: number;
  outstandingBookings: number;
  noShowCount: number;
}

export class EodReconciliationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate an EOD reconciliation report for a dropzone on a given date.
   */
  async generateReport(
    dropzoneId: number,
    date: Date
  ): Promise<DailyReconciliation> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dateStr = dayStart.toISOString().split("T")[0];

    // Count loads and slots
    const [loadCount, slotCount] = await Promise.all([
      this.prisma.load.count({
        where: {
          dropzoneId,
          scheduledAt: { gte: dayStart, lt: dayEnd },
          status: { in: ["COMPLETE", "LANDED", "AIRBORNE"] },
        },
      }),
      this.prisma.slot.count({
        where: {
          load: {
            dropzoneId,
            scheduledAt: { gte: dayStart, lt: dayEnd },
            status: "COMPLETE",
          },
          status: "JUMPED",
        },
      }),
    ]);

    // Booking stats
    const bookings = await this.prisma.booking.findMany({
      where: {
        dropzoneId,
        scheduledDate: { gte: dayStart, lt: dayEnd },
      },
      include: { package: true },
    });

    const bookingCount = bookings.filter(
      (b) => b.status !== "CANCELLED"
    ).length;

    const noShowCount = bookings.filter(
      (b) => b.status === "NO_SHOW"
    ).length;

    const outstandingBookings = bookings.filter(
      (b) => b.status === "PENDING"
    ).length;

    // Revenue from bookings
    let grossRevenueCents = 0;
    const byActivityType: Record<string, { count: number; revenueCents: number }> = {};

    for (const booking of bookings) {
      if (booking.status === "CANCELLED") continue;
      const price = booking.package?.priceCents ?? 0;
      grossRevenueCents += price;

      const type = booking.bookingType || "OTHER";
      if (!byActivityType[type]) {
        byActivityType[type] = { count: 0, revenueCents: 0 };
      }
      byActivityType[type].count++;
      byActivityType[type].revenueCents += price;
    }

    // Wallet transactions for the day
    const walletTopups = await this.prisma.transaction.aggregate({
      where: {
        wallet: { dropzoneId },
        type: "CREDIT",
        createdAt: { gte: dayStart, lt: dayEnd },
      },
      _sum: { amount: true },
    });

    const walletTopupsCents = walletTopups._sum.amount ?? 0;

    // Refunds
    const refunds = await this.prisma.transaction.aggregate({
      where: {
        wallet: { dropzoneId },
        type: "REFUND",
        createdAt: { gte: dayStart, lt: dayEnd },
      },
      _sum: { amount: true },
    });

    const refundsCents = Math.abs(refunds._sum.amount ?? 0);
    const netRevenueCents = grossRevenueCents - refundsCents;

    return {
      date: dateStr,
      dropzoneId,
      bookingCount,
      loadCount,
      slotCount,
      grossRevenueCents,
      refundsCents,
      netRevenueCents,
      byActivityType,
      walletTopupsCents,
      outstandingBookings,
      noShowCount,
    };
  }

  /**
   * Generate report and save to daily_revenue_summary (idempotent).
   */
  async generateAndSave(
    dropzoneId: number,
    date: Date
  ): Promise<DailyReconciliation> {
    const report = await this.generateReport(dropzoneId, date);

    // Upsert daily summary — we don't have a DailyRevenueSummary model yet,
    // so we store as JSON in the reporting system or return directly.
    // Future: prisma.dailyRevenueSummary.upsert(...)

    return report;
  }
}

export function createEodReconciliationService(
  prisma: PrismaClient
): EodReconciliationService {
  return new EodReconciliationService(prisma);
}
