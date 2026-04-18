// ============================================================================
// RIG NOTIFICATION SERVICE
// Per SkyLara_Rig_Maintenance_Complete_Master_File.md — Sections 4, 10
// ============================================================================
//
// Publishes notifications when rig maintenance status changes after counter
// increments or manual maintenance events. Notifies:
//   - Rig owner (if personal rig)
//   - DZ staff: RIGGER, DZ_MANAGER, DZ_OWNER (always for DZ-owned/shared rigs)
//
// Status change detection:
//   Compare previous maintenanceStatus with newly evaluated status.
//   Only fire notification if severity increased (OK→DUE_SOON, DUE_SOON→DUE_NOW, etc.)
//
// This service is called AFTER processCompletedJumpForRig() finishes its
// counter increment + status re-evaluation.
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { FastifyInstance } from "fastify";
import {
  EVENTS,
  NotificationService,
  RigMaintenanceAlertPayload,
  RigGroundingClearedPayload,
  RigMaintenanceCompletedPayload,
} from "./notificationService";
import {
  MaintenanceStatus,
  ComponentStatusResult,
  RigStatusResult,
  fromPrismaMaintenanceStatus,
} from "./rigMaintenanceEngine";

// ============================================================================
// STATUS SEVERITY — only notify on escalation (not when things improve)
// ============================================================================

const STATUS_SEVERITY: Record<string, number> = {
  OK: 0,
  DUE_SOON: 1,
  DUE_NOW: 2,
  OVERDUE: 3,
  GROUNDED: 4,
};

function severityEscalated(prev: string, next: string): boolean {
  return (STATUS_SEVERITY[next] ?? 0) > (STATUS_SEVERITY[prev] ?? 0);
}

/** Map engine MaintenanceStatus to EVENTS key */
function statusToEventType(status: MaintenanceStatus): string | null {
  switch (status) {
    case MaintenanceStatus.DUE_SOON:
      return EVENTS.RIG_DUE_SOON;
    case MaintenanceStatus.DUE_NOW:
      return EVENTS.RIG_DUE_NOW;
    case MaintenanceStatus.OVERDUE:
      return EVENTS.RIG_OVERDUE;
    case MaintenanceStatus.GROUNDED:
      return EVENTS.RIG_GROUNDED;
    default:
      return null;
  }
}

// ============================================================================
// MAIN API
// ============================================================================

/**
 * After a jump counter increment has been processed and the rig status
 * re-evaluated, call this to check if any component crossed a severity
 * threshold and publish notifications accordingly.
 *
 * @param prisma          Prisma client
 * @param notificationSvc Notification service instance (for publishing)
 * @param rigId           The rig that was just updated
 * @param previousStatus  The rig's maintenanceStatus BEFORE the counter update
 * @param newStatus       The freshly evaluated RigStatusResult
 */
export async function publishRigStatusNotifications(
  prisma: PrismaClient,
  notificationSvc: NotificationService,
  rigId: number,
  previousOverallStatus: string,
  newStatus: RigStatusResult
): Promise<void> {
  // Load rig details for notification context
  const rig = await prisma.rig.findUnique({
    where: { id: rigId },
    select: {
      id: true,
      rigName: true,
      serialNumber: true,
      ownerUserId: true,
      dropzoneId: true,
      isSharedRig: true,
    },
  });
  if (!rig || !rig.dropzoneId) return;

  const dropzoneId = rig.dropzoneId;
  const now = Date.now();

  // Check if overall status escalated
  const prevStatus = fromPrismaMaintenanceStatus(previousOverallStatus);
  if (!severityEscalated(prevStatus, newStatus.overallStatus)) {
    return; // No escalation — no notification needed
  }

  // Find the worst component that triggered the escalation
  const worstComponent = findWorstComponent(newStatus.components);
  if (!worstComponent) return;

  const eventType = statusToEventType(newStatus.overallStatus as MaintenanceStatus);
  if (!eventType) return;

  // Build notification payload
  const payload: RigMaintenanceAlertPayload = {
    timestamp: now,
    userId: rig.ownerUserId,
    dropzoneId,
    rigId: rig.id,
    rigName: rig.rigName,
    serialNumber: rig.serialNumber,
    componentType: worstComponent.componentType,
    status: newStatus.overallStatus,
    previousStatus: prevStatus,
    reason: worstComponent.reason,
    triggerType: worstComponent.triggerType,
    triggerValue: worstComponent.triggerValue,
    currentValue: worstComponent.currentValue,
    ownerUserId: rig.ownerUserId,
  };

  // Determine who to notify
  const recipientIds = await getNotificationRecipients(prisma, rig);

  // Send notifications (fire-and-forget with error logging)
  for (const recipientId of recipientIds) {
    try {
      await notificationSvc.notify(recipientId, eventType as any, {
        ...payload,
        userId: recipientId, // override to set the notification target
      });
    } catch (err) {
      console.warn(
        `Rig notification failed for user ${recipientId}, rig ${rigId}, event ${eventType}:`,
        err
      );
    }
  }
}

