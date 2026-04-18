import { PrismaClient } from "@prisma/client";

// ============================================================================
// EXIT ORDER ALGORITHM — 9 EXIT GROUPS
// ============================================================================
// Wingsuits exit first (highest altitude, slowest horizontal speed).
// Hop-n-pop / CRW exit last (lowest deployment altitude).
//
// Group 1: Wingsuits
// Group 2: Tracking dives
// Group 3: AFF Students (require instructor supervision)
// Group 4: AFF Advanced (self-sufficient students)
// Group 5: Tandems
// Group 6: Belly / RW (relative work)
// Group 7: Coaches
// Group 8: Freefly
// Group 9: CRW / Hop-n-Pop
//
// Within each group, slots are ordered by aircraft seat position (front-to-back).
// Triggered automatically when load transitions to LOCKED.
// ============================================================================

export interface ExitGroupSlot {
  slotId: number;
  userId: number | null;
  userName: string;
  exitGroup: number;
  exitOrder: number;
  position: number;
  slotType: string;
  jumpType: string | null;
  weight: number;
}

export interface ExitOrderResult {
  loadId: number;
  groups: Array<{
    group: number;
    label: string;
    slots: ExitGroupSlot[];
  }>;
  totalSlots: number;
}

const EXIT_GROUP_LABELS: Record<number, string> = {
  1: "Wingsuits",
  2: "Tracking",
  3: "AFF Students",
  4: "AFF Advanced",
  5: "Tandems",
  6: "Belly / RW",
  7: "Coaches",
  8: "Freefly",
  9: "CRW / Hop-n-Pop",
};

/**
 * Classify a slot into one of the 9 exit groups based on slotType and jumpType.
 */
function classifyExitGroup(slotType: string, jumpType: string | null): number {
  // SlotType-based classification
  switch (slotType) {
    case "WINGSUIT":
      return 1;

    case "AFF_STUDENT":
      // jumpType can distinguish level
      if (jumpType === "AFF_ADVANCED" || jumpType === "AFF_LEVEL_7") {
        return 4; // AFF Advanced
      }
      return 3; // AFF Student (default)

    case "AFF_INSTRUCTOR":
      // Instructor exits with their student
      if (jumpType === "AFF_ADVANCED" || jumpType === "AFF_LEVEL_7") {
        return 4;
      }
      return 3;

    case "TANDEM_PASSENGER":
    case "TANDEM_INSTRUCTOR":
      return 5;

    case "COACH":
      return 7;

    case "CRW":
    case "HOP_N_POP":
      return 9;

    case "FUN":
    case "CAMERA":
    default:
      break;
  }

  // JumpType-based refinement for FUN/generic slots
  switch (jumpType) {
    case "WINGSUIT":
      return 1;
    case "TRACKING":
      return 2;
    case "BELLY":
    case "RW":
      return 6;
    case "FREEFLY":
      return 8;
    case "CRW":
    case "HOP_N_POP":
      return 9;
    case "COACH":
      return 7;
    default:
      return 6; // Default to belly/RW group
  }
}

/**
 * Compute exit order for all manifested slots on a load.
 * Assigns exitGroup (1-9) and exitOrder (sequential within group).
 */
export async function computeExitOrder(
  prisma: PrismaClient,
  loadId: number
): Promise<ExitOrderResult> {
  const slots = await prisma.slot.findMany({
    where: {
      loadId,
      status: "MANIFESTED",
    },
    include: {
      user: {
        select: { firstName: true, lastName: true },
      },
    },
    orderBy: { position: "asc" },
  });

  // Classify each slot
  const classified = slots.map((slot) => ({
    slotId: slot.id,
    userId: slot.userId,
    userName: slot.user
      ? `${slot.user.firstName} ${slot.user.lastName}`
      : "Unassigned",
    exitGroup: classifyExitGroup(slot.slotType, slot.jumpType),
    exitOrder: 0, // Will be assigned below
    position: slot.position,
    slotType: slot.slotType,
    jumpType: slot.jumpType,
    weight: slot.weight,
  }));

  // Sort by exit group (ascending), then position within group
  classified.sort((a, b) => {
    if (a.exitGroup !== b.exitGroup) return a.exitGroup - b.exitGroup;
    return a.position - b.position;
  });

  // Assign sequential exit order
  let order = 1;
  for (const slot of classified) {
    slot.exitOrder = order++;
  }

  // Group for response
  const groupMap = new Map<number, ExitGroupSlot[]>();
  for (const slot of classified) {
    if (!groupMap.has(slot.exitGroup)) {
      groupMap.set(slot.exitGroup, []);
    }
    groupMap.get(slot.exitGroup)!.push(slot);
  }

  const groups = Array.from(groupMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([group, groupSlots]) => ({
      group,
      label: EXIT_GROUP_LABELS[group] || `Group ${group}`,
      slots: groupSlots,
    }));

  return {
    loadId,
    groups,
    totalSlots: classified.length,
  };
}

/**
 * Compute and persist exit order to the database.
 * Called when load transitions to LOCKED.
 */
export async function assignExitOrder(
  prisma: PrismaClient,
  loadId: number
): Promise<ExitOrderResult> {
  const result = await computeExitOrder(prisma, loadId);

  // Batch update all slots with their exit group and order
  const updates = result.groups.flatMap((g) =>
    g.slots.map((slot) =>
      prisma.slot.update({
        where: { id: slot.slotId },
        data: {
          exitGroup: slot.exitGroup,
          // exitOrder is not in schema yet — we use position for now
          // and return the computed order in the API response
        },
      })
    )
  );

  await prisma.$transaction(updates);

  return result;
}
