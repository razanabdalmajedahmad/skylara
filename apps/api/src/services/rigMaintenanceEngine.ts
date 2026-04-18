// ============================================================================
// RIG MAINTENANCE ENGINE
// Per SkyLara_Rig_Maintenance_Complete_Master_File.md — Sections 3, 9
// ============================================================================
//
// This service evaluates maintenance rules against current rig/component state
// and returns a resolved MaintenanceStatus for each component and the rig overall.
//
// Priority order (highest wins):
//   GROUNDED > OVERDUE > DUE_NOW > DUE_SOON > OK
//
// Rule evaluation supports both jump-count and date-based triggers.
// If multiple rules apply, the worst status wins.
// ============================================================================

import { PrismaClient } from "@prisma/client";

// ============================================================================
// STATUS ENUM (mirrors shared types — defined here to avoid import issues)
// ============================================================================

export enum MaintenanceStatus {
  OK = "OK",
  DUE_SOON = "DUE_SOON",
  DUE_NOW = "DUE_NOW",
  OVERDUE = "OVERDUE",
  GROUNDED = "GROUNDED",
}

const STATUS_PRIORITY: Record<MaintenanceStatus, number> = {
  [MaintenanceStatus.OK]: 0,
  [MaintenanceStatus.DUE_SOON]: 1,
  [MaintenanceStatus.DUE_NOW]: 2,
  [MaintenanceStatus.OVERDUE]: 3,
  [MaintenanceStatus.GROUNDED]: 4,
};

// ============================================================================
// TYPES
// ============================================================================

export interface RuleEvalInput {
  ruleId: number;
  componentType: string;
  ruleType: string;
  triggerByJumps: number | null;
  triggerByDays: number | null;
  dueSoonPercent: number;    // e.g. 80 means DUE_SOON at 80% of trigger
  overduePercent: number | null; // e.g. 120 means OVERDUE at 120% of trigger
  hardStop: boolean;
}

export interface ComponentCounters {
  componentType: string;
  jumpsSinceService: number;
  daysSinceService: number;   // computed from last service date
  lastServiceDate: Date | null;
}

export interface ComponentStatusResult {
  componentType: string;
  status: MaintenanceStatus;
  reason: string;
  ruleId: number | null;
  jumpsSinceService: number;
  daysSinceService: number;
  triggerType: "JUMPS" | "DAYS" | "COMBINED" | "GROUNDING" | "NONE";
  triggerValue: number | null;     // the rule threshold that was hit
  currentValue: number | null;     // the current counter value
}

export interface RigStatusResult {
  rigId: number;
  overallStatus: MaintenanceStatus;
  components: ComponentStatusResult[];
  activeGroundings: ActiveGrounding[];
  evaluatedAt: Date;
}

export interface ActiveGrounding {
  id: number;
  componentType: string;
  reason: string;
  policySource: string | null;
  groundedAt: Date;
}

// ============================================================================
// RULE EVALUATION — PURE FUNCTION (no DB)
// ============================================================================

/**
 * Evaluate a single rule against a component's current counters.
 *
 * For a 50-jump rule with dueSoonPercent=80, overduePercent=120:
 *   0..39  = OK
 *   40..49 = DUE_SOON
 *   50     = DUE_NOW
 *   51..59 = DUE_NOW (between trigger and overdue threshold)
 *   60+    = OVERDUE
 *
 * Same logic applies to days-based rules.
 * If both triggers exist, the worst result wins.
 */
