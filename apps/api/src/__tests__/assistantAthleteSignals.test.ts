import { describe, it, expect } from 'vitest';
import {
  bestEffectiveLicenseLevel,
  classifyJumpBand,
  classifyLicenseBand,
  classifyProgressionStage,
  disciplineBreadthFromJson,
  deriveAssistantJumpProfile,
} from '../services/ai/assistantAthleteSignals';

describe('assistantAthleteSignals', () => {
  it('bestEffectiveLicenseLevel picks highest known rank', () => {
    expect(bestEffectiveLicenseLevel(['B', 'NONE', 'D', 'A'])).toBe('D');
    expect(bestEffectiveLicenseLevel(['', undefined, 'student'])).toBe('STUDENT');
    expect(bestEffectiveLicenseLevel([])).toBe('NONE');
  });

  it('classifyJumpBand is unknown without athlete row', () => {
    expect(classifyJumpBand(false, 999)).toBe('unknown');
  });

  it('classifyJumpBand buckets total jumps when athlete exists', () => {
    expect(classifyJumpBand(true, 0)).toBe('zero');
    expect(classifyJumpBand(true, 10)).toBe('low');
    expect(classifyJumpBand(true, 80)).toBe('mid');
    expect(classifyJumpBand(true, 500)).toBe('high');
    expect(classifyJumpBand(true, 2000)).toBe('very_high');
  });

  it('classifyLicenseBand maps effective level', () => {
    expect(classifyLicenseBand('NONE')).toBe('none');
    expect(classifyLicenseBand('STUDENT')).toBe('student');
    expect(classifyLicenseBand('A')).toBe('rated_ab');
    expect(classifyLicenseBand('D')).toBe('rated_cd');
    expect(classifyLicenseBand('WEIRD')).toBe('unknown');
  });

  it('classifyProgressionStage uses athlete, licenses, jumps', () => {
    expect(classifyProgressionStage(false, 'NONE', 0, false)).toBe('not_on_file');
    expect(classifyProgressionStage(true, 'STUDENT', 3, false)).toBe('student_track');
    expect(classifyProgressionStage(true, 'NONE', 5, false)).toBe('pre_license_novice');
    expect(classifyProgressionStage(true, 'NONE', 30, false)).toBe('pre_license_experienced');
    expect(classifyProgressionStage(true, 'B', 100, false)).toBe('licensed_lower_tier');
    expect(classifyProgressionStage(true, 'D', 100, false)).toBe('licensed_upper_tier');
    expect(classifyProgressionStage(false, 'C', 0, true)).toBe('licensed_upper_tier');
  });

  it('disciplineBreadthFromJson counts non-empty strings', () => {
    expect(disciplineBreadthFromJson(null)).toBe('unknown');
    expect(disciplineBreadthFromJson({})).toBe('unknown');
    expect(disciplineBreadthFromJson(['fs'])).toBe('narrow');
    expect(disciplineBreadthFromJson(['fs', ' ', 'freefly'])).toBe('moderate');
    expect(disciplineBreadthFromJson(['a', 'b', 'c', 'd'])).toBe('broad');
  });

  it('deriveAssistantJumpProfile stays coarse and license-based', () => {
    expect(deriveAssistantJumpProfile(false, undefined, 'NONE', false)).toBe('not_on_file');
    expect(deriveAssistantJumpProfile(true, 'STUDENT', 'STUDENT', false)).toBe('student_progression');
    expect(deriveAssistantJumpProfile(true, 'NONE', 'B', false)).toBe('licensed_jumper');
    expect(deriveAssistantJumpProfile(true, 'NONE', 'NONE', false)).toBe('pre_license_or_tandem_track');
  });
});