/**
 * Publish a notification when a grounding is cleared.
 */
export async function publishGroundingClearedNotification(
  prisma: PrismaClient,
  notificationSvc: NotificationService,
  rigId: number,
  componentType: string,
  clearedByUserId: number,
  clearanceNotes: string
): Promise<void> {
  const rig = await prisma.rig.findUnique({
    where: { id: rigId },
    select: {
      id: true,
      rigName: true,
      ownerUserId: true,
      dropzoneId: true,
      isSharedRig: true,
    },
  });
  if (!rig || !rig.dropzoneId) return;

  const clearedBy = await prisma.user.findUnique({
    where: { id: clearedByUserId },
    select: { firstName: true, lastName: true },
  });

  const payload: RigGroundingClearedPayload = {
    timestamp: Date.now(),
    userId: rig.ownerUserId,
    dropzoneId: rig.dropzoneId,
    rigId: rig.id,
    rigName: rig.rigName,
    componentType,
    clearedByName: clearedBy ? `${clearedBy.firstName} ${clearedBy.lastName}` : "Unknown",
    clearanceNotes,
  };

  const recipientIds = await getNotificationRecipients(prisma, rig);

  for (const recipientId of recipientIds) {
    try {
      await notificationSvc.notify(recipientId, EVENTS.RIG_GROUNDING_CLEARED as any, {
        ...payload,
        userId: recipientId,
      });
    } catch (err) {
      console.warn(`Grounding cleared notification failed for user ${recipientId}:`, err);
    }
  }
}

/**
 * Publish a notification when a maintenance event is completed.
 */
export async function publishMaintenanceCompletedNotification(
  prisma: PrismaClient,
  notificationSvc: NotificationService,
  rigId: number,
  componentType: string,
  maintenanceType: string,
  result: string,
  performedByUserId: number
): Promise<void> {
  const rig = await prisma.rig.findUnique({
    where: { id: rigId },
    select: {
      id: true,
      rigName: true,
      ownerUserId: true,
      dropzoneId: true,
      isSharedRig: true,
    },
  });
  if (!rig || !rig.dropzoneId) return;

  const performedBy = await prisma.user.findUnique({
    where: { id: performedByUserId },
    select: { firstName: true, lastName: true },
  });

  const payload: RigMaintenanceCompletedPayload = {
    timestamp: Date.now(),
    userId: rig.ownerUserId,
    dropzoneId: rig.dropzoneId,
    rigId: rig.id,
    rigName: rig.rigName,
    componentType,
    maintenanceType,
    result,
    performedByName: performedBy ? `${performedBy.firstName} ${performedBy.lastName}` : "Unknown",
  };

  const recipientIds = await getNotificationRecipients(prisma, rig);

  for (const recipientId of recipientIds) {
    try {
      await notificationSvc.notify(recipientId, EVENTS.RIG_MAINTENANCE_COMPLETED as any, {
        ...payload,
        userId: recipientId,
      });
    } catch (err) {
      console.warn(`Maintenance completed notification failed for user ${recipientId}:`, err);
    }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/** Find worst component (highest severity) from evaluation results */
function findWorstComponent(
  components: ComponentStatusResult[]
): ComponentStatusResult | null {
  let worst: ComponentStatusResult | null = null;
  for (const c of components) {
    if (!worst || (STATUS_SEVERITY[c.status] ?? 0) > (STATUS_SEVERITY[worst.status] ?? 0)) {
      worst = c;
    }
  }
  return worst;
}

/** Get recipient user IDs: owner + DZ staff (riggers, managers, owners) */
async function getNotificationRecipients(
  prisma: PrismaClient,
  rig: { ownerUserId: number; dropzoneId: number | null; isSharedRig: boolean }
): Promise<number[]> {
  const recipientSet = new Set<number>();

  // Always notify rig owner
  recipientSet.add(rig.ownerUserId);

  // For DZ-registered rigs, also notify relevant staff
  if (rig.dropzoneId) {
    try {
      const staffMembers = await prisma.userRole.findMany({
        where: {
          dropzoneId: rig.dropzoneId,
          role: {
            name: { in: ["RIGGER", "DZ_MANAGER", "DZ_OWNER"] },
          },
        },
        select: { userId: true },
      });

      for (const member of staffMembers) {
        recipientSet.add(member.userId);
      }
    } catch (err) {
      // If dropzoneMembership doesn't exist yet, skip staff notifications
      console.warn("Could not load DZ staff for rig notifications:", err);
    }
  }

  return Array.from(recipientSet);
}