export function evaluateRule(
  rule: RuleEvalInput,
  counters: ComponentCounters
): { status: MaintenanceStatus; reason: string; triggerType: "JUMPS" | "DAYS" | "COMBINED"; triggerValue: number | null; currentValue: number | null } {
  let jumpStatus = MaintenanceStatus.OK;
  let dayStatus = MaintenanceStatus.OK;
  let jumpReason = "";
  let dayReason = "";
  let triggerType: "JUMPS" | "DAYS" | "COMBINED" = "JUMPS";
  let triggerValue: number | null = null;
  let currentValue: number | null = null;

  // Jump-count evaluation
  if (rule.triggerByJumps !== null && rule.triggerByJumps > 0) {
    const trigger = rule.triggerByJumps;
    const dueSoonAt = Math.floor(trigger * (rule.dueSoonPercent / 100));
    const overdueAt = rule.overduePercent
      ? Math.floor(trigger * (rule.overduePercent / 100))
      : trigger + Math.floor(trigger * 0.2); // default 20% over
    const current = counters.jumpsSinceService;

    triggerValue = trigger;
    currentValue = current;

    if (current >= overdueAt) {
      jumpStatus = rule.hardStop ? MaintenanceStatus.GROUNDED : MaintenanceStatus.OVERDUE;
      jumpReason = `${current}/${trigger} jumps — ${rule.hardStop ? "GROUNDED" : "overdue"} (threshold: ${overdueAt})`;
    } else if (current >= trigger) {
      jumpStatus = MaintenanceStatus.DUE_NOW;
      jumpReason = `${current}/${trigger} jumps — due now`;
    } else if (current >= dueSoonAt) {
      jumpStatus = MaintenanceStatus.DUE_SOON;
      jumpReason = `${current}/${trigger} jumps — due soon (${trigger - current} remaining)`;
    }
  }

  // Date/days evaluation
  if (rule.triggerByDays !== null && rule.triggerByDays > 0) {
    const trigger = rule.triggerByDays;
    const dueSoonAt = Math.floor(trigger * (rule.dueSoonPercent / 100));
    const overdueAt = rule.overduePercent
      ? Math.floor(trigger * (rule.overduePercent / 100))
      : trigger + Math.floor(trigger * 0.2);
    const current = counters.daysSinceService;

    if (rule.triggerByJumps === null) {
      triggerType = "DAYS";
      triggerValue = trigger;
      currentValue = current;
    } else {
      triggerType = "COMBINED";
    }

    if (current >= overdueAt) {
      dayStatus = rule.hardStop ? MaintenanceStatus.GROUNDED : MaintenanceStatus.OVERDUE;
      dayReason = `${current}/${trigger} days — ${rule.hardStop ? "GROUNDED" : "overdue"} (threshold: ${overdueAt})`;
    } else if (current >= trigger) {
      dayStatus = MaintenanceStatus.DUE_NOW;
      dayReason = `${current}/${trigger} days — due now`;
    } else if (current >= dueSoonAt) {
      dayStatus = MaintenanceStatus.DUE_SOON;
      dayReason = `${current}/${trigger} days — due soon (${trigger - current} remaining)`;
    }
  }

  // Worst-of wins
  const finalStatus = STATUS_PRIORITY[jumpStatus] >= STATUS_PRIORITY[dayStatus]
    ? jumpStatus
    : dayStatus;
  const finalReason = STATUS_PRIORITY[jumpStatus] >= STATUS_PRIORITY[dayStatus]
    ? jumpReason
    : dayReason;

  // If combined, pick worst trigger info
  if (triggerType === "COMBINED" && STATUS_PRIORITY[dayStatus] > STATUS_PRIORITY[jumpStatus]) {
    triggerValue = rule.triggerByDays;
    currentValue = counters.daysSinceService;
  }

  return {
    status: finalStatus,
    reason: finalReason || "OK",
    triggerType,
    triggerValue,
    currentValue,
  };
}

// ============================================================================
// FULL RIG STATUS EVALUATION — REQUIRES DB
// ============================================================================

/**
 * Evaluate full maintenance status for a rig.
 *
 * Steps:
 * 1. Load rig with all components
 * 2. Load active grounding records
 * 3. Load applicable rules (rig-specific + DZ defaults + global defaults)
 * 4. Compute component counters
 * 5. Evaluate each rule
 * 6. Merge per-component results (worst wins)
 * 7. Apply grounding overrides
 * 8. Return overall + per-component status
 */
