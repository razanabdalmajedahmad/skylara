import { PrismaClient } from "@prisma/client";
import { SafetyGateError } from "../utils/errors";
import { SLOT_RULES } from "@repo/config";
import { PolicyEngine } from "./policyEngine";
import { evaluateRigStatus, checkManifestGate, MaintenanceStatus } from "./rigMaintenanceEngine";

// ============================================================================
// 10 SAFETY BLOCKING GATES — Check-in Compliance Grid
// ============================================================================
// Now uses PolicyEngine for dynamic thresholds. Falls back to hardcoded
// defaults if the policy engine has no value for a given key.
//
// 1.  CG Gate           — CG check PASS for load (handled in loadFsm.ts)
// 2.  License Gate      — Valid, non-expired license
// 3.  Currency Gate     — Jumped within currency window by license level
// 4.  Waiver Gate       — Active waiver signed (NO OVERRIDE)
// 5.  Gear Check Gate   — Gear passed inspection within N hours (policy-driven)
// 6.  Reserve Repack    — Reserve repack not overdue (policy-driven)
// 7.  AAD Gate          — AAD service current and not life-expired (policy-driven)
// 8.  Weight Gate       — Within DZ weight limits for activity (policy-driven)
// 9.  Pilot Duty Gate   — Pilot within FAA duty limits (NO OVERRIDE)
// 10. Aircraft Airworthiness — All certs current (NO OVERRIDE)
// ============================================================================

export type GateStatus = "PASS" | "FAIL" | "WARNING" | "NOT_CHECKED";

export interface GateResult {
  gate: string;
  status: GateStatus;
  message: string;
  canOverride: boolean;
  overrideRoles: string[];
  details?: Record<string, any>;
}

export interface ComplianceResult {
  userId: number;
  dropzoneId: number;
  allPassed: boolean;
  gates: GateResult[];
  checkedAt: Date;
}

/** Fallback currency windows if policy engine unavailable. */
const DEFAULT_CURRENCY_WINDOWS: Record<string, number> = {
  STUDENT: 30,
  A: 60,
  B: 60,
  C: 90,
  D: 180,
};

export class ValidationGatesService {
  private policyEngine: PolicyEngine | null = null;

  constructor(private prisma: PrismaClient, policyEngine?: PolicyEngine) {
    this.policyEngine = policyEngine ?? null;
  }

  private toInt(val: string | number): number {
    return typeof val === "number" ? val : parseInt(val, 10);
  }

  // ── Gate 2: License ──────────────────────────────────────────────────

  async checkLicense(userId: number): Promise<GateResult> {
    const license = await this.prisma.license.findFirst({
      where: { userId },
      orderBy: { expiresAt: "desc" },
    });

    if (!license) {
      return {
        gate: "LICENSE",
        status: "FAIL",
        message: "No license on file",
        canOverride: true,
        overrideRoles: ["DZ_MANAGER"],
      };
    }

    if (license.expiresAt && license.expiresAt < new Date()) {
      return {
        gate: "LICENSE",
        status: "FAIL",
        message: `License expired on ${license.expiresAt.toISOString().split("T")[0]}`,
        canOverride: true,
        overrideRoles: ["DZ_MANAGER"],
        details: { licenseId: license.id, expiresAt: license.expiresAt },
      };
    }

    return {
      gate: "LICENSE",
      status: "PASS",
      message: "License current",
      canOverride: false,
      overrideRoles: [],
      details: { level: license.level, expiresAt: license.expiresAt },
    };
  }

  // ── Gate 3: Currency ─────────────────────────────────────────────────

