import { PrismaClient, AuditAction } from "@prisma/client";
import { createHash } from "crypto";
import { AUDIT_CONFIG } from "@repo/config";

// ============================================================================
// AUDIT SERVICE — Append-only, checksum-chained tamper detection
// ============================================================================

export interface AuditEntry {
  userId: number | string;
  dropzoneId: number | string;
  action: AuditAction | string;
  entityType: string;
  entityId: number | string;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Scrub sensitive fields from state objects before persisting.
 * Fields listed in AUDIT_CONFIG.SENSITIVE_FIELDS are replaced with "[REDACTED]".
 */
function scrubSensitiveFields(
  obj: Record<string, any> | undefined
): Record<string, any> | undefined {
  if (!obj) return undefined;
  const scrubbed = { ...obj };
  for (const field of AUDIT_CONFIG.SENSITIVE_FIELDS) {
    if (field in scrubbed) {
      scrubbed[field] = "[REDACTED]";
    }
  }
  return scrubbed;
}

/**
 * Compute SHA-256 checksum over the canonical payload fields.
 * The checksum covers: userId, dropzoneId, action, entityType, entityId,
 * beforeState, afterState, and the previous row's checksum (chain link).
 */
function computeChecksum(
  entry: AuditEntry,
  prevChecksum: string | null
): string {
  const payload = JSON.stringify({
    userId: entry.userId,
    dropzoneId: entry.dropzoneId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    beforeState: entry.beforeState ?? null,
    afterState: entry.afterState ?? null,
    prevChecksum: prevChecksum ?? null,
  });
  return createHash(AUDIT_CONFIG.HASH_ALGORITHM.replace("-", "").toLowerCase())
    .update(payload)
    .digest("hex");
}

export class AuditService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Append a new audit log entry with chained checksums.
   * Scrubs sensitive fields from before/after state before persisting.
   * Never throws — audit failures are logged to stderr but do not break operations.
   */
  async log(entry: AuditEntry): Promise<void> {
    try {
      // Get the checksum of the most recent row for chain integrity
      const lastRow = await this.prisma.auditLog.findFirst({
        orderBy: { id: "desc" },
        select: { checksum: true },
      });
      const prevChecksum = lastRow?.checksum ?? null;

      // Scrub sensitive data
      const scrubbedBefore = scrubSensitiveFields(entry.beforeState);
      const scrubbedAfter = scrubSensitiveFields(entry.afterState);

      const scrubbedEntry: AuditEntry = {
        ...entry,
        beforeState: scrubbedBefore,
        afterState: scrubbedAfter,
      };

      const checksum = computeChecksum(scrubbedEntry, prevChecksum);

      await this.prisma.auditLog.create({
        data: {
          userId:
            typeof entry.userId === "string"
              ? parseInt(entry.userId)
              : entry.userId,
          dropzoneId:
            typeof entry.dropzoneId === "string"
              ? parseInt(entry.dropzoneId)
              : entry.dropzoneId,
          action: entry.action as AuditAction,
          entityType: entry.entityType,
          entityId:
            typeof entry.entityId === "string"
              ? parseInt(entry.entityId)
              : entry.entityId,
          beforeState: scrubbedBefore || undefined,
          afterState: scrubbedAfter || undefined,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          checksum,
          prevChecksum,
        },
      });
    } catch (error) {
      console.error("Audit log failed:", error);
      // Don't throw — audit failures shouldn't break operations
    }
  }

  /**
   * Verify the integrity of the audit chain.
   * Returns { valid: true } if all checksums match, or details of the first break.
   */
  async verifyChain(
    dropzoneId?: number | string
  ): Promise<{ valid: boolean; brokenAtId?: number; details?: string }> {
    const where = dropzoneId
      ? {
          dropzoneId:
            typeof dropzoneId === "string"
              ? parseInt(dropzoneId)
              : dropzoneId,
        }
      : {};

    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: { id: "asc" },
      select: {
        id: true,
        checksum: true,
        prevChecksum: true,
      },
    });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (i === 0) {
        // First row should have null prevChecksum
        if (row.prevChecksum !== null) {
          return {
            valid: false,
            brokenAtId: row.id,
            details: "First row has non-null prevChecksum",
          };
        }
      } else {
        const prev = rows[i - 1];
        if (row.prevChecksum !== prev.checksum) {
          return {
            valid: false,
            brokenAtId: row.id,
            details: `Chain broken: row ${row.id} prevChecksum does not match row ${prev.id} checksum`,
          };
        }
      }
    }

    return { valid: true };
  }

  async queryLogs(
    dropzoneId: number | string,
    filters?: {
      userId?: number | string;
      action?: string;
      entityType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ) {
    const dzId =
      typeof dropzoneId === "string" ? parseInt(dropzoneId) : dropzoneId;
    const query: any = { dropzoneId: dzId };

    if (filters?.userId) {
      query.userId =
        typeof filters.userId === "string"
          ? parseInt(filters.userId as string)
          : filters.userId;
    }
    if (filters?.action) query.action = filters.action;
    if (filters?.entityType) query.entityType = filters.entityType;

    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.gte = filters.startDate;
      if (filters.endDate) query.createdAt.lte = filters.endDate;
    }

    return this.prisma.auditLog.findMany({
      where: query,
      orderBy: { createdAt: "desc" },
      take: filters?.limit || 100,
      skip: filters?.offset || 0,
    });
  }
}

export function createAuditService(prisma: PrismaClient): AuditService {
  return new AuditService(prisma);
}
