import { PrismaClient } from "@prisma/client";

// ============================================================================
// VERIFICATION SERVICE — Universal verification state (Expert Feedback §4)
// ============================================================================
//
// Every operator-sensitive field (license, gear, progression, etc.) can have
// a verification record tracking: who verified it, when, how, and when it
// expires. This replaces ad-hoc "self-declared" patterns with a consistent
// trust model across the platform.
//
// States: SELF_DECLARED → DZ_VERIFIED / STAFF_VERIFIED / RIGGER_VERIFIED /
//         INSTRUCTOR_VERIFIED / PILOT_CONFIRMED / AUTHORITY_VERIFIED
//         → VER_EXPIRED / REVIEW_REQUIRED
// ============================================================================

// Role requirements per verification state
const STATE_ROLE_REQUIREMENTS: Record<string, string[]> = {
  SELF_DECLARED: [], // any authenticated user
  DZ_VERIFIED: ["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"],
  STAFF_VERIFIED: ["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"],
  RIGGER_VERIFIED: ["RIGGER", "DZ_MANAGER", "PLATFORM_ADMIN"],
  INSTRUCTOR_VERIFIED: ["TANDEM_INSTRUCTOR", "AFF_INSTRUCTOR", "COACH", "DZ_MANAGER", "PLATFORM_ADMIN"],
  PILOT_CONFIRMED: ["PILOT", "DZ_MANAGER", "PLATFORM_ADMIN"],
  AUTHORITY_VERIFIED: ["DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"],
  VER_EXPIRED: ["SYSTEM"], // system-set only
  REVIEW_REQUIRED: ["MANIFEST_STAFF", "DZ_MANAGER", "DZ_OWNER", "PLATFORM_ADMIN"],
};

export class VerificationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create or update verification for an entity. Appends to history.
   */
  async verify(opts: {
    entityType: string;
    entityId: number;
    dropzoneId: number;
    status: string;
    verifiedById: number;
    source?: string;
    evidenceNote?: string;
    evidenceUrl?: string;
    expiresAt?: Date;
    reviewIntervalDays?: number;
    reason?: string;
  }): Promise<any> {
    const prismaAny = this.prisma as any;

    // Upsert the verification record
    const existing = await prismaAny.verification.findUnique({
      where: { entityType_entityId: { entityType: opts.entityType, entityId: opts.entityId } },
    });

    const previousStatus = existing?.status ?? null;

    const verification = await prismaAny.verification.upsert({
      where: { entityType_entityId: { entityType: opts.entityType, entityId: opts.entityId } },
      create: {
        entityType: opts.entityType,
        entityId: opts.entityId,
        dropzoneId: opts.dropzoneId,
        status: opts.status,
        verifiedById: opts.verifiedById,
        verificationSource: opts.source ?? null,
        evidenceNote: opts.evidenceNote ?? null,
        evidenceUrl: opts.evidenceUrl ?? null,
        expiresAt: opts.expiresAt ?? null,
        reviewIntervalDays: opts.reviewIntervalDays ?? null,
      },
      update: {
        status: opts.status,
        verifiedById: opts.verifiedById,
        verificationSource: opts.source ?? null,
        evidenceNote: opts.evidenceNote ?? null,
        evidenceUrl: opts.evidenceUrl ?? null,
        expiresAt: opts.expiresAt ?? null,
        reviewIntervalDays: opts.reviewIntervalDays ?? null,
      },
    });

    // Append to history
    await prismaAny.verificationHistory.create({
      data: {
        verificationId: verification.id,
        entityType: opts.entityType,
        entityId: opts.entityId,
        fromStatus: previousStatus,
        toStatus: opts.status,
        changedById: opts.verifiedById,
        reason: opts.reason ?? null,
        evidenceUrl: opts.evidenceUrl ?? null,
      },
    });

    // If entityType is LICENSE, also update legacy License fields for backwards compat
    if (opts.entityType === "LICENSE") {
      try {
        await this.prisma.license.update({
          where: { id: opts.entityId },
          data: {
            verifiedBy: opts.verifiedById,
            verifiedAt: new Date(),
          },
        });
      } catch {
        // License may not exist — non-blocking
      }
    }

    return verification;
  }

  /**
   * Get current verification for an entity.
   */
  async getVerification(entityType: string, entityId: number): Promise<any | null> {
    return (this.prisma as any).verification.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
    });
  }

  /**
   * List verifications for a dropzone with optional filters.
   */
  async listVerifications(dropzoneId: number, filters?: {
    entityType?: string;
    status?: string;
    expiringSoon?: boolean; // within 30 days
  }): Promise<any[]> {
    const where: any = { dropzoneId };
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.status) where.status = filters.status;
    if (filters?.expiringSoon) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      where.expiresAt = { lte: thirtyDaysFromNow, gt: new Date() };
    }

    return (this.prisma as any).verification.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
  }

  /**
   * Get review queue: all REVIEW_REQUIRED and VER_EXPIRED verifications.
   */
  async getReviewQueue(dropzoneId: number): Promise<any[]> {
    return (this.prisma as any).verification.findMany({
      where: {
        dropzoneId,
        status: { in: ["REVIEW_REQUIRED", "VER_EXPIRED"] },
      },
      orderBy: { updatedAt: "asc" },
    });
  }

  /**
   * Check and expire verifications past their expiresAt. Run via cron.
   */
  async checkExpiry(): Promise<{ expired: number }> {
    const now = new Date();
    const result = await (this.prisma as any).verification.updateMany({
      where: {
        expiresAt: { lte: now },
        status: { notIn: ["VER_EXPIRED", "REVIEW_REQUIRED"] },
      },
      data: { status: "VER_EXPIRED" },
    });
    return { expired: result.count ?? 0 };
  }

  /**
   * Get full verification history for an entity.
   */
  async getEntityHistory(entityType: string, entityId: number): Promise<any[]> {
    return (this.prisma as any).verificationHistory.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Check if a user has the required role for a given verification state.
   */
  static canSetState(state: string, userRoles: string[]): boolean {
    const required = STATE_ROLE_REQUIREMENTS[state];
    if (!required || required.length === 0) return true;
    return required.some((r) => userRoles.includes(r));
  }
}