export async function evaluateRigStatus(
  prisma: PrismaClient,
  rigId: number
): Promise<RigStatusResult> {
  // 1. Load rig with components
  const rig = await prisma.rig.findUniqueOrThrow({
    where: { id: rigId },
    include: {
      mainCanopy: true,
      reserve: true,
      aad: true,
      container: true,
    },
  });

  // 1b. Fetch most recent rig-level maintenance event for daysSinceService
  const lastRigEvent = await prisma.maintenanceEvent.findFirst({
    where: { rigId, componentType: "RIG" },
    orderBy: { eventDate: "desc" },
    select: { eventDate: true },
  });

  // 2. Load active groundings
  const activeGroundings = await prisma.rigGroundingRecord.findMany({
    where: { rigId, active: true },
  });

  // 3. Load applicable rules
  //    Priority: rig-specific > DZ-default > global (no rig, no DZ)
  const rules = await prisma.maintenanceRule.findMany({
    where: {
      enabled: true,
      OR: [
        { rigId },                            // rig-specific
        { rigId: null, dropzoneId: rig.dropzoneId }, // DZ defaults
        { rigId: null, dropzoneId: null },    // global defaults
      ],
      // Filter by rig type if rule has appliesToRigType
      AND: [
        {
          OR: [
            { appliesToRigType: null },
            { appliesToRigType: rig.rigType },
          ],
        },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  // 4. Build component counters
  const now = new Date();
  const daysSince = (d: Date | null): number => {
    if (!d) return 9999; // never serviced = treat as very overdue
    return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  };

  const componentCounters: Record<string, ComponentCounters> = {};

  // Rig-level (overall) — use most recent RIG-level maintenance event date, fall back to createdAt
  const lastRigServiceDate = lastRigEvent?.eventDate ?? null;
  componentCounters["RIG"] = {
    componentType: "RIG",
    jumpsSinceService: rig.totalJumps,
    daysSinceService: daysSince(lastRigServiceDate || rig.createdAt),
    lastServiceDate: lastRigServiceDate,
  };

  // Main canopy
  if (rig.mainCanopy) {
    componentCounters["MAIN"] = {
      componentType: "MAIN",
      jumpsSinceService: rig.mainCanopy.jumpsSinceInspection,
      daysSinceService: daysSince(rig.mainCanopy.lastInspectionDate),
      lastServiceDate: rig.mainCanopy.lastInspectionDate,
    };
    componentCounters["LINESET"] = {
      componentType: "LINESET",
      jumpsSinceService: rig.mainCanopy.jumpsSinceReline,
      daysSinceService: daysSince(rig.mainCanopy.lastRelineDate),
      lastServiceDate: rig.mainCanopy.lastRelineDate,
    };
  }

  // Reserve
  if (rig.reserve) {
    componentCounters["RESERVE"] = {
      componentType: "RESERVE",
      jumpsSinceService: 0, // reserve doesn't count jumps — date-driven
      daysSinceService: daysSince(rig.reserve.repackDate),
      lastServiceDate: rig.reserve.repackDate,
    };
  }

  // AAD
  if (rig.aad) {
    componentCounters["AAD"] = {
      componentType: "AAD",
      jumpsSinceService: 0, // AAD is date-driven
      daysSinceService: daysSince(rig.aad.lastServiceDate),
      lastServiceDate: rig.aad.lastServiceDate,
    };
  }

  // 5. Evaluate each rule against its component
  const statusMap: Record<string, ComponentStatusResult> = {};

  for (const rule of rules) {
    const ct = rule.componentType;
    const counters = componentCounters[ct];
    if (!counters) continue; // component doesn't exist on this rig

    const ruleInput: RuleEvalInput = {
      ruleId: rule.id,
      componentType: ct,
      ruleType: rule.ruleType,
      triggerByJumps: rule.triggerByJumps,
      triggerByDays: rule.triggerByDays,
      dueSoonPercent: rule.dueSoonPercent,
      overduePercent: rule.overduePercent,
      hardStop: rule.hardStop,
    };

    const result = evaluateRule(ruleInput, counters);

    // Merge: keep worst status per component
    const existing = statusMap[ct];
    if (!existing || STATUS_PRIORITY[result.status] > STATUS_PRIORITY[existing.status as MaintenanceStatus]) {
      statusMap[ct] = {
        componentType: ct,
        status: result.status,
        reason: result.reason,
        ruleId: rule.id,
        jumpsSinceService: counters.jumpsSinceService,
        daysSinceService: counters.daysSinceService,
        triggerType: result.triggerType,
        triggerValue: result.triggerValue,
        currentValue: result.currentValue,
      };
    }
  }

  // 6. Apply grounding overrides
  for (const g of activeGroundings) {
    const ct = g.componentType;
    const existing = statusMap[ct];
    if (!existing) {
      statusMap[ct] = {
        componentType: ct,
        status: MaintenanceStatus.GROUNDED,
        reason: g.reason,
        ruleId: null,
        jumpsSinceService: componentCounters[ct]?.jumpsSinceService ?? 0,
        daysSinceService: componentCounters[ct]?.daysSinceService ?? 0,
        triggerType: "GROUNDING",
        triggerValue: null,
        currentValue: null,
      };
    } else if (STATUS_PRIORITY[MaintenanceStatus.GROUNDED] > STATUS_PRIORITY[existing.status as MaintenanceStatus]) {
      existing.status = MaintenanceStatus.GROUNDED;
      existing.reason = g.reason;
      existing.triggerType = "GROUNDING";
    }
  }

  // Fill in any component that has no rules — default to OK
  for (const ct of Object.keys(componentCounters)) {
    if (!statusMap[ct]) {
      statusMap[ct] = {
        componentType: ct,
        status: MaintenanceStatus.OK,
        reason: "OK",
        ruleId: null,
        jumpsSinceService: componentCounters[ct].jumpsSinceService,
        daysSinceService: componentCounters[ct].daysSinceService,
        triggerType: "NONE",
        triggerValue: null,
        currentValue: null,
      };
    }
  }

  // 7. Compute overall rig status = worst of all components
  const components = Object.values(statusMap);
  let overallStatus = MaintenanceStatus.OK;
  for (const c of components) {
    if (STATUS_PRIORITY[c.status as MaintenanceStatus] > STATUS_PRIORITY[overallStatus]) {
      overallStatus = c.status as MaintenanceStatus;
    }
  }

  return {
    rigId,
    overallStatus,
    components,
    activeGroundings: activeGroundings.map((g) => ({
      id: g.id,
      componentType: g.componentType,
      reason: g.reason,
      policySource: g.policySource,
      groundedAt: g.groundedAt,
    })),
    evaluatedAt: now,
  };
}

// ============================================================================
// STATUS SNAPSHOT — for embedding in usage events
// ============================================================================

export function statusesToSnapshot(
  components: ComponentStatusResult[]
): Record<string, string> {
  const snap: Record<string, string> = {};
  for (const c of components) {
    snap[c.componentType] = c.status;
  }
  return snap;
}

// ============================================================================
// MANIFEST GATE CHECK — can this rig be used for manifesting?
// ============================================================================

export interface ManifestGateResult {
  allowed: boolean;
  status: MaintenanceStatus;
  blockers: Array<{ componentType: string; reason: string }>;
  warnings: Array<{ componentType: string; reason: string }>;
}

export function checkManifestGate(rigStatus: RigStatusResult): ManifestGateResult {
  const blockers: Array<{ componentType: string; reason: string }> = [];
  const warnings: Array<{ componentType: string; reason: string }> = [];

  for (const c of rigStatus.components) {
    switch (c.status) {
      case MaintenanceStatus.GROUNDED:
        blockers.push({ componentType: c.componentType, reason: c.reason });
        break;
      case MaintenanceStatus.OVERDUE:
        warnings.push({ componentType: c.componentType, reason: c.reason });
        break;
      case MaintenanceStatus.DUE_NOW:
        warnings.push({ componentType: c.componentType, reason: c.reason });
        break;
      case MaintenanceStatus.DUE_SOON:
        warnings.push({ componentType: c.componentType, reason: c.reason });
        break;
    }
  }

  return {
    allowed: blockers.length === 0,
    status: rigStatus.overallStatus,
    blockers,
    warnings,
  };
}

// ============================================================================
// DEFAULT RULE TEMPLATES (per spec Section 3.4)
// ============================================================================

export interface DefaultRuleTemplate {
  componentType: string;
  ruleType: string;
  triggerByJumps: number | null;
  triggerByDays: number | null;
  dueSoonPercent: number;
  overduePercent: number;
  hardStop: boolean;
  label: string;
}

export const DEFAULT_RULE_TEMPLATES: DefaultRuleTemplate[] = [
  {
    componentType: "MAIN",
    ruleType: "INSPECTION",
    triggerByJumps: 50,
    triggerByDays: 90,
    dueSoonPercent: 80, // 40 jumps / 72 days
    overduePercent: 120, // 60 jumps / 105 days (approx)
    hardStop: false,
    label: "Main Canopy Inspection",
  },
  {
    componentType: "LINESET",
    ruleType: "INSPECTION",
    triggerByJumps: 50,
    triggerByDays: null,
    dueSoonPercent: 80,
    overduePercent: 120,
    hardStop: false,
    label: "Line Set Inspection",
  },
  {
    componentType: "RESERVE",
    ruleType: "COMPLIANCE",
    triggerByJumps: null,
    triggerByDays: 180, // 6-month cycle (varies by regulation)
    dueSoonPercent: 83,  // ~30 days before due
    overduePercent: 100, // overdue = past due date
    hardStop: true,
    label: "Reserve Repack",
  },
  {
    componentType: "AAD",
    ruleType: "SERVICE",
    triggerByJumps: null,
    triggerByDays: 365, // annual service typical
    dueSoonPercent: 92,  // ~30 days before due
    overduePercent: 100,
    hardStop: true,
    label: "AAD Service",
  },
];

// ============================================================================
// PRISMA ENUM MAPPING
// ============================================================================
// Prisma schema uses GROUNDED_STATUS (to avoid collision with GearStatus.GROUNDED).
// This engine uses GROUNDED internally. These helpers convert at the boundary.

/** Convert service-layer status to Prisma enum value */
export function toPrismaMaintenanceStatus(status: MaintenanceStatus): string {
  return status === MaintenanceStatus.GROUNDED ? "GROUNDED_STATUS" : status;
}

/** Convert Prisma enum value to service-layer status */
export function fromPrismaMaintenanceStatus(prismaValue: string): MaintenanceStatus {
  return prismaValue === "GROUNDED_STATUS" ? MaintenanceStatus.GROUNDED : (prismaValue as MaintenanceStatus);
}

// ============================================================================
// RIG JUMP USAGE — counter increment + status re-evaluation
// ============================================================================
// Called when a load transitions to COMPLETE. For each slot with a rigId,
// creates an immutable RigJumpUsageEvent and re-evaluates maintenance status.

/** Result returned after processing a completed jump — includes previous and
 *  new status so the caller can fire notifications on escalation. */
export interface JumpProcessingResult {
  previousStatus: string;
  newStatus: RigStatusResult;
}

export async function processCompletedJumpForRig(
  prisma: PrismaClient,
  rigId: number,
  slotId: number,
  loadId: number,
  userId: number,
  completedAt: Date
): Promise<JumpProcessingResult> {
  // Capture status BEFORE the counter increment (for escalation comparison)
  const rigBefore = await prisma.rig.findUnique({
    where: { id: rigId },
    select: { maintenanceStatus: true },
  });
  const previousStatus = rigBefore?.maintenanceStatus ?? "OK";

  // Use a transaction to ensure counter increment + usage event are atomic
  await prisma.$transaction(async (tx) => {
    // 1. Lock and increment rig total jumps
    const rig = await tx.rig.update({
      where: { id: rigId },
      data: { totalJumps: { increment: 1 } },
      include: { mainCanopy: true },
    });

    // 2. Increment main canopy counters if present
    let mainTotalAfter: number | null = null;
    let lineSetAfter: number | null = null;
    if (rig.mainCanopy) {
      const updatedCanopy = await tx.rigMainCanopy.update({
        where: { id: rig.mainCanopy.id },
        data: {
          totalJumps: { increment: 1 },
          jumpsSinceInspection: { increment: 1 },
          jumpsSinceReline: { increment: 1 },
        },
      });
      mainTotalAfter = updatedCanopy.totalJumps;
      lineSetAfter = updatedCanopy.jumpsSinceReline;
    }

    // 3. Write immutable usage event (unique index on rigId+jumpId ensures idempotency)
    await tx.rigJumpUsageEvent.create({
      data: {
        rigId,
        jumpId: slotId,
        loadId,
        userId,
        completedAt,
        rigTotalAfter: rig.totalJumps, // already incremented
        mainTotalAfter,
        lineSetAfter,
      },
    });
  });

  // 4. Re-evaluate maintenance status (outside transaction for read performance)
  const newStatus = await evaluateRigStatus(prisma, rigId);

  // 5. Persist the overall status on the rig record
  await prisma.rig.update({
    where: { id: rigId },
    data: {
      maintenanceStatus: toPrismaMaintenanceStatus(newStatus.overallStatus) as any,
    },
  });

  return { previousStatus: fromPrismaMaintenanceStatus(previousStatus), newStatus };
}
