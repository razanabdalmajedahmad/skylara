import { FastifyRequest, FastifyReply } from "fastify";
import { ForbiddenError } from "../utils/errors";

// ============================================================================
// CANONICAL ROLE HIERARCHY (10+1 roles from CANONICAL_TRUTH.md)
// ============================================================================
// Safety tiers:
//   CRITICAL — can ground aircraft, halt operations (PLATFORM_ADMIN, DZ_OWNER, DZ_MANAGER)
//   HIGH     — can block individual loads/jumpers (MANIFEST_STAFF, PILOT, RIGGER)
//   STANDARD — can flag issues, request holds (TI, AFFI, COACH)
//   BASIC    — no safety authority (ATHLETE, STUDENT, SPECTATOR)
// ============================================================================

/**
 * Role inclusion map — higher roles implicitly carry the permissions of lower roles.
 * PLATFORM_ADMIN > DZ_OWNER > DZ_MANAGER > MANIFEST_STAFF > staff roles > jumper roles
 */
const ROLE_INCLUDES: Record<string, string[]> = {
  // SUPER_OWNER — global platform governance (multi-region, multi-org oversight)
  SUPER_OWNER: [
    "PLATFORM_ADMIN",
    "REGION_ADMIN",
    "FACILITY_MANAGER",
    "DZ_OWNER",
    "DZ_MANAGER",
    "MANIFEST_STAFF",
    "TI",
    "AFFI",
    "COACH",
    "PILOT",
    "RIGGER",
    "HOSPITALITY_STAFF",
    "RETAIL_STAFF",
    "REPUTATION_MODERATOR",
    "ATHLETE",
    "STUDENT",
    "ADMIN",
    "DZ_OPERATOR",
    "OPERATOR",
    "SAFETY_OFFICER",
    "FRONT_DESK",
    "GEAR_MASTER",
  ],
  PLATFORM_ADMIN: [
    "REGION_ADMIN",
    "FACILITY_MANAGER",
    "DZ_OWNER",
    "DZ_MANAGER",
    "MANIFEST_STAFF",
    "TI",
    "AFFI",
    "COACH",
    "PILOT",
    "RIGGER",
    "HOSPITALITY_STAFF",
    "RETAIL_STAFF",
    "REPUTATION_MODERATOR",
    "ATHLETE",
    "STUDENT",
    // Legacy aliases (backwards compatibility during migration)
    "ADMIN",
    "DZ_OPERATOR",
    "OPERATOR",
    "SAFETY_OFFICER",
    "FRONT_DESK",
    "GEAR_MASTER",
  ],
  // REGION_ADMIN — manages all facilities/orgs within a geographic region
  REGION_ADMIN: [
    "FACILITY_MANAGER",
    "DZ_OWNER",
    "DZ_MANAGER",
    "MANIFEST_STAFF",
    "TI",
    "AFFI",
    "COACH",
    "PILOT",
    "RIGGER",
    "HOSPITALITY_STAFF",
    "RETAIL_STAFF",
    "ATHLETE",
    "ADMIN",
    "DZ_OPERATOR",
    "OPERATOR",
    "SAFETY_OFFICER",
    "FRONT_DESK",
  ],
  // FACILITY_MANAGER — manages a single facility (any category)
  FACILITY_MANAGER: [
    "DZ_MANAGER",
    "MANIFEST_STAFF",
    "HOSPITALITY_STAFF",
    "RETAIL_STAFF",
    "ATHLETE",
    "DZ_OPERATOR",
    "OPERATOR",
    "FRONT_DESK",
  ],
  DZ_OWNER: [
    "DZ_MANAGER",
    "MANIFEST_STAFF",
    "TI",
    "AFFI",
    "COACH",
    "PILOT",
    "RIGGER",
    "ATHLETE",
    // Legacy aliases
    "ADMIN",
    "DZ_OPERATOR",
    "OPERATOR",
    "SAFETY_OFFICER",
    "FRONT_DESK",
  ],
  DZ_MANAGER: [
    "MANIFEST_STAFF",
    "TI",
    "AFFI",
    "COACH",
    "PILOT",
    "RIGGER",
    "ATHLETE",
    // Legacy aliases
    "DZ_OPERATOR",
    "OPERATOR",
    "SAFETY_OFFICER",
    "FRONT_DESK",
  ],
  MANIFEST_STAFF: [
    "ATHLETE",
    // Legacy aliases
    "OPERATOR",
    "FRONT_DESK",
  ],
  TI: ["ATHLETE"],
  AFFI: ["ATHLETE"],
  COACH: ["ATHLETE"],
  PILOT: [],
  RIGGER: [],
  // Multi-asset facility staff roles
  HOSPITALITY_STAFF: [],
  RETAIL_STAFF: [],
  REPUTATION_MODERATOR: [],
  ATHLETE: ["STUDENT"],
  STUDENT: [],
};

/** Safety tier for a given role — used by safety gate checks. */
export const SAFETY_TIER: Record<string, 'CRITICAL' | 'HIGH' | 'STANDARD' | 'BASIC'> = {
  SUPER_OWNER: 'CRITICAL',
  PLATFORM_ADMIN: 'CRITICAL',
  REGION_ADMIN: 'CRITICAL',
  FACILITY_MANAGER: 'CRITICAL',
  DZ_OWNER: 'CRITICAL',
  DZ_MANAGER: 'CRITICAL',
  MANIFEST_STAFF: 'HIGH',
  PILOT: 'HIGH',
  RIGGER: 'HIGH',
  TI: 'STANDARD',
  AFFI: 'STANDARD',
  COACH: 'STANDARD',
  HOSPITALITY_STAFF: 'BASIC',
  RETAIL_STAFF: 'BASIC',
  REPUTATION_MODERATOR: 'STANDARD',
  ATHLETE: 'BASIC',
  STUDENT: 'BASIC',
};

function expandRoles(userRoles: string[]): string[] {
  const expanded = new Set(userRoles);
  for (const role of userRoles) {
    const includes = ROLE_INCLUDES[role];
    if (includes) {
      for (const r of includes) expanded.add(r);
    }
  }
  return Array.from(expanded);
}

export function authorize(requiredRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      reply.code(401).send({
        success: false,
        error: "Unauthorized",
      });
      return;
    }

    const userRoles = expandRoles(request.user.roles || []);
    const hasRequiredRole = requiredRoles.some((role) =>
      userRoles.includes(role)
    );

    if (!hasRequiredRole) {
      reply.code(403).send({
        success: false,
        error: `Requires one of: ${requiredRoles.join(", ")}`,
      });
      return;
    }
  };
}
