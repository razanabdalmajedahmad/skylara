import { PrismaClient } from "@prisma/client";

/**
 * REPORTING AGGREGATOR — Pre-computed operational reports
 *
 * Per gap spec §5.7 and doc 12:
 * - Revenue reporting (daily, weekly, monthly)
 * - Load utilization (slots filled vs capacity)
 * - Payment breakdowns (by type, by method)
 * - Refund reporting
 * - Instructor payout summaries
 * - Operational summary (loads completed, jumps logged, check-ins)
 *
 * All queries are designed for the read replica (prismaRead).
 * Results include freshness labels (lastUpdated timestamp).
 */

export interface DateRange {
  from: Date;
  to: Date;
}

export interface RevenueReport {
  totalRevenue: number;
  transactionCount: number;
  byType: Array<{ type: string; total: number; count: number }>;
  currency: string;
  period: DateRange;
  generatedAt: Date;
}

export interface LoadUtilizationReport {
  totalLoads: number;
  completedLoads: number;
  cancelledLoads: number;
  totalSlots: number;
  filledSlots: number;
  utilizationPercent: number;
  averageSlotsPerLoad: number;
  period: DateRange;
  generatedAt: Date;
}

export interface RefundReport {
  totalRefunds: number;
  refundCount: number;
  refundRate: number; // refunds / total transactions
  period: DateRange;
  generatedAt: Date;
}

export interface OperationalSummary {
  loadsCompleted: number;
  jumpsLogged: number;
  athletesCheckedIn: number;
  weatherHolds: number;
  incidents: number;
  activeAircraft: number;
  period: DateRange;
  generatedAt: Date;
}

export class ReportingAggregator {
  constructor(private prisma: PrismaClient) {}

  /**
   * Revenue report for a dropzone over a date range.
   */
  async getRevenueReport(dropzoneId: number, range: DateRange): Promise<RevenueReport> {
    // Total revenue from transactions
    const result = await this.prisma.transaction.aggregate({
      where: {
        wallet: { dropzoneId },
        type: "CREDIT",
        createdAt: { gte: range.from, lte: range.to },
      },
      _sum: { amount: true },
      _count: true,
    });

    // Breakdown by type
    const byType = await this.prisma.transaction.groupBy({
      by: ["description"],
      where: {
        wallet: { dropzoneId },
        type: "CREDIT",
        createdAt: { gte: range.from, lte: range.to },
      },
      _sum: { amount: true },
      _count: true,
    });

    return {
      totalRevenue: Number(result._sum.amount ?? 0),
      transactionCount: result._count,
      byType: byType.map((g) => ({
        type: g.description ?? "Other",
        total: Number(g._sum.amount ?? 0),
        count: g._count,
      })),
      currency: "USD",
      period: range,
      generatedAt: new Date(),
    };
  }

  /**
   * Load utilization report — slots filled vs capacity.
   */
  async getLoadUtilization(dropzoneId: number, range: DateRange): Promise<LoadUtilizationReport> {
    const loads = await this.prisma.load.findMany({
      where: {
        dropzoneId,
        scheduledAt: { gte: range.from, lte: range.to },
      },
      include: {
        aircraft: { select: { maxCapacity: true } },
        _count: { select: { slots: true } },
      },
    });

    const completedLoads = loads.filter(l => l.status === "COMPLETE").length;
    const cancelledLoads = loads.filter(l => l.status === "CANCELLED").length;
    const totalSlots = loads.reduce((sum, l) => sum + (l.aircraft.maxCapacity || 0), 0);
    const filledSlots = loads.reduce((sum, l) => sum + l._count.slots, 0);
    const utilizationPercent = totalSlots > 0
      ? Math.round((filledSlots / totalSlots) * 100)
      : 0;
    const averageSlotsPerLoad = loads.length > 0
      ? Math.round((filledSlots / loads.length) * 10) / 10
      : 0;

    return {
      totalLoads: loads.length,
      completedLoads,
      cancelledLoads,
      totalSlots,
      filledSlots,
      utilizationPercent,
      averageSlotsPerLoad,
      period: range,
      generatedAt: new Date(),
    };
  }

  /**
   * Refund report.
   */
  async getRefundReport(dropzoneId: number, range: DateRange): Promise<RefundReport> {
    const [refunds, totalTx] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          wallet: { dropzoneId },
          type: "REFUND",
          createdAt: { gte: range.from, lte: range.to },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.count({
        where: {
          wallet: { dropzoneId },
          createdAt: { gte: range.from, lte: range.to },
        },
      }),
    ]);

    return {
      totalRefunds: Math.abs(Number(refunds._sum.amount ?? 0)),
      refundCount: refunds._count,
      refundRate: totalTx > 0 ? Math.round((refunds._count / totalTx) * 10000) / 100 : 0,
      period: range,
      generatedAt: new Date(),
    };
  }

  /**
   * Operational summary — daily ops snapshot.
   */
  async getOperationalSummary(dropzoneId: number, range: DateRange): Promise<OperationalSummary> {
    const [loadsCompleted, jumpsLogged, weatherHolds, incidents, activeAircraft] = await Promise.all([
      this.prisma.load.count({
        where: {
          dropzoneId,
          status: "COMPLETE",
          updatedAt: { gte: range.from, lte: range.to },
        },
      }),
      this.prisma.logbookEntry.count({
        where: {
          dropzoneId,
          createdAt: { gte: range.from, lte: range.to },
        },
      }),
      this.prisma.weatherHold.count({
        where: {
          dropzoneId,
          activatedAt: { gte: range.from, lte: range.to },
        },
      }),
      this.prisma.incident.count({
        where: {
          dropzoneId,
          createdAt: { gte: range.from, lte: range.to },
        },
      }),
      this.prisma.aircraft.count({
        where: {
          dropzoneId,
          status: "ACTIVE",
        },
      }),
    ]);

    // Athlete check-ins approximated by slots in MANIFESTED+ status
    const athletesCheckedIn = await this.prisma.slot.count({
      where: {
        load: {
          dropzoneId,
          scheduledAt: { gte: range.from, lte: range.to },
        },
        status: { in: ["MANIFESTED", "JUMPED"] as any },
      },
    });

    return {
      loadsCompleted,
      jumpsLogged,
      athletesCheckedIn,
      weatherHolds,
      incidents,
      activeAircraft,
      period: range,
      generatedAt: new Date(),
    };
  }

  /**
   * Parse a date range from query params.
   * Supports: today, week, month, or explicit from/to ISO dates.
   */
  static parseDateRange(period?: string, from?: string, to?: string): DateRange {
    const now = new Date();

    if (from && to) {
      return { from: new Date(from), to: new Date(to) };
    }

    switch (period) {
      case "today": {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        return { from: start, to: now };
      }
      case "week": {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        return { from: start, to: now };
      }
      case "month": {
        const start = new Date(now);
        start.setMonth(start.getMonth() - 1);
        return { from: start, to: now };
      }
      case "year": {
        const start = new Date(now);
        start.setFullYear(start.getFullYear() - 1);
        return { from: start, to: now };
      }
      default: {
        // Default: today
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        return { from: start, to: now };
      }
    }
  }
}
