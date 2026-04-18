import { PrismaClient, SlotType } from "@prisma/client";
import { ConflictLoadError, NotFoundError } from "../utils/errors";

// ============================================================================
// WAITLIST SERVICE
// ============================================================================
// FIFO queue per slot type. When a slot opens (cancellation), the top waitlist
// entry is auto-promoted and given a configurable confirmation window
// (default 15 minutes, DZ-configurable via policy engine).
//
// Claim lifecycle:
//   1. Slot opens → promoteNext() marks top entry as OFFERED
//   2. Athlete gets push notification with claim deadline
//   3. Athlete calls confirmClaim() → entry becomes CLAIMED, slot assigned
//   4. If deadline passes → expireUnclaimedOffers() rotates to next in queue
//
// Entries expire at end of DZ day (midnight local time).
// ============================================================================

const DEFAULT_CLAIM_WINDOW_MINUTES = 15;

export interface WaitlistEntryResult {
  id: number;
  userId: number;
  loadId: number | null;
  slotType: string | null;
  priority: number;
  createdAt: Date;
  claimedAt: Date | null;
  offeredAt?: Date | null;
  claimDeadline?: Date | null;
  userName?: string;
}

export class WaitlistService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Add a user to the waitlist for a load or general DZ waitlist.
   */
  async addToWaitlist(
    userId: number,
    dropzoneId: number,
    slotType: string,
    loadId?: number
  ): Promise<WaitlistEntryResult> {
    const slotTypeEnum = slotType as SlotType;

    // Check user isn't already on this waitlist
    const existing = await this.prisma.waitlistEntry.findFirst({
      where: {
        userId,
        dropzoneId,
        loadId: loadId ?? null,
        slotType: slotTypeEnum,
        claimedAt: null,
      },
    });

    if (existing) {
      throw new ConflictLoadError("User already on waitlist for this slot type");
    }

    // Determine priority (FIFO — count existing entries)
    const count = await this.prisma.waitlistEntry.count({
      where: {
        dropzoneId,
        loadId: loadId ?? null,
        slotType: slotTypeEnum,
        claimedAt: null,
      },
    });

    const entry = await this.prisma.waitlistEntry.create({
      data: {
        userId,
        dropzoneId,
        loadId: loadId ?? undefined,
        slotType: slotTypeEnum,
        priority: count + 1,
      },
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return {
      id: entry.id,
      userId: entry.userId,
      loadId: entry.loadId,
      slotType: entry.slotType,
      priority: entry.priority,
      createdAt: entry.createdAt,
      claimedAt: entry.claimedAt,
      userName: entry.user
        ? `${entry.user.firstName} ${entry.user.lastName}`
        : undefined,
    };
  }

  /**
   * Get current waitlist for a load or dropzone.
   */
  async getWaitlist(
    dropzoneId: number,
    loadId?: number
  ): Promise<WaitlistEntryResult[]> {
    const entries = await this.prisma.waitlistEntry.findMany({
      where: {
        dropzoneId,
        ...(loadId ? { loadId } : {}),
        claimedAt: null,
      },
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { priority: "asc" },
    });

    return entries.map((e) => ({
      id: e.id,
      userId: e.userId,
      loadId: e.loadId,
      slotType: e.slotType,
      priority: e.priority,
      createdAt: e.createdAt,
      claimedAt: e.claimedAt,
      userName: e.user
        ? `${e.user.firstName} ${e.user.lastName}`
        : undefined,
    }));
  }

  /**
   * When a slot opens on a load, offer it to the top waitlist entry.
   * Sets a claim deadline. The athlete must call confirmClaim() within the window.
   * Returns the offered entry or null if no one is waiting.
   */
  async promoteNext(
    dropzoneId: number,
    loadId: number,
    freedSlotType: string,
    claimWindowMinutes?: number
  ): Promise<WaitlistEntryResult | null> {
    const slotTypeEnum = freedSlotType as SlotType;
    const windowMinutes = claimWindowMinutes ?? DEFAULT_CLAIM_WINDOW_MINUTES;

    // Find first unclaimed, unoffered entry matching the slot type
    const next = await this.prisma.waitlistEntry.findFirst({
      where: {
        dropzoneId,
        slotType: slotTypeEnum,
        claimedAt: null,
        offeredAt: null,
        OR: [
          { loadId },
          { loadId: null },
        ],
      },
      orderBy: [
        { priority: "asc" },
      ],
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!next) return null;

    // Mark as offered with deadline
    const now = new Date();
    const claimDeadline = new Date(now.getTime() + windowMinutes * 60 * 1000);

    const offered = await this.prisma.waitlistEntry.update({
      where: { id: next.id },
      data: {
        offeredAt: now,
        claimDeadline,
        offeredLoadId: loadId,
      },
    });

    return {
      id: offered.id,
      userId: offered.userId,
      loadId: offered.loadId,
      slotType: offered.slotType,
      priority: offered.priority,
      createdAt: offered.createdAt,
      claimedAt: offered.claimedAt,
      offeredAt: offered.offeredAt,
      claimDeadline,
      userName: next.user
        ? `${next.user.firstName} ${next.user.lastName}`
        : undefined,
    };
  }

  /**
   * Athlete confirms a waitlist offer within the claim window.
   * Returns the confirmed entry or throws if expired/invalid.
   */
  async confirmClaim(entryId: number, userId: number): Promise<WaitlistEntryResult> {
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: { id: entryId, userId },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    if (!entry) {
      throw new NotFoundError("Waitlist entry");
    }

    if (entry.claimedAt) {
      throw new ConflictLoadError("Already claimed");
    }

    if (!entry.offeredAt) {
      throw new ConflictLoadError("No active offer for this entry");
    }

    // Check deadline
    const deadline = (entry as any).claimDeadline as Date | null;
    if (deadline && deadline < new Date()) {
      // Expired — mark it and rotate
      await this.prisma.waitlistEntry.update({
        where: { id: entryId },
        data: { offeredAt: null, claimDeadline: null, offeredLoadId: null } as any,
      });
      throw new ConflictLoadError("Claim window expired. You have been returned to the waitlist.");
    }

    // Confirm the claim
    const claimed = await this.prisma.waitlistEntry.update({
      where: { id: entryId },
      data: { claimedAt: new Date() },
    });

    return {
      id: claimed.id,
      userId: claimed.userId,
      loadId: claimed.offeredLoadId ?? claimed.loadId,
      slotType: claimed.slotType,
      priority: claimed.priority,
      createdAt: claimed.createdAt,
      claimedAt: claimed.claimedAt,
      offeredAt: claimed.offeredAt,
      claimDeadline: claimed.claimDeadline,
      userName: entry.user
        ? `${entry.user.firstName} ${entry.user.lastName}`
        : undefined,
    };
  }

  /**
   * Expire unclaimed offers past their deadline and rotate to next in queue.
   * Should be called periodically (every 1-2 minutes) or triggered on demand.
   * Returns the number of expired offers and any new offers made.
   */
  async expireUnclaimedOffers(dropzoneId: number): Promise<{
    expired: number;
    rotated: WaitlistEntryResult[];
  }> {
    const now = new Date();

    // Find all expired offers
    const expiredEntries = await this.prisma.waitlistEntry.findMany({
      where: {
        dropzoneId,
        offeredAt: { not: null },
        claimedAt: null,
        claimDeadline: { lt: now },
      },
    });

    const rotated: WaitlistEntryResult[] = [];

    for (const entry of expiredEntries) {
      // Reset the offer — return to queue (they keep their priority)
      await this.prisma.waitlistEntry.update({
        where: { id: entry.id },
        data: {
          offeredAt: null,
          claimDeadline: null,
          // Move to back of queue for this slot type
          priority: { increment: 1000 },
        },
      });

      // Promote the next person for the same load/slot type
      if (entry.offeredLoadId) {
        const nextOffer = await this.promoteNext(
          dropzoneId,
          entry.offeredLoadId,
          entry.slotType || "FUN"
        );
        if (nextOffer) {
          rotated.push(nextOffer);
        }
      }
    }

    return { expired: expiredEntries.length, rotated };
  }

  /**
   * Remove a user from the waitlist.
   */
  async removeFromWaitlist(entryId: number, userId: number): Promise<void> {
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: { id: entryId, userId },
    });

    if (!entry) {
      throw new NotFoundError("Waitlist entry");
    }

    await this.prisma.waitlistEntry.delete({
      where: { id: entryId },
    });
  }

  /**
   * Expire all unclaimed waitlist entries from before today (DZ midnight).
   * Should be called by a scheduled job or at start of day.
   */
  async expireStaleEntries(dropzoneId: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.prisma.waitlistEntry.deleteMany({
      where: {
        dropzoneId,
        claimedAt: null,
        createdAt: { lt: today },
      },
    });

    return result.count;
  }
}

export function createWaitlistService(prisma: PrismaClient): WaitlistService {
  return new WaitlistService(prisma);
}
