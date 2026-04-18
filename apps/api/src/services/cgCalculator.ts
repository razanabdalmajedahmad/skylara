import { PrismaClient } from "@prisma/client";
import { CG_LIMITS } from "@repo/config";

// ============================================================================
// CG (CENTER OF GRAVITY) CALCULATOR
// ============================================================================
// Computes weight & balance for a load using aircraft envelope data.
// Creates append-only CgCheck records (never updates — audit trail).
// Result: PASS | FAIL | MARGINAL
// MARGINAL = within 0.5% of a limit boundary — crew advisory, not blocking.
// ============================================================================

export interface AircraftCgEnvelope {
  emptyWeight: number;       // lbs
  maxGrossWeight: number;    // lbs (MTOW)
  cgForwardLimit: number;    // % MAC
  cgAftLimit: number;        // % MAC
  fuelArmDistance: number;    // inches from datum
  seatPositions: Array<{
    position: number;        // 1-indexed seat
    armDistance: number;      // inches from CG datum
  }>;
  emptyWeightArm: number;    // arm distance at empty weight (inches)
  macLeadingEdge?: number;   // LEMAC — inches from datum
  macLength?: number;        // MAC length in inches
}

export interface CgInput {
  fuelWeight: number;        // lbs
  pilotWeight: number;       // lbs
  pilotArmDistance: number;   // inches
  passengers: Array<{
    position: number;
    weight: number;
  }>;
}

export type CgResultType = "PASS" | "FAIL" | "MARGINAL";

export interface CgCalculationResult {
  totalWeight: number;
  totalMoment: number;
  calculatedCg: number;       // % MAC
  forwardLimit: number;       // % MAC
  aftLimit: number;           // % MAC
  result: CgResultType;
  isOverweight: boolean;
  weightMargin: number;       // lbs remaining before MTOW
  cgMarginForward: number;    // distance from forward limit (positive = safe)
  cgMarginAft: number;        // distance from aft limit (positive = safe)
}

const MARGINAL_THRESHOLD = 0.005; // 0.5% MAC — warning zone

/**
 * Calculate CG position and determine result.
 */
export function calculateCG(
  aircraft: AircraftCgEnvelope,
  input: CgInput
): CgCalculationResult {
  // Empty aircraft moment
  let totalMoment = aircraft.emptyWeight * aircraft.emptyWeightArm;
  let totalWeight = aircraft.emptyWeight;

  // Add fuel
  totalWeight += input.fuelWeight;
  totalMoment += input.fuelWeight * aircraft.fuelArmDistance;

  // Add pilot
  totalWeight += input.pilotWeight;
  totalMoment += input.pilotWeight * input.pilotArmDistance;

  // Add passengers at their seat positions
  const positionArms = new Map(
    aircraft.seatPositions.map((sp) => [sp.position, sp.armDistance])
  );

  for (const pax of input.passengers) {
    const armDistance = positionArms.get(pax.position);
    if (armDistance === undefined) {
      throw new Error(`Invalid seat position: ${pax.position}. Available: [${Array.from(positionArms.keys()).join(", ")}]`);
    }
    totalWeight += pax.weight;
    totalMoment += pax.weight * armDistance;
  }

  // CG position in inches from datum
  const cgPositionInches = totalMoment / totalWeight;

  // Convert CG position (inches) → % MAC using MAC geometry
  // %MAC = (CG_inches - LEMAC) / MAC_length
  let calculatedCgPct: number;
  if (aircraft.macLength && aircraft.macLength > 0 && aircraft.macLeadingEdge !== undefined) {
    calculatedCgPct = (cgPositionInches - aircraft.macLeadingEdge) / aircraft.macLength;
  } else {
    // Fallback when MAC geometry is not provided — approximate using arm ratio
    const referenceArm = aircraft.emptyWeightArm;
    calculatedCgPct = referenceArm > 0 ? cgPositionInches / referenceArm : 0;
  }

  const forwardLimit = aircraft.cgForwardLimit;
  const aftLimit = aircraft.cgAftLimit;

  const isOverweight = totalWeight > aircraft.maxGrossWeight;
  const weightMargin = aircraft.maxGrossWeight - totalWeight;

  const cgMarginForward = calculatedCgPct - forwardLimit;
  const cgMarginAft = aftLimit - calculatedCgPct;

  // Determine result
  let result: CgResultType;
  if (isOverweight) {
    result = "FAIL";
  } else if (calculatedCgPct < forwardLimit || calculatedCgPct > aftLimit) {
    result = "FAIL";
  } else if (cgMarginForward < MARGINAL_THRESHOLD || cgMarginAft < MARGINAL_THRESHOLD) {
    result = "MARGINAL";
  } else {
    result = "PASS";
  }

  return {
    totalWeight,
    totalMoment,
    calculatedCg: calculatedCgPct,
    forwardLimit,
    aftLimit,
    result,
    isOverweight,
    weightMargin,
    cgMarginForward,
    cgMarginAft,
  };
}

/**
 * Build a CgInput from a load's slots and aircraft data.
 */
