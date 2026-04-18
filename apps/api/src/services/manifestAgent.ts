import { PrismaClient } from "@prisma/client";

/**
 * MANIFEST AGENT — AI operational recommendations (Gap Spec §5.8)
 *
 * Rule-based recommendation engine for manifest operations.
 * AI can RECOMMEND and PRIORITIZE but CANNOT OVERRIDE:
 *   - CG gating
 *   - Waiver / document / payment gates
 *   - Discipline qualification gates
 *   - Pilot authority
 *   - Weather hold approval requirements
 *
 * Recommendation types:
 *   - UNDERFILL_MERGE: merge two underfilled loads
 *   - WAITLIST_PROMOTE: suggest promoting waitlist entries
 *   - LOAD_BALANCE: redistribute jumpers for better CG or utilization
 *   - STAFF_ASSIGN: suggest instructor/coach assignment
 *   - WEATHER_ADVISORY: preemptive weather hold suggestion
 *   - NO_SHOW_PREDICTION: flag likely no-shows for standby readiness
 *
 * All recommendations include:
 *   - action: what to do
 *   - reason: why
 *   - confidence: HIGH/MEDIUM/LOW
 *   - actions: accept / edit / reject
 *   - audit: logged regardless of outcome
 */

export type RecommendationType =
  | "UNDERFILL_MERGE"
  | "WAITLIST_PROMOTE"
  | "LOAD_BALANCE"
  | "STAFF_ASSIGN"
  | "WEATHER_ADVISORY"
  | "NO_SHOW_PREDICTION";

export interface ManifestRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  actions: Array<{
    label: string;
    action: "ACCEPT" | "EDIT" | "REJECT";
    payload?: Record<string, any>;
  }>;
  metadata: Record<string, any>;
  generatedAt: Date;
}

export class ManifestAgent {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate all recommendations for a dropzone's current operational state.
   */
  async generateRecommendations(dropzoneId: number): Promise<ManifestRecommendation[]> {
    const recommendations: ManifestRecommendation[] = [];

    const [underfills, waitlistSuggestions, noShows] = await Promise.all([
      this.checkUnderfills(dropzoneId),
      this.checkWaitlistOpportunities(dropzoneId),
      this.checkNoShowRisk(dropzoneId),
    ]);

    recommendations.push(...underfills, ...waitlistSuggestions, ...noShows);

    // Sort by priority
    const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
  }

