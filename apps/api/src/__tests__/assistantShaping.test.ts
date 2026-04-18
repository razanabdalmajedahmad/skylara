import { describe, it, expect, vi } from 'vitest';
import {
  deriveAssistantRoleFocusTags,
  classifyAssistantSurface,
  fetchAssistantJumpProfile,
  fetchAssistantProfileForShaping,
  buildAssistantShapingSection,
} from '../services/ai/assistantShaping';

function prismaUserSnapshot(athlete: { licenseLevel: string; totalJumps: number; disciplines?: unknown } | null, licenses: { level: string }[] = []) {
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue({ athlete, licenses }),
    },
  };
}

describe('assistantShaping', () => {
  it('deriveAssistantRoleFocusTags dedupes and sorts', () => {
    expect(deriveAssistantRoleFocusTags(['MANIFEST_STAFF', 'COACH', 'MANIFEST_STAFF'])).toEqual([
      'instruction_coaching',
      'manifest_operations',
    ]);
  });

  it('deriveAssistantRoleFocusTags maps JUMPER to athlete_consumer', () => {
    expect(deriveAssistantRoleFocusTags(['JUMPER'])).toEqual(['athlete_consumer']);
  });

  it('deriveAssistantRoleFocusTags falls back when unknown roles only', () => {
    expect(deriveAssistantRoleFocusTags(['UNKNOWN_ROLE_X'])).toEqual(['general_authenticated_user']);
  });

  it('classifyAssistantSurface prefers currentPage labels', () => {
    expect(classifyAssistantSurface('/anything', 'Discover Dropzones')).toBe('mobile_discover_list');
    expect(classifyAssistantSurface('/anything', 'Mobile Messages')).toBe('mobile_chat');
    expect(classifyAssistantSurface('/anything', 'Manifest Board')).toBe('dashboard_manifest');
  });

  it('classifyAssistantSurface uses route when page is generic', () => {
    expect(classifyAssistantSurface('/dashboard/manifest', 'General')).toBe('dashboard_manifest');
    expect(classifyAssistantSurface('/mobile/chat', '')).toBe('mobile_chat');
    expect(classifyAssistantSurface('/mobile/discover', '')).toBe('mobile_discover_list');
    expect(classifyAssistantSurface('/mobile/discover/12', '')).toBe('mobile_dropzone_detail');
    expect(classifyAssistantSurface('/mobile/events', '')).toBe('mobile_events_camps');
    expect(classifyAssistantSurface('/mobile/events/5', '')).toBe('mobile_event_detail');
    expect(classifyAssistantSurface('', 'Events and Camps')).toBe('mobile_events_camps');
    expect(classifyAssistantSurface('', 'Event Detail')).toBe('mobile_event_detail');
  });

  it('fetchAssistantProfileForShaping returns not_on_file when user missing or empty profile', async () => {
    const noUser = { user: { findUnique: vi.fn().mockResolvedValue(null) } };
    await expect(fetchAssistantProfileForShaping(noUser as any, 1)).resolves.toMatchObject({
      jumpProfile: 'not_on_file',
      jumpBand: 'unknown',
      licenseBand: 'unknown',
      progressionStage: 'not_on_file',
    });

    const empty = prismaUserSnapshot(null, []);
    await expect(fetchAssistantProfileForShaping(empty as any, 1)).resolves.toMatchObject({
      jumpProfile: 'not_on_file',
      progressionStage: 'not_on_file',
    });
  });

  it('fetchAssistantJumpProfile matches snapshot jumpProfile', async () => {
    const prisma = prismaUserSnapshot({ licenseLevel: 'STUDENT', totalJumps: 5, disciplines: [] }, []);
    await expect(fetchAssistantJumpProfile(prisma as any, 1)).resolves.toBe('student_progression');

    prisma.user.findUnique = vi.fn().mockResolvedValue({
      athlete: { licenseLevel: 'B', totalJumps: 50, disciplines: [] },
      licenses: [],
    });
    await expect(fetchAssistantJumpProfile(prisma as any, 1)).resolves.toBe('licensed_jumper');

    prisma.user.findUnique = vi.fn().mockResolvedValue({
      athlete: { licenseLevel: 'NONE', totalJumps: 0, disciplines: [] },
      licenses: [],
    });
    await expect(fetchAssistantJumpProfile(prisma as any, 1)).resolves.toBe('pre_license_or_tandem_track');
  });

  it('fetchAssistantProfileForShaping uses license rows when athlete absent', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          athlete: null,
          licenses: [{ level: 'C' }],
        }),
      },
    };
    await expect(fetchAssistantProfileForShaping(prisma as any, 1)).resolves.toMatchObject({
      jumpProfile: 'licensed_jumper',
      licenseBand: 'rated_cd',
      progressionStage: 'licensed_upper_tier',
      jumpBand: 'unknown',
    });
  });

  it('buildAssistantShapingSection is prompt-safe metadata only', () => {
    const s = buildAssistantShapingSection({
      roleFocusTags: ['manifest_operations'],
      surfaceClass: 'dashboard_manifest',
      jumpProfile: 'licensed_jumper',
      jumpBand: 'mid',
      licenseBand: 'rated_ab',
      progressionStage: 'licensed_lower_tier',
      disciplineBreadth: 'unknown',
      instructionalStaffCapacity: 'no',
    });
    expect(s).toContain('manifest_operations');
    expect(s).toContain('dashboard_manifest');
    expect(s).toContain('licensed_jumper');
    expect(s).toContain('Jump count band');
    expect(s).not.toMatch(/\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/);
  });
});