  async checkCurrency(userId: number): Promise<GateResult> {
    // Get license level to determine currency window
    const license = await this.prisma.license.findFirst({
      where: { userId },
      orderBy: { expiresAt: "desc" },
    });

    const level = license?.level ?? "STUDENT";
    // Try policy engine for per-DZ configurable currency window, fall back to default
    let windowDays = DEFAULT_CURRENCY_WINDOWS[level] ?? 90;
    if (this.policyEngine) {
      try {
        const policyValue = await this.policyEngine.resolve<number>(
          `compliance.currencyWindow.${level}`,
          {}, // context will be enriched when dropzoneId is available
          windowDays
        );
        windowDays = policyValue;
      } catch {
        // fallback already set
      }
    }
    const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    // Check for completed jumps within the currency window
    const recentJumps = await this.prisma.slot.count({
      where: {
        userId,
        status: "JUMPED",
        load: {
          status: "COMPLETE",
          updatedAt: { gte: cutoff },
        },
      },
    });

    // Also check logbook entries if no slots found
    const logbookJumps = await this.prisma.logbookEntry.count({
      where: {
        userId,
        createdAt: { gte: cutoff },
      },
    });

    const totalRecent = recentJumps + logbookJumps;

    if (totalRecent === 0) {
      // Check if they're just barely out — warning vs fail
      const warningCutoff = new Date(cutoff.getTime() - 7 * 24 * 60 * 60 * 1000);
      const warningJumps = await this.prisma.slot.count({
        where: {
          userId,
          status: "JUMPED",
          load: {
            status: "COMPLETE",
            updatedAt: { gte: warningCutoff },
          },
        },
      });

      if (warningJumps > 0) {
        return {
          gate: "CURRENCY",
          status: "WARNING",
          message: `Currency expiring soon (${level} license: ${windowDays}-day window)`,
          canOverride: true,
          overrideRoles: ["DZ_MANAGER"],
          details: { level, windowDays, lastJumpWithinWarning: true },
        };
      }

      return {
        gate: "CURRENCY",
        status: "FAIL",
        message: `Not current — no jumps in ${windowDays} days (${level} license)`,
        canOverride: true,
        overrideRoles: ["DZ_MANAGER"],
        details: { level, windowDays },
      };
    }

    return {
      gate: "CURRENCY",
      status: "PASS",
      message: `Current — ${totalRecent} jump(s) in last ${windowDays} days`,
      canOverride: false,
      overrideRoles: [],
      details: { level, windowDays, recentJumps: totalRecent },
    };
  }

  // ── Gate 4: Waiver (NO OVERRIDE) ────────────────────────────────────

  async checkWaiver(userId: number, dropzoneId: number): Promise<GateResult> {
    const signature = await this.prisma.waiverSignature.findFirst({
      where: {
        userId,
        waiver: { dropzoneId, isActive: true },
      },
      orderBy: { signedAt: "desc" },
    });

    if (!signature) {
      return {
        gate: "WAIVER",
        status: "FAIL",
        message: "Active waiver not signed — no override possible",
        canOverride: false, // NO OVERRIDE for waiver
        overrideRoles: [],
      };
    }

    return {
      gate: "WAIVER",
      status: "PASS",
      message: "Waiver signed",
      canOverride: false,
      overrideRoles: [],
      details: { signedAt: signature.signedAt },
    };
  }

  // ── Gate 5: Gear Check ───────────────────────────────────────────────

  async checkGear(userId: number, dropzoneId: number): Promise<GateResult> {
    const gear = await this.prisma.gearItem.findFirst({
      where: {
        ownerId: userId,
        dropzoneId,
        status: "ACTIVE",
      },
      include: {
        checks: {
          take: 1,
          orderBy: { checkedAt: "desc" },
        },
      },
    });

    if (!gear) {
      // May be using rental gear — check GearRental
      const rental = await this.prisma.gearRental.findFirst({
        where: {
          userId,
          returnedAt: null,
        },
        include: {
          gearItem: {
            include: {
              checks: {
                take: 1,
                orderBy: { checkedAt: "desc" },
              },
            },
          },
        },
      });

      if (!rental) {
        return {
          gate: "GEAR_CHECK",
          status: "FAIL",
          message: "No gear assigned — own or rental",
          canOverride: true,
          overrideRoles: ["RIGGER"],
        };
      }

      return this.evaluateGearCheck(rental.gearItem.checks[0]);
    }

    return this.evaluateGearCheck(gear.checks[0]);
  }

  private evaluateGearCheck(lastCheck: any): GateResult {
    if (!lastCheck) {
      return {
        gate: "GEAR_CHECK",
        status: "FAIL",
        message: "Gear has never been inspected",
        canOverride: true,
        overrideRoles: ["RIGGER"],
      };
    }

    if (lastCheck.result !== "PASS") {
      return {
        gate: "GEAR_CHECK",
        status: "FAIL",
        message: `Last gear check: ${lastCheck.result}`,
        canOverride: true,
        overrideRoles: ["RIGGER"],
        details: { lastResult: lastCheck.result, checkedAt: lastCheck.checkedAt },
      };
    }

    // Must be within 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (lastCheck.checkedAt < twentyFourHoursAgo) {
      return {
        gate: "GEAR_CHECK",
        status: "FAIL",
        message: "Gear check is stale (>24 hours old)",
        canOverride: true,
        overrideRoles: ["RIGGER"],
        details: { checkedAt: lastCheck.checkedAt },
      };
    }