export async function buildCgInputFromLoad(
  prisma: PrismaClient,
  loadId: number
): Promise<{ aircraft: AircraftCgEnvelope; input: CgInput }> {
  const load = await prisma.load.findUniqueOrThrow({
    where: { id: loadId },
    include: {
      aircraft: true,
      slots: {
        where: { status: "MANIFESTED" },
        orderBy: { position: "asc" },
      },
    },
  });

  const ac = load.aircraft;

  // Build aircraft envelope from DB fields — uses actual aircraft data, falls back to safe defaults
  const aircraft: AircraftCgEnvelope = {
    emptyWeight: ac.emptyWeight ?? 3600,
    maxGrossWeight: ac.maxWeight ?? 8000,
    cgForwardLimit: ac.cgForwardLimit ? parseFloat(String(ac.cgForwardLimit)) : CG_LIMITS.FORWARD_MIN,
    cgAftLimit: ac.cgAftLimit ? parseFloat(String(ac.cgAftLimit)) : CG_LIMITS.AFT_MAX,
    fuelArmDistance: ac.fuelArmDistance ? parseFloat(String(ac.fuelArmDistance)) : 60,
    emptyWeightArm: ac.emptyWeightArm ? parseFloat(String(ac.emptyWeightArm)) : 55,
    macLeadingEdge: (ac as any).macLeadingEdge ? parseFloat(String((ac as any).macLeadingEdge)) : undefined,
    macLength: (ac as any).macLength ? parseFloat(String((ac as any).macLength)) : undefined,
    seatPositions: parseSeatPositions(ac.seatPositions, ac.maxCapacity ?? 20),
  };

  // Pilot is position 1
  const pilotSlot = load.slots.find((s) => s.position === 1);

  const input: CgInput = {
    fuelWeight: load.fuelWeight ?? 200,
    pilotWeight: pilotSlot?.weight ?? 200,
    pilotArmDistance: aircraft.seatPositions[0]?.armDistance ?? 50,
    passengers: load.slots
      .filter((s) => s.position !== 1) // Exclude pilot seat
      .map((s) => ({
        position: s.position,
        weight: s.weight,
      })),
  };

  return { aircraft, input };
}

/**
 * Perform a CG check and persist the append-only record.
 */
export async function performCgCheck(
  prisma: PrismaClient,
  loadId: number,
  performedBy: number,
  overrideFuel?: number
): Promise<CgCalculationResult & { checkId: number }> {
  const { aircraft, input } = await buildCgInputFromLoad(prisma, loadId);
  if (overrideFuel !== undefined) {
    input.fuelWeight = overrideFuel;
  }

  // Get aircraftId for the CgCheck record
  const loadRecord = await prisma.load.findUniqueOrThrow({
    where: { id: loadId },
    select: { aircraftId: true },
  });

  const result = calculateCG(aircraft, input);

  // Append-only — never update CgCheck records
  const check = await prisma.cgCheck.create({
    data: {
      loadId,
      aircraftId: loadRecord.aircraftId,
      performedById: performedBy,
      totalWeight: result.totalWeight,
      fuelWeight: input.fuelWeight,
      pilotWeight: input.pilotWeight,
      passengerWeight: result.totalWeight - aircraft.emptyWeight - input.fuelWeight - input.pilotWeight,
      calculatedCg: result.calculatedCg,
      forwardLimit: result.forwardLimit,
      aftLimit: result.aftLimit,
      result: result.result as any, // CgResult enum: PASS | FAIL | MARGINAL
    },
  });

  return { ...result, checkId: check.id };
}

/**
 * Parse seat positions from aircraft JSON field, falling back to generated positions.
 * Aircraft model stores seatPositions as JSON array: [{ position: number, armDistance: number }]
 */
function parseSeatPositions(
  dbValue: any,
  maxCapacity: number
): Array<{ position: number; armDistance: number }> {
  if (dbValue && Array.isArray(dbValue) && dbValue.length > 0) {
    return dbValue.map((sp: any) => ({
      position: Number(sp.position),
      armDistance: Number(sp.armDistance),
    }));
  }
  return generateSeatPositions(maxCapacity);
}

/**
 * Generate evenly-spaced seat positions for an aircraft.
 * Used as fallback when aircraft has no seatPositions JSON configured.
 */
function generateSeatPositions(maxCapacity: number): Array<{ position: number; armDistance: number }> {
  const positions: Array<{ position: number; armDistance: number }> = [];
  const startArm = 50; // pilot seat
  const spacing = 8;   // inches between rows

  for (let i = 1; i <= maxCapacity; i++) {
    positions.push({
      position: i,
      armDistance: startArm + Math.floor((i - 1) / 2) * spacing,
    });
  }

  return positions;
}

// Re-export for backward compatibility with old import paths
export const EXAMPLE_AIRCRAFT: Record<string, AircraftCgEnvelope> = {
  CESSNA_208: {
    emptyWeight: 3600,
    maxGrossWeight: 5500,
    cgForwardLimit: CG_LIMITS.FORWARD_MIN,
    cgAftLimit: CG_LIMITS.AFT_MAX,
    fuelArmDistance: 60,
    emptyWeightArm: 55,
    macLeadingEdge: 38,   // LEMAC — inches from datum
    macLength: 66,         // MAC length in inches
    seatPositions: [
      { position: 1, armDistance: 50 },
      { position: 2, armDistance: 52 },
      { position: 3, armDistance: 65 },
      { position: 4, armDistance: 67 },
    ],
  },
  KING_AIR: {
    emptyWeight: 7200,
    maxGrossWeight: 14000,
    cgForwardLimit: CG_LIMITS.FORWARD_MIN,
    cgAftLimit: CG_LIMITS.AFT_MAX,
    fuelArmDistance: 65,
    emptyWeightArm: 60,
    macLeadingEdge: 42,   // LEMAC — inches from datum
    macLength: 80,         // MAC length in inches
    seatPositions: [
      { position: 1, armDistance: 58 },
      { position: 2, armDistance: 60 },
      { position: 3, armDistance: 75 },
      { position: 4, armDistance: 77 },
      { position: 5, armDistance: 90 },
      { position: 6, armDistance: 92 },
    ],
  },
};
