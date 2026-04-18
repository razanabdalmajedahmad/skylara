/**
 * Phase 19–22: role-, surface-, and athlete-aware assistant shaping (additive).
 * Uses JWT roles, client context, and optional User/Athlete/License rows — no invented data.
 * Logs elsewhere must remain prompt-safe (metadata only).
 */

import { composePromptShapingV3 } from './assistantPromptRegistry';
import {
  bestEffectiveLicenseLevel,
  classifyJumpBand,
  classifyLicenseBand,
  classifyProgressionStage,
  disciplineBreadthFromJson,
  deriveAssistantJumpProfile,
  type AssistantDisciplineBreadth,
  type AssistantJumpBand,
  type AssistantJumpProfile,
  type AssistantLicenseBand,
  type AssistantProgressionStage,
} from './assistantAthleteSignals';

export type {
  AssistantJumpProfile,
  AssistantJumpBand,
  AssistantLicenseBand,
  AssistantProgressionStage,
  AssistantDisciplineBreadth,
} from './assistantAthleteSignals';

export type AssistantAthleteShapingSnapshot = {
  jumpProfile: AssistantJumpProfile;
  jumpBand: AssistantJumpBand;
  licenseBand: AssistantLicenseBand;
  progressionStage: AssistantProgressionStage;
  disciplineBreadth: AssistantDisciplineBreadth;
};

const ROLE_FOCUS_MAP: Record<string, string> = {
  PLATFORM_ADMIN: 'platform_administration',
  DZ_OPERATOR: 'dz_management',
  DZ_MANAGER: 'dz_management',
  MANIFEST_STAFF: 'manifest_operations',
  SAFETY_OFFICER: 'safety_compliance',
  PILOT: 'aviation_ops',
  RIGGER: 'equipment_rigging',
  TANDEM_INSTRUCTOR: 'instruction_tandem',
  AFF_INSTRUCTOR: 'instruction_aff_student_progression',
  COACH: 'instruction_coaching',
  CAMERA_COACH: 'instruction_coaching',
  ATHLETE: 'athlete_consumer',
  JUMPER: 'athlete_consumer',
  STUDENT: 'student_consumer',
  FRONT_DESK: 'front_desk_operations',
};

export function deriveAssistantRoleFocusTags(roleNames: string[]): string[] {
  const tags = new Set<string>();
  for (const raw of roleNames) {
    const key = (raw || '').trim().toUpperCase();
    if (!key) continue;
    const tag = ROLE_FOCUS_MAP[key];
    if (tag) tags.add(tag);
  }
  if (tags.size === 0) {
    tags.add('general_authenticated_user');
  }
  return Array.from(tags).sort();
}

export function classifyAssistantSurface(currentRoute?: string, currentPage?: string): string {
  const p = (currentPage || '').trim().toLowerCase();
  if (p.includes('manifest board')) return 'dashboard_manifest';
  if (p.includes('mobile messages')) return 'mobile_chat';
  if (p.includes('discover dropzones')) return 'mobile_discover_list';
  if (p.includes('dropzone detail')) return 'mobile_dropzone_detail';
  if (p.includes('events and camps')) return 'mobile_events_camps';
  if (p.includes('event detail')) return 'mobile_event_detail';

  const r = (currentRoute || '').toLowerCase();
  if (r.includes('/dashboard/manifest')) return 'dashboard_manifest';
  if (r.includes('/mobile/chat')) return 'mobile_chat';
  if (r === '/mobile/discover' || r.endsWith('/mobile/discover')) return 'mobile_discover_list';
  if (r.includes('/mobile/discover/')) return 'mobile_dropzone_detail';
  if (r.includes('/mobile/events/')) return 'mobile_event_detail';
  if (r.includes('/mobile/events')) return 'mobile_events_camps';
  if (r.includes('/dashboard/ai/assistant') || r.includes('/dashboard/portal-assistant') || r.includes('/dashboard/assistant-chat'))
    return 'dashboard_assistant_chat';
  if (r.includes('/dashboard/ops')) return 'dashboard_ops';

  return 'web_generic';
}

type PrismaUserAthleteSubset = {
  user: {
    findUnique: (args: unknown) => Promise<{
      athlete: {
        licenseLevel: string;
        totalJumps: number;
        disciplines: unknown;
      } | null;
      licenses: { level: string }[];
    } | null>;
  };
};

/**
 * Load coarse athlete/profile bands from Athlete row and/or License rows (real data only).
 */
export async function fetchAssistantProfileForShaping(
  prisma: PrismaUserAthleteSubset,
  userId: number
): Promise<AssistantAthleteShapingSnapshot> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      athlete: {
        select: {
          licenseLevel: true,
          totalJumps: true,
          disciplines: true,
        },
      },
      licenses: { select: { level: true }, take: 25 },
    },
  });

  const licenseRows = row?.licenses ?? [];
  const licenseLevels = licenseRows.map((l) => l.level);
  const hasLicenseRows = licenseLevels.length > 0;
  const ath = row?.athlete ?? null;
  const hasAthleteRow = ath != null;

  const effective = bestEffectiveLicenseLevel([ath?.licenseLevel, ...licenseLevels]);

  const jumps = ath?.totalJumps ?? 0;
  const disciplineBreadth = hasAthleteRow ? disciplineBreadthFromJson(ath?.disciplines) : 'unknown';

  return {
    jumpProfile: deriveAssistantJumpProfile(hasAthleteRow, ath?.licenseLevel, effective, hasLicenseRows),
    jumpBand: classifyJumpBand(hasAthleteRow, jumps),
    licenseBand: hasAthleteRow || hasLicenseRows ? classifyLicenseBand(effective) : 'unknown',
    progressionStage: classifyProgressionStage(hasAthleteRow, effective, jumps, hasLicenseRows),
    disciplineBreadth,
  };
}

/** @deprecated Prefer fetchAssistantProfileForShaping; kept for narrow tests/callers. */
export async function fetchAssistantJumpProfile(
  prisma: PrismaUserAthleteSubset,
  userId: number
): Promise<AssistantJumpProfile> {
  const s = await fetchAssistantProfileForShaping(prisma, userId);
  return s.jumpProfile;
}

export type AssistantShapingInput = {
  roleFocusTags: string[];
  surfaceClass: string;
  jumpProfile: AssistantJumpProfile;
  jumpBand: AssistantJumpBand;
  licenseBand: AssistantLicenseBand;
  progressionStage: AssistantProgressionStage;
  disciplineBreadth: AssistantDisciplineBreadth;
  instructionalStaffCapacity: 'yes' | 'no';
};

export function buildAssistantShapingSection(input: AssistantShapingInput): string {
  return composePromptShapingV3({
    roleFocusTags: input.roleFocusTags,
    surfaceClass: input.surfaceClass,
    jumpProfile: input.jumpProfile,
    jumpBand: input.jumpBand,
    licenseBand: input.licenseBand,
    progressionStage: input.progressionStage,
    disciplineBreadth: input.disciplineBreadth,
    instructionalStaffCapacity: input.instructionalStaffCapacity,
  });
}

export function instructionalStaffFromJwtRoles(roleNames: string[]): 'yes' | 'no' {
  const instructional = new Set(['COACH', 'CAMERA_COACH', 'TANDEM_INSTRUCTOR', 'AFF_INSTRUCTOR']);
  for (const raw of roleNames) {
    const k = (raw || '').trim().toUpperCase();
    if (instructional.has(k)) return 'yes';
  }
  return 'no';
}