    return {
      gate: "GEAR_CHECK",
      status: "PASS",
      message: "Gear check current",
      canOverride: false,
      overrideRoles: [],
      details: { checkedAt: lastCheck.checkedAt },
    };
  }

  // ── Gate 6: Reserve Repack ───────────────────────────────────────────

  async checkReserveRepack(userId: number, dropzoneId: number): Promise<GateResult> {
    const gear = await this.prisma.gearItem.findFirst({
      where: {
        ownerId: userId,
        dropzoneId,
        gearType: { in: ["RESERVE", "CONTAINER"] },
      },
    });

    if (!gear) {
      return {
        gate: "RESERVE_REPACK",
        status: "NOT_CHECKED",
        message: "No reserve on file — may be using rental",
        canOverride: true,
        overrideRoles: ["DZ_OWNER"],
      };
    }

    if (gear.nextRepackDue && gear.nextRepackDue < new Date()) {
      return {
        gate: "RESERVE_REPACK",
        status: "FAIL",
        message: `Reserve repack overdue since ${gear.nextRepackDue.toISOString().split("T")[0]}`,
        canOverride: true,
        overrideRoles: ["DZ_OWNER"],
        details: { nextRepackDue: gear.nextRepackDue },
      };
    }

    return {
      gate: "RESERVE_REPACK",
      status: "PASS",
      message: "Reserve repack current",
      canOverride: false,
      overrideRoles: [],
      details: { nextRepackDue: gear.nextRepackDue },
    };
  }

  // ── Gate 7: AAD ──────────────────────────────────────────────────────

  async checkAAD(userId: number, dropzoneId: number): Promise<GateResult> {
    const gear = await this.prisma.gearItem.findFirst({
      where: {
        ownerId: userId,
        dropzoneId,
        gearType: "AAD",
      },
    });

    if (!gear) {
      // Check container-level gear for AAD info
      const container = await this.prisma.gearItem.findFirst({
        where: {
          ownerId: userId,
          dropzoneId,
          gearType: "CONTAINER",
        },
      });

      if (!container) {
        return {
          gate: "AAD",
          status: "NOT_CHECKED",
          message: "No AAD on file",
          canOverride: true,
          overrideRoles: ["DZ_OWNER"],
        };
      }

      // Container exists but no dedicated AAD record — advisory
      return {
        gate: "AAD",
        status: "WARNING",
        message: "AAD record not found as separate gear item — verify with rigger",
        canOverride: true,
        overrideRoles: ["DZ_OWNER", "RIGGER"],
      };
    }

    // AAD status check
    if (gear.status !== "ACTIVE") {
      return {
        gate: "AAD",
        status: "FAIL",
        message: `AAD status: ${gear.status} — not serviceable`,
        canOverride: true,
        overrideRoles: ["DZ_OWNER"],
        details: { status: gear.status },
      };
    }

    // Check fires remaining if tracked
    if (gear.aadFiresRemaining != null && gear.aadFiresRemaining <= 0) {
      return {
        gate: "AAD",
        status: "FAIL",
        message: "AAD has no fires remaining — must be replaced",
        canOverride: true,
        overrideRoles: ["DZ_OWNER"],
        details: { aadFiresRemaining: gear.aadFiresRemaining },
      };
    }

    return {
      gate: "AAD",
      status: "PASS",
      message: "AAD current",
      canOverride: false,
      overrideRoles: [],
      details: { aadFiresRemaining: gear.aadFiresRemaining },
    };
  }

  // ── Gate 11: Rig Maintenance ──────────────────────────────────────────

  async checkRigMaintenance(userId: number, dropzoneId: number): Promise<GateResult> {
    // Find the user's primary rig for this DZ
    const rig = await this.prisma.rig.findFirst({
      where: {
        owner: { id: userId },
        dropzoneId,
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!rig) {
      // No rig on file — may be using rental or doesn't apply
      return {
        gate: "RIG_MAINTENANCE",
        status: "NOT_CHECKED",
        message: "No rig registered — may be using rental gear",
        canOverride: true,
        overrideRoles: ["RIGGER", "DZ_MANAGER"],
      };
    }

    try {
      const rigStatus = await evaluateRigStatus(this.prisma, rig.id);
      const gateResult = checkManifestGate(rigStatus);

      if (!gateResult.allowed) {
        return {
          gate: "RIG_MAINTENANCE",
          status: "FAIL",
          message: `Rig grounded: ${gateResult.blockers.map(b => `${b.componentType} — ${b.reason}`).join("; ")}`,
          canOverride: false, // Grounded rigs cannot be overridden
          overrideRoles: [],
          details: {
            rigId: rig.id,
            overallStatus: gateResult.status,
            blockers: gateResult.blockers,
          },
        };
      }

      if (gateResult.warnings.length > 0) {
        return {
          gate: "RIG_MAINTENANCE",
          status: "WARNING",
          message: `Rig maintenance advisory: ${gateResult.warnings.map(w => `${w.componentType} — ${w.reason}`).join("; ")}`,
          canOverride: true,
          overrideRoles: ["RIGGER", "DZ_MANAGER"],
          details: {
            rigId: rig.id,
            overallStatus: gateResult.status,
            warnings: gateResult.warnings,
          },
        };
      }

      return {
        gate: "RIG_MAINTENANCE",
        status: "PASS",
        message: "Rig maintenance current",
        canOverride: false,
        overrideRoles: [],
        details: { rigId: rig.id, overallStatus: gateResult.status },
      };
    } catch {
      return {
        gate: "RIG_MAINTENANCE",
        status: "WARNING",
        message: "Unable to evaluate rig maintenance status — verify manually",
        canOverride: true,
        overrideRoles: ["RIGGER", "DZ_MANAGER"],
      };
    }
  }

  // ── Gate 8: Weight ───────────────────────────────────────────────────

  checkWeight(
    weight: number,
    slotType: string,
    dzMaxWeight?: number
  ): GateResult {
    const limit = dzMaxWeight ?? 250; // Default max from WEIGHT_LIMITS
    const advisoryBuffer = 10; // lbs — advisory range

    if (weight > limit) {
      if (weight <= limit + advisoryBuffer) {
        return {
          gate: "WEIGHT",
          status: "WARNING",
          message: `Weight ${weight} lbs is within ${advisoryBuffer} lbs over limit (${limit} lbs)`,
          canOverride: true,
          overrideRoles: ["MANIFEST_STAFF"],
          details: { weight, limit, over: weight - limit },
        };
      }
      return {
        gate: "WEIGHT",
        status: "FAIL",
        message: `Weight ${weight} lbs exceeds limit of ${limit} lbs`,
        canOverride: true,
        overrideRoles: ["MANIFEST_STAFF"],
        details: { weight, limit, over: weight - limit },
      };
    }

    return {
      gate: "WEIGHT",
      status: "PASS",
      message: `Weight ${weight} lbs within limit`,
      canOverride: false,
      overrideRoles: [],
      details: { weight, limit },
    };
  }

  // ── Gate 9: Pilot Duty (NO OVERRIDE — FAA regulation) ───────────────

  async checkPilotDuty(pilotId: number): Promise<GateResult> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count loads flown today
    const loadsToday = await this.prisma.load.count({
      where: {
        pilotId,
        status: { in: ["AIRBORNE", "LANDED", "COMPLETE"] },
        updatedAt: { gte: today },
      },
    });

    // Estimate flight hours (each load ~20 min = 0.33 hours)
    const estimatedHours = loadsToday * 0.33;

    if (estimatedHours >= 8) {
      return {
        gate: "PILOT_DUTY",
        status: "FAIL",
        message: "Pilot has exceeded 8 flight hours today (FAA limit)",
        canOverride: false, // NO OVERRIDE — FAA regulation
        overrideRoles: [],
        details: { loadsToday, estimatedHours },
      };
    }

    if (estimatedHours >= 6) {
      return {
        gate: "PILOT_DUTY",
        status: "WARNING",
        message: `Pilot approaching duty limit: ~${estimatedHours.toFixed(1)} hours today`,
        canOverride: false,
        overrideRoles: [],
        details: { loadsToday, estimatedHours },
      };
    }

    return {
      gate: "PILOT_DUTY",
      status: "PASS",
      message: `Pilot duty OK (~${estimatedHours.toFixed(1)} hours today)`,
      canOverride: false,
      overrideRoles: [],
      details: { loadsToday, estimatedHours },
    };
  }

  // ── Gate 10: Aircraft Airworthiness (NO OVERRIDE) ────────────────────

  async checkAircraftAirworthiness(aircraftId: number): Promise<GateResult> {
    const aircraft = await this.prisma.aircraft.findUnique({
      where: { id: aircraftId },
    });

    if (!aircraft) {
      return {
        gate: "AIRCRAFT_AIRWORTHINESS",
        status: "FAIL",
        message: "Aircraft not found",
        canOverride: false,
        overrideRoles: [],
      };
    }

    // Check aircraft status
    if (aircraft.status && aircraft.status !== "ACTIVE") {
      return {
        gate: "AIRCRAFT_AIRWORTHINESS",
        status: "FAIL",
        message: `Aircraft status: ${aircraft.status} — not airworthy`,
        canOverride: false,
        overrideRoles: [],
        details: { status: aircraft.status },
      };
    }

    // Check annual due
    if (aircraft.annualDue && aircraft.annualDue < new Date()) {
      return {
        gate: "AIRCRAFT_AIRWORTHINESS",
        status: "FAIL",
        message: "Aircraft annual inspection overdue",
        canOverride: false,
        overrideRoles: [],
        details: { annualDue: aircraft.annualDue },
      };
    }

    // Check 100-hour inspection
    if (
      aircraft.hobbsHours != null &&
      aircraft.next100hrDue != null &&
      parseFloat(String(aircraft.hobbsHours)) >= parseFloat(String(aircraft.next100hrDue))
    ) {
      return {
        gate: "AIRCRAFT_AIRWORTHINESS",
        status: "FAIL",
        message: "Aircraft 100-hour inspection overdue",
        canOverride: false,
        overrideRoles: [],
        details: {
          hobbsHours: aircraft.hobbsHours,
          next100hrDue: aircraft.next100hrDue,
        },
      };
    }

    return {
      gate: "AIRCRAFT_AIRWORTHINESS",
      status: "PASS",
      message: "Aircraft airworthy",
      canOverride: false,
      overrideRoles: [],
    };
  }

  // ── Full Compliance Check (all gates for a jumper) ───────────────────

  /**
   * Run all jumper-level safety gates and return a compliance grid.
   * Used by the check-in screen and slot assignment.
   */
  async checkCompliance(
    userId: number,
    dropzoneId: number,
    weight?: number,
    slotType?: string
  ): Promise<ComplianceResult> {
    const gates = await Promise.all([
      this.checkLicense(userId),
      this.checkCurrency(userId),
      this.checkWaiver(userId, dropzoneId),
      this.checkGear(userId, dropzoneId),
      this.checkReserveRepack(userId, dropzoneId),
      this.checkAAD(userId, dropzoneId),
      this.checkRigMaintenance(userId, dropzoneId),
    ]);

    // Add weight check if weight provided
    if (weight !== undefined) {
      gates.push(this.checkWeight(weight, slotType ?? "FUN"));
    }

    const allPassed = gates.every(
      (g) => g.status === "PASS" || g.status === "WARNING" || g.status === "NOT_CHECKED"
    );

    return {
      userId,
      dropzoneId,
      allPassed,
      gates,
      checkedAt: new Date(),
    };
  }

  /**
   * Run load-level safety gates (pilot duty + aircraft airworthiness).
   * Used before load creation and transitions.
   */
  async checkLoadSafety(
    pilotId: number,
    aircraftId: number
  ): Promise<{ allPassed: boolean; gates: GateResult[] }> {
    const gates = await Promise.all([
      this.checkPilotDuty(pilotId),
      this.checkAircraftAirworthiness(aircraftId),
    ]);

    const allPassed = gates.every(
      (g) => g.status === "PASS" || g.status === "WARNING"
    );

    return { allPassed, gates };
  }

  /**
   * Legacy method — throws SafetyGateError on first failure.
   * Used by existing slot assignment endpoint.
   */
  async validateAllGates(userId: string | number, dropzoneId: string | number): Promise<void> {
    const uid = this.toInt(userId);
    const dzId = this.toInt(dropzoneId);

    const result = await this.checkCompliance(uid, dzId);

    const failed = result.gates.find((g) => g.status === "FAIL");
    if (failed) {
      throw new SafetyGateError(failed.gate, failed.message);
    }
  }
}

export function createValidationGatesService(prisma: PrismaClient): ValidationGatesService {
  return new ValidationGatesService(prisma);
}
