import { PrismaClient } from "@prisma/client";

// ============================================================================
// CURRENCY ENGINE — License-level jump currency validation
// ============================================================================
// Student = 30 days | A/B = 60 days | C = 90 days | D = 180 days
// Checks completed jumps (slots with JUMPED status on COMPLETE loads)
// and logbook entries within the currency window.
// ============================================================================

export interface CurrencyResult {
  userId: number;
  licenseLevel: string;
  windowDays: number;
  isCurrent: boolean;
  lastJumpDate: Date | null;
  jumpCountInWindow: number;
  expiresAt: Date | null; // when currency would expire based on last jump
  daysRemaining: number | null;
}

/** Currency windows by license level (days). */
const CURRENCY_WINDOWS: Record<string, number> = {
  STUDENT: 30,
  A: 60,
  B: 60,
  C: 90,
  D: 180,
  NONE: 30, // Default to student-level for unlicensed
};

export class CurrencyEngine {
  constructor(private prisma: PrismaClient) {}

  /**
   * Check currency for a user based on their license level.
   * Persists the result to currency_checks table for audit.
   */
  async checkCurrency(userId: number): Promise<CurrencyResult> {
    // Get license level
    const license = await this.prisma.license.findFirst({
      where: { userId },
      orderBy: { expiresAt: "desc" },
    });

    const level = license?.level ?? "NONE";
    const windowDays = CURRENCY_WINDOWS[level] ?? 30;
    const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    // Count completed jumps in window from slots
    const slotJumps = await this.prisma.slot.count({
      where: {
        userId,
        status: "JUMPED",
        load: {
          status: "COMPLETE",
          updatedAt: { gte: cutoff },
        },
      },
    });

    // Count logbook entries in window
    const logbookJumps = await this.prisma.logbookEntry.count({
      where: {
        userId,
        createdAt: { gte: cutoff },
      },
    });

    const totalJumps = slotJumps + logbookJumps;

    // Find last jump date
    const lastSlot = await this.prisma.slot.findFirst({
      where: {
        userId,
        status: "JUMPED",
        load: { status: "COMPLETE" },
      },
      orderBy: { updatedAt: "desc" },
      include: { load: { select: { updatedAt: true } } },
    });

    const lastLogbook = await this.prisma.logbookEntry.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const lastSlotDate = lastSlot?.load?.updatedAt ?? null;
    const lastLogbookDate = lastLogbook?.createdAt ?? null;

    let lastJumpDate: Date | null = null;
    if (lastSlotDate && lastLogbookDate) {
      lastJumpDate = lastSlotDate > lastLogbookDate ? lastSlotDate : lastLogbookDate;
    } else {
      lastJumpDate = lastSlotDate ?? lastLogbookDate;
    }

    const isCurrent = totalJumps > 0;

    let expiresAt: Date | null = null;
    let daysRemaining: number | null = null;
    if (lastJumpDate) {
      expiresAt = new Date(lastJumpDate.getTime() + windowDays * 24 * 60 * 60 * 1000);
      daysRemaining = Math.max(
        0,
        Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      );
    }

    // Persist to currency_checks
    await this.prisma.currencyCheck.create({
      data: {
        userId,
        lastJumpDate,
        isCurrent,
        ruleApplied: `${level}: ${windowDays} days`,
        checkedAt: new Date(),
      },
    });

    return {
      userId,
      licenseLevel: level,
      windowDays,
      isCurrent,
      lastJumpDate,
      jumpCountInWindow: totalJumps,
      expiresAt,
      daysRemaining,
    };
  }

  /**
   * Batch check currency for multiple users (e.g., all athletes at a DZ).
   */
  async checkBatch(userIds: number[]): Promise<CurrencyResult[]> {
    return Promise.all(userIds.map((id) => this.checkCurrency(id)));
  }
}

export function createCurrencyEngine(prisma: PrismaClient): CurrencyEngine {
  return new CurrencyEngine(prisma);
}
