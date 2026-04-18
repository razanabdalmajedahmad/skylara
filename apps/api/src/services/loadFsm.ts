import { PrismaClient } from "@prisma/client";
import { ConflictLoadError, SafetyGateError } from "../utils/errors";
import {
  LOAD_FSM_TRANSITIONS,
  LOAD_TIMER_DURATIONS,
} from "@repo/config";

// ============================================================================
// CANONICAL 11-STATE LOAD FSM
// ============================================================================
// OPEN → FILLING → LOCKED → [CG GATE] → THIRTY_MIN → TWENTY_MIN → TEN_MIN
//   → BOARDING → AIRBORNE → LANDED → COMPLETE
// Any pre-terminal state → CANCELLED (terminal)
// COMPLETE, CANCELLED are terminal (no transitions out)
// ============================================================================

export enum LoadStatus {
  OPEN = "OPEN",
  FILLING = "FILLING",
  LOCKED = "LOCKED",
  THIRTY_MIN = "THIRTY_MIN",
  TWENTY_MIN = "TWENTY_MIN",
  TEN_MIN = "TEN_MIN",
  BOARDING = "BOARDING",
  AIRBORNE = "AIRBORNE",
  LANDED = "LANDED",
  COMPLETE = "COMPLETE",
  CANCELLED = "CANCELLED",
}

/** Timer-driven states that auto-advance after a duration. */
export const TIMER_STATES: Record<string, { next: LoadStatus; durationMs: number }> = {
  [LoadStatus.THIRTY_MIN]: {
    next: LoadStatus.TWENTY_MIN,
    durationMs: LOAD_TIMER_DURATIONS.THIRTY_MIN_TO_TWENTY_MIN,
  },
  [LoadStatus.TWENTY_MIN]: {
    next: LoadStatus.TEN_MIN,
    durationMs: LOAD_TIMER_DURATIONS.TWENTY_MIN_TO_TEN_MIN,
  },
  [LoadStatus.TEN_MIN]: {
    next: LoadStatus.BOARDING,
    durationMs: LOAD_TIMER_DURATIONS.TEN_MIN_TO_BOARDING,
  },
};

/** States that require a blocking gate before entry. */
export interface BlockingGate {
  gateName: string;
  description: string;
  overrideRoles: string[]; // roles that can override (empty = no override possible)
}

export const TRANSITION_GATES: Record<string, BlockingGate> = {
  // LOCKED → THIRTY_MIN requires CG PASS
  [`${LoadStatus.LOCKED}->${LoadStatus.THIRTY_MIN}`]: {
    gateName: "CG_PASS",
    description: "CG check must PASS before load can advance past LOCKED",
    overrideRoles: ["DZ_OWNER"], // Only DZ_OWNER can override, with mandatory reason
  },
};

/**
 * Result of a transition attempt — includes gate information if blocked.
 */
export interface TransitionResult {
  allowed: boolean;
  fromStatus: LoadStatus;
  toStatus: LoadStatus;
  blockedByGate?: string;
  gateDescription?: string;
  canOverride?: boolean;
  overrideRoles?: string[];
}

/**
 * Validate whether a load status transition is allowed by the FSM.
 * Does NOT check blocking gates — use `checkTransitionGates` for that.
 */
export function validateLoadTransition(
  currentStatus: LoadStatus | string,
  nextStatus: LoadStatus | string
): void {
  const current = currentStatus as keyof typeof LOAD_FSM_TRANSITIONS;
  const next = nextStatus as string;

  const allowed = LOAD_FSM_TRANSITIONS[current];
  if (!allowed) {
    throw new ConflictLoadError(
      `Unknown load status: ${currentStatus}`
    );
  }

  if (!(allowed as readonly string[]).includes(next)) {
    throw new ConflictLoadError(
      `Cannot transition from ${currentStatus} to ${nextStatus}. Allowed: [${allowed.join(", ")}]`
    );
  }
}

/**
 * Get all valid next statuses for a given load status.
 */
export function getAvailableTransitions(status: LoadStatus | string): string[] {
  const key = status as keyof typeof LOAD_FSM_TRANSITIONS;
  return [...(LOAD_FSM_TRANSITIONS[key] || [])];
}

/**
 * Check whether a transition is blocked by a safety gate.
 * Returns gate info if blocked, null if clear.
 */
export function getTransitionGate(
  fromStatus: LoadStatus | string,
  toStatus: LoadStatus | string
): BlockingGate | null {
  const key = `${fromStatus}->${toStatus}`;
  return TRANSITION_GATES[key] || null;
}

/**
 * Full transition check: FSM validity + blocking gate.
 * Returns a TransitionResult describing whether the transition can proceed.
 */
export async function checkTransitionWithGates(
  prisma: PrismaClient,
  loadId: number,
  fromStatus: LoadStatus | string,
  toStatus: LoadStatus | string
): Promise<TransitionResult> {
  // Step 1: Validate FSM allows this transition
  try {
    validateLoadTransition(fromStatus, toStatus);
  } catch {
    return {
      allowed: false,
      fromStatus: fromStatus as LoadStatus,
      toStatus: toStatus as LoadStatus,
    };
  }

  // Step 2: Check blocking gates
  const gate = getTransitionGate(fromStatus, toStatus);
  if (!gate) {
    return {
      allowed: true,
      fromStatus: fromStatus as LoadStatus,
      toStatus: toStatus as LoadStatus,
    };
  }

  // Gate exists — check if it passes
  if (gate.gateName === "CG_PASS") {
    const latestCg = await prisma.cgCheck.findFirst({
      where: { loadId },
      orderBy: { createdAt: "desc" },
    });

    if (!latestCg || latestCg.result !== "PASS") {
      return {
        allowed: false,
        fromStatus: fromStatus as LoadStatus,
        toStatus: toStatus as LoadStatus,
        blockedByGate: gate.gateName,
        gateDescription: gate.description,
        canOverride: gate.overrideRoles.length > 0,
        overrideRoles: gate.overrideRoles,
      };
    }
  }

  return {
    allowed: true,
    fromStatus: fromStatus as LoadStatus,
    toStatus: toStatus as LoadStatus,
  };
}

/**
 * Check if a status is a timer-driven countdown state.
 */
export function isTimerState(status: LoadStatus | string): boolean {
  return status in TIMER_STATES;
}

/**
 * Get timer config for a countdown state. Returns null if not a timer state.
 */
export function getTimerConfig(status: LoadStatus | string): { next: LoadStatus; durationMs: number } | null {
  return TIMER_STATES[status] || null;
}

/**
 * Check if a status is terminal (no transitions out).
 */
export function isTerminal(status: LoadStatus | string): boolean {
  const transitions = getAvailableTransitions(status);
  return transitions.length === 0;
}
