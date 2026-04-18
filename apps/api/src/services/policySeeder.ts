import { PrismaClient } from "@prisma/client";

// ============================================================================
// POLICY DEFINITION SEEDER
// ============================================================================
// Seeds the policy catalog with all known configurable rules.
// Values here become PLATFORM defaults. DZ operators override from dashboard.
// ============================================================================

interface PolicyDef {
  category: string;
  key: string;
  label: string;
  description: string;
  dataType: string;
  defaultValue: any;
}

const DEFINITIONS: PolicyDef[] = [
  // ── MANIFEST ────────────────────────────────────────────
  { category: "MANIFEST", key: "manifest.selfManifestEnabled", label: "Self-Manifest Enabled", description: "Allow athletes to self-manifest onto loads", dataType: "boolean", defaultValue: true },
  { category: "MANIFEST", key: "manifest.selfManifestDisciplines", label: "Self-Manifest Disciplines", description: "Disciplines allowed for self-manifest", dataType: "json", defaultValue: ["FUN_JUMP", "HOP_POP", "WINGSUIT", "CRW"] },
  { category: "MANIFEST", key: "manifest.waitlistClaimWindowMinutes", label: "Waitlist Claim Window", description: "Minutes to claim a waitlist spot before it expires", dataType: "number", defaultValue: 5 },
  { category: "MANIFEST", key: "manifest.loadLockTimingMinutes", label: "Load Lock Timing", description: "Minutes before departure to auto-lock load", dataType: "number", defaultValue: 30 },
  { category: "MANIFEST", key: "manifest.maxLoadsPerDay", label: "Max Loads Per Day", description: "Maximum loads that can be scheduled per day", dataType: "number", defaultValue: 12 },
  { category: "MANIFEST", key: "manifest.noShowPolicy", label: "No-Show Policy", description: "What happens on no-show: REFUND, FORFEIT, or CREDIT", dataType: "string", defaultValue: "CREDIT" },

  // ── COMPLIANCE ──────────────────────────────────────────
  { category: "COMPLIANCE", key: "compliance.waiverFreshnessDays", label: "Waiver Freshness Period", description: "Days before a signed waiver expires", dataType: "number", defaultValue: 365 },
  { category: "COMPLIANCE", key: "compliance.currencyWindow.STUDENT", label: "Student Currency Window", description: "Days of jump recency for students", dataType: "number", defaultValue: 30 },
  { category: "COMPLIANCE", key: "compliance.currencyWindow.A", label: "A License Currency Window", description: "Days of jump recency for A license", dataType: "number", defaultValue: 60 },
  { category: "COMPLIANCE", key: "compliance.currencyWindow.B", label: "B License Currency Window", description: "Days of jump recency for B license", dataType: "number", defaultValue: 60 },
  { category: "COMPLIANCE", key: "compliance.currencyWindow.C", label: "C License Currency Window", description: "Days of jump recency for C license", dataType: "number", defaultValue: 90 },
  { category: "COMPLIANCE", key: "compliance.currencyWindow.D", label: "D License Currency Window", description: "Days of jump recency for D license", dataType: "number", defaultValue: 180 },
  { category: "COMPLIANCE", key: "compliance.selfDeclaredAccepted", label: "Self-Declared Data Accepted", description: "Whether self-declared statuses pass compliance gates", dataType: "boolean", defaultValue: true },
  { category: "COMPLIANCE", key: "compliance.verificationReviewDays", label: "Verification Review Interval", description: "Days between required verification reviews", dataType: "number", defaultValue: 180 },

  // ── PROGRESSION ─────────────────────────────────────────
  { category: "PROGRESSION", key: "progression.terminology", label: "Progression Terminology", description: "Custom labels for progression stages", dataType: "json", defaultValue: { levelAdvance: "Advance to next level", repetition: "Repetition", coachingJump: "Coaching jump", evaluationJump: "Evaluation jump" } },
  { category: "PROGRESSION", key: "progression.verificationRequired", label: "Progression Verification Required", description: "Who must verify level advancement", dataType: "string", defaultValue: "INSTRUCTOR_VERIFIED" },

  // ── AIRCRAFT ────────────────────────────────────────────
  { category: "AIRCRAFT", key: "aircraft.pilotConfirmRequired", label: "Pilot Confirmation Required", description: "Require explicit pilot confirmation before departure", dataType: "boolean", defaultValue: true },
  { category: "AIRCRAFT", key: "aircraft.planningLabelText", label: "Planning Label Text", description: "Warning text on CG/weight estimates", dataType: "string", defaultValue: "Operational estimate only. Final suitability depends on aircraft-specific charts, conditions, and pilot review." },

  // ── WIND ────────────────────────────────────────────────
  { category: "WIND", key: "wind.maxKnots.tandem", label: "Tandem Wind Limit", description: "Max wind speed (knots) for tandem operations", dataType: "number", defaultValue: 14 },
  { category: "WIND", key: "wind.maxKnots.student", label: "Student Wind Limit", description: "Max wind speed (knots) for student jumps", dataType: "number", defaultValue: 14 },
  { category: "WIND", key: "wind.maxKnots.licensed", label: "Licensed Wind Limit", description: "Max wind speed (knots) for licensed jumpers", dataType: "number", defaultValue: 25 },
  { category: "WIND", key: "wind.maxKnots.wingsuit", label: "Wingsuit Wind Limit", description: "Max wind speed (knots) for wingsuit jumps", dataType: "number", defaultValue: 18 },

  // ── WEIGHT ──────────────────────────────────────────────
  { category: "WEIGHT", key: "weight.tandemPassengerMax", label: "Tandem Passenger Max Weight", description: "Maximum passenger weight for tandem (lbs)", dataType: "number", defaultValue: 250 },
  { category: "WEIGHT", key: "weight.tandemPassengerMin", label: "Tandem Passenger Min Weight", description: "Minimum passenger weight for tandem (lbs)", dataType: "number", defaultValue: 90 },

  // ── GEAR ────────────────────────────────────────────────
  { category: "GEAR", key: "gear.reserveRepackDays", label: "Reserve Repack Interval", description: "Days between required reserve repacks", dataType: "number", defaultValue: 180 },
  { category: "GEAR", key: "gear.aadServiceDays", label: "AAD Service Interval", description: "Days between AAD services", dataType: "number", defaultValue: 365 },
  { category: "GEAR", key: "gear.checkStalenessHours", label: "Gear Check Staleness", description: "Hours before a gear check expires", dataType: "number", defaultValue: 24 },
  { category: "GEAR", key: "gear.groundedHardStop", label: "Grounded = Hard Block", description: "Whether GROUNDED gear status blocks manifesting", dataType: "boolean", defaultValue: true },

  // ── NOTIFICATION ────────────────────────────────────────
  { category: "NOTIFICATION", key: "notification.loadCallTiming", label: "Load Call Timing", description: "Minutes before departure to send 30/20/10 min calls", dataType: "json", defaultValue: { thirtyMin: 30, twentyMin: 20, tenMin: 10 } },
  { category: "NOTIFICATION", key: "notification.privateMessagingEnabled", label: "Private Ops Messaging", description: "Enable staff→athlete private operational messages", dataType: "boolean", defaultValue: true },

  // ── BOOKING ─────────────────────────────────────────────
  { category: "BOOKING", key: "booking.minAgeTandem", label: "Minimum Age for Tandem", description: "Minimum age in years for tandem jumps", dataType: "number", defaultValue: 18 },
  { category: "BOOKING", key: "booking.rescheduleWindowHours", label: "Reschedule Window", description: "Hours before booking when rescheduling is allowed", dataType: "number", defaultValue: 24 },
  { category: "BOOKING", key: "booking.depositRequired", label: "Deposit Required", description: "Whether deposit is required at booking", dataType: "boolean", defaultValue: false },

  // ── PRICING ─────────────────────────────────────────────
  { category: "PRICING", key: "pricing.funJumpCents", label: "Fun Jump Price", description: "Default price for fun jumps (cents)", dataType: "number", defaultValue: 17500 },
  { category: "PRICING", key: "pricing.tandemCents", label: "Tandem Price", description: "Default price for tandem (cents)", dataType: "number", defaultValue: 29900 },
  { category: "PRICING", key: "pricing.affCents", label: "AFF Price", description: "Default price for AFF jump (cents)", dataType: "number", defaultValue: 15000 },
];

export async function seedPolicyDefinitions(prisma: PrismaClient): Promise<number> {
  let count = 0;
  for (const def of DEFINITIONS) {
    await (prisma as any).policyDefinition.upsert({
      where: { category_key: { category: def.category, key: def.key } },
      create: {
        category: def.category,
        key: def.key,
        label: def.label,
        description: def.description,
        dataType: def.dataType,
        defaultValue: def.defaultValue,
      },
      update: {
        label: def.label,
        description: def.description,
        dataType: def.dataType,
        defaultValue: def.defaultValue,
      },
    }).catch(() => {
      // PolicyDefinition model not yet migrated — skip silently
    });
    count++;
  }
  return count;
}

export { DEFINITIONS as POLICY_DEFINITIONS };
