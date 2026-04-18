/**
 * Phase 22: coarse athlete/profile bands for assistant shaping (real DB fields only).
 * Not license verification, not medical clearance — prompt hints only.
 */

export type AssistantJumpBand = 'unknown' | 'zero' | 'low' | 'mid' | 'high' | 'very_high';

export type AssistantLicenseBand = 'unknown' | 'none' | 'student' | 'rated_ab' | 'rated_cd';

export type AssistantProgressionStage =
  | 'not_on_file'
  | 'student_track'
  | 'pre_license_novice'
  | 'pre_license_experienced'
  | 'licensed_lower_tier'
  | 'licensed_upper_tier';

export type AssistantDisciplineBreadth = 'unknown' | 'narrow' | 'moderate' | 'broad';

const LICENSE_RANK: Record<string, number> = {
  NONE: 0,
  STUDENT: 1,
  A: 2,
  B: 3,
  C: 4,
  D: 5,
};

/** Pick highest known USPA-style level from athlete + license rows. */
export function bestEffectiveLicenseLevel(levels: (string | null | undefined)[]): string {
  let best = 'NONE';
  let bestR = -1;
  for (const raw of levels) {
    const l = (raw || '').trim().toUpperCase();
    if (!l) continue;
    const r = LICENSE_RANK[l];
    if (r === undefined) continue;
    if (r > bestR) {
      bestR = r;
      best = l;
    }
  }
  return best;
}

export function classifyJumpBand(hasAthleteRow: boolean, totalJumps: number): AssistantJumpBand {
  if (!hasAthleteRow) return 'unknown';
  const n = Math.max(0, Math.floor(totalJumps));
  if (n <= 0) return 'zero';
  if (n < 25) return 'low';
  if (n < 200) return 'mid';
  if (n < 1000) return 'high';
  return 'very_high';
}

export function classifyLicenseBand(effectiveLevel: string): AssistantLicenseBand {
  switch (effectiveLevel) {
    case 'NONE':
      return 'none';
    case 'STUDENT':
      return 'student';
    case 'A':
    case 'B':
      return 'rated_ab';
    case 'C':
    case 'D':
      return 'rated_cd';
    default:
      return 'unknown';
  }
}

export function classifyProgressionStage(
  hasAthleteRow: boolean,
  effectiveLevel: string,
  totalJumps: number,
  hasAnyLicenseRow: boolean
): AssistantProgressionStage {
  if (!hasAthleteRow && !hasAnyLicenseRow) {
    return 'not_on_file';
  }
  const jumps = Math.max(0, Math.floor(totalJumps));
  if (effectiveLevel === 'STUDENT') {
    return 'student_track';
  }
  if (effectiveLevel === 'NONE') {
    if (jumps < 25) return 'pre_license_novice';
    return 'pre_license_experienced';
  }
  if (effectiveLevel === 'A' || effectiveLevel === 'B') {
    return 'licensed_lower_tier';
  }
  if (effectiveLevel === 'C' || effectiveLevel === 'D') {
    return 'licensed_upper_tier';
  }
  return 'pre_license_novice';
}

export function disciplineBreadthFromJson(disciplines: unknown): AssistantDisciplineBreadth {
  if (!Array.isArray(disciplines)) return 'unknown';
  const n = disciplines.filter((x) => typeof x === 'string' && x.trim().length > 0).length;
  if (n <= 0) return 'unknown';
  if (n === 1) return 'narrow';
  if (n <= 3) return 'moderate';
  return 'broad';
}

/** Legacy coarse profile string used in shaping + logs; uses athlete row and/or license records. */
export type AssistantJumpProfile =
  | 'not_on_file'
  | 'student_progression'
  | 'licensed_jumper'
  | 'pre_license_or_tandem_track';

export function deriveAssistantJumpProfile(
  hasAthleteRow: boolean,
  athleteDbLicenseLevel: string | undefined,
  effectiveLevel: string,
  hasLicenseRows: boolean
): AssistantJumpProfile {
  if (!hasAthleteRow && !hasLicenseRows) {
    return 'not_on_file';
  }
  if (hasAthleteRow && athleteDbLicenseLevel === 'STUDENT') {
    return 'student_progression';
  }
  if (effectiveLevel === 'STUDENT') {
    return 'student_progression';
  }
  if (effectiveLevel !== 'NONE' && effectiveLevel !== 'STUDENT') {
    return 'licensed_jumper';
  }
  return 'pre_license_or_tandem_track';
}