  /**
   * Detect underfilled loads that could be merged.
   */
  private async checkUnderfills(dropzoneId: number): Promise<ManifestRecommendation[]> {
    const recommendations: ManifestRecommendation[] = [];

    const activeLoads = await this.prisma.load.findMany({
      where: {
        dropzoneId,
        status: { in: ["OPEN", "FILLING"] },
      },
      include: {
        aircraft: { select: { maxCapacity: true, registration: true } },
        _count: { select: { slots: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });

    // Find loads under 40% capacity
    const underfilled = activeLoads.filter(
      (l) => l._count.slots < (l.aircraft.maxCapacity || 20) * 0.4 && l._count.slots > 0
    );

    // If two or more underfilled loads exist, suggest merge
    if (underfilled.length >= 2) {
      const load1 = underfilled[0];
      const load2 = underfilled[1];
      const combinedSlots = load1._count.slots + load2._count.slots;
      const maxCapacity = Math.max(
        load1.aircraft.maxCapacity || 20,
        load2.aircraft.maxCapacity || 20
      );

      if (combinedSlots <= maxCapacity) {
        recommendations.push({
          id: `underfill-${load1.id}-${load2.id}`,
          type: "UNDERFILL_MERGE",
          title: `Merge underfilled loads`,
          description: `Load ${load1.loadNumber} (${load1._count.slots}/${load1.aircraft.maxCapacity}) and Load ${load2.loadNumber} (${load2._count.slots}/${load2.aircraft.maxCapacity}) could be merged into one load (${combinedSlots} total).`,
          confidence: combinedSlots <= maxCapacity * 0.8 ? "HIGH" : "MEDIUM",
          priority: "MEDIUM",
          actions: [
            { label: "Merge into Load " + load1.loadNumber, action: "ACCEPT", payload: { keepLoadId: load1.id, mergeLoadId: load2.id } },
            { label: "Edit merge plan", action: "EDIT" },
            { label: "Dismiss", action: "REJECT" },
          ],
          metadata: {
            load1: { id: load1.id, loadNumber: load1.loadNumber, slots: load1._count.slots, aircraft: load1.aircraft.registration },
            load2: { id: load2.id, loadNumber: load2.loadNumber, slots: load2._count.slots, aircraft: load2.aircraft.registration },
            combinedSlots,
          },
          generatedAt: new Date(),
        });
      }
    }

    return recommendations;
  }

  /**
   * Check if waitlist entries could be promoted to underfilled loads.
   */
  private async checkWaitlistOpportunities(dropzoneId: number): Promise<ManifestRecommendation[]> {
    const recommendations: ManifestRecommendation[] = [];

    const [waitlistCount, openSlots] = await Promise.all([
      this.prisma.waitlistEntry.count({
        where: { dropzoneId, claimedAt: null, offeredAt: null },
      }),
      this.prisma.load.findMany({
        where: {
          dropzoneId,
          status: { in: ["OPEN", "FILLING"] },
        },
        include: {
          aircraft: { select: { maxCapacity: true } },
          _count: { select: { slots: true } },
        },
      }),
    ]);

    if (waitlistCount === 0) return recommendations;

    const availableSlots = openSlots.reduce(
      (sum, l) => sum + ((l.aircraft.maxCapacity || 20) - l._count.slots),
      0
    );

    if (availableSlots > 0 && waitlistCount > 0) {
      const promotable = Math.min(waitlistCount, availableSlots);
      recommendations.push({
        id: `waitlist-promote-${Date.now()}`,
        type: "WAITLIST_PROMOTE",
        title: `${promotable} waitlist jumper(s) can be promoted`,
        description: `There are ${availableSlots} open slots and ${waitlistCount} jumpers waiting. ${promotable} can be promoted now.`,
        confidence: "HIGH",
        priority: "HIGH",
        actions: [
          { label: `Promote ${promotable} jumper(s)`, action: "ACCEPT", payload: { count: promotable } },
          { label: "Review individually", action: "EDIT" },
          { label: "Dismiss", action: "REJECT" },
        ],
        metadata: { waitlistCount, availableSlots, promotable },
        generatedAt: new Date(),
      });
    }

    return recommendations;
  }

  /**
   * Flag jumpers with high no-show risk based on heuristics.
   */
  private async checkNoShowRisk(dropzoneId: number): Promise<ManifestRecommendation[]> {
    const recommendations: ManifestRecommendation[] = [];

    // Find manifested slots where user has no recent activity (> 60 days since last jump)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const manifestedSlots = await this.prisma.slot.findMany({
      where: {
        load: {
          dropzoneId,
          status: { in: ["OPEN", "FILLING", "LOCKED"] },
        },
        status: "MANIFESTED",
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        load: { select: { loadNumber: true } },
      },
      take: 50,
    });

    for (const slot of manifestedSlots) {
      if (!slot.user) continue;

      // Check last jump date
      const lastJump = await this.prisma.logbookEntry.findFirst({
        where: { userId: slot.user.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });

      if (!lastJump || lastJump.createdAt < sixtyDaysAgo) {
        const daysSince = lastJump
          ? Math.floor((Date.now() - lastJump.createdAt.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        recommendations.push({
          id: `noshow-${slot.id}`,
          type: "NO_SHOW_PREDICTION",
          title: `Possible no-show: ${slot.user.firstName} ${slot.user.lastName}`,
          description: `${slot.user.firstName} has not jumped in ${daysSince > 900 ? "over a year" : daysSince + " days"}. Consider confirming attendance for Load ${slot.load.loadNumber}.`,
          confidence: daysSince > 180 ? "HIGH" : "MEDIUM",
          priority: "LOW",
          actions: [
            { label: "Send confirmation message", action: "ACCEPT", payload: { userId: slot.user.id, slotId: slot.id } },
            { label: "Dismiss", action: "REJECT" },
          ],
          metadata: { userId: slot.user.id, slotId: slot.id, daysSinceLastJump: daysSince },
          generatedAt: new Date(),
        });
      }
    }

    return recommendations;
  }

  /**
   * Log a recommendation action (accept/edit/reject) for audit.
   */
  async logAction(opts: {
    recommendationId: string;
    type: RecommendationType;
    action: "ACCEPT" | "EDIT" | "REJECT";
    userId: number;
    dropzoneId: number;
    notes?: string;
  }): Promise<void> {
    await (this.prisma as any).assistantRecommendation.create({
      data: {
        uuid: opts.recommendationId,
        userId: opts.userId,
        dropzoneId: opts.dropzoneId,
        type: opts.type,
        action: opts.action,
        notes: opts.notes ?? null,
      },
    }).catch(() => {
      // Model may not exist yet — log to audit instead
      return (this.prisma as any).auditLog.create({
        data: {
          userId: opts.userId,
          dropzoneId: opts.dropzoneId,
          action: "AI_RECOMMENDATION" as any,
          entityType: "RECOMMENDATION",
          entityId: 0,
          afterState: {
            recommendationId: opts.recommendationId,
            type: opts.type,
            action: opts.action,
            notes: opts.notes,
          },
          checksum: "pending",
        },
      });
    });
  }
}
