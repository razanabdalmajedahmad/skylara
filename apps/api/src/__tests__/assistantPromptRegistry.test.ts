import { describe, it, expect } from 'vitest';
import {
  ASSISTANT_PROMPT_REGISTRY,
  DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID,
  PORTAL_ASSISTANT_TEMPLATE_V1_ID,
  PORTAL_ASSISTANT_TEMPLATE_V2_ID,
  composePortalAssistantSystemPromptFromRegistry,
  composePromptRoleShapingLines,
  composePromptShapingV2,
  composePromptShapingV3,
  composePromptSurfaceAndAthleteLines,
  composePromptAthleteSignalLines,
  resolveRegisteredAssistantTemplateId,
  listRegisteredAssistantTemplateSummaries,
  isRegisteredAssistantTemplateId,
} from '../services/ai/assistantPromptRegistry';
import { buildPortalAssistantSystemPrompt } from '../services/ai/assistantContextAssembly';

const fullShaping = {
  roleFocusTags: ['athlete_consumer'] as string[],
  surfaceClass: 'mobile_chat',
  jumpProfile: 'not_on_file',
  jumpBand: 'unknown' as const,
  licenseBand: 'unknown' as const,
  progressionStage: 'not_on_file' as const,
  disciplineBreadth: 'unknown' as const,
  instructionalStaffCapacity: 'no' as const,
};

describe('assistantPromptRegistry', () => {
  it('listRegisteredAssistantTemplateSummaries returns id and description only', () => {
    const list = listRegisteredAssistantTemplateSummaries();
    expect(list.some((t) => t.id === DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID)).toBe(true);
    for (const t of list) {
      expect(t.id).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t).not.toHaveProperty('compose');
    }
  });

  it('isRegisteredAssistantTemplateId is strict', () => {
    expect(isRegisteredAssistantTemplateId(DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID)).toBe(true);
    expect(isRegisteredAssistantTemplateId('not-real')).toBe(false);
    expect(isRegisteredAssistantTemplateId('')).toBe(false);
    expect(isRegisteredAssistantTemplateId(null)).toBe(false);
  });

  it('exposes registered template ids', () => {
    expect(ASSISTANT_PROMPT_REGISTRY[DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID]).toBeDefined();
    expect(ASSISTANT_PROMPT_REGISTRY[PORTAL_ASSISTANT_TEMPLATE_V1_ID]).toBeDefined();
    expect(ASSISTANT_PROMPT_REGISTRY[PORTAL_ASSISTANT_TEMPLATE_V2_ID]).toBeDefined();
  });

  it('resolveRegisteredAssistantTemplateId falls back for unknown version', () => {
    expect(resolveRegisteredAssistantTemplateId('not-a-real-template')).toBe(DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID);
    expect(resolveRegisteredAssistantTemplateId('')).toBe(DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID);
    expect(resolveRegisteredAssistantTemplateId(PORTAL_ASSISTANT_TEMPLATE_V1_ID)).toBe(PORTAL_ASSISTANT_TEMPLATE_V1_ID);
    expect(resolveRegisteredAssistantTemplateId(PORTAL_ASSISTANT_TEMPLATE_V2_ID)).toBe(PORTAL_ASSISTANT_TEMPLATE_V2_ID);
  });

  it('composePromptShapingV2 (phase 19) matches section parts and omits athlete bands', () => {
    const block = composePromptShapingV2({
      roleFocusTags: ['manifest_operations'],
      surfaceClass: 'dashboard_manifest',
      jumpProfile: 'licensed_jumper',
      jumpBand: 'mid',
      licenseBand: 'rated_ab',
      progressionStage: 'licensed_lower_tier',
      disciplineBreadth: 'moderate',
      instructionalStaffCapacity: 'yes',
    });
    expect(block).toContain(composePromptRoleShapingLines({ roleFocusTags: ['manifest_operations'] }));
    expect(block).toContain(
      composePromptSurfaceAndAthleteLines({ surfaceClass: 'dashboard_manifest', jumpProfile: 'licensed_jumper' })
    );
    expect(block).not.toContain('Jump count band');
  });

  it('composePromptShapingV3 includes athlete signal lines', () => {
    const athleteLines = composePromptAthleteSignalLines({
      jumpBand: 'low',
      licenseBand: 'student',
      progressionStage: 'student_track',
      disciplineBreadth: 'narrow',
      instructionalStaffCapacity: 'no',
    });
    const block = composePromptShapingV3({
      roleFocusTags: ['athlete_consumer'],
      surfaceClass: 'mobile_events_camps',
      jumpProfile: 'student_progression',
      jumpBand: 'low',
      licenseBand: 'student',
      progressionStage: 'student_track',
      disciplineBreadth: 'narrow',
      instructionalStaffCapacity: 'no',
    });
    expect(block).toContain(athleteLines);
    expect(block).toContain('Jump count band');
  });

  it('v3 default template includes full shaping; v1 template omits shaping block', () => {
    const base = {
      userRole: 'JUMPER',
      currentRoute: '/mobile/chat',
      matches: [] as { type: 'article' | 'feature'; title?: string; category?: string | null; shortAnswer?: string | null; name?: string; description?: string | null; route?: string | null }[],
      platformContext: 'DZ: General, Route: /mobile/chat',
      shaping: {
        roleFocusTags: ['athlete_consumer'],
        surfaceClass: 'mobile_chat',
        jumpProfile: 'not_on_file',
      },
    };

    const v3 = composePortalAssistantSystemPromptFromRegistry(DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID, {
      promptVersion: DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID,
      ...base,
      shaping: { ...base.shaping, ...fullShaping },
    });
    const v1 = composePortalAssistantSystemPromptFromRegistry(PORTAL_ASSISTANT_TEMPLATE_V1_ID, {
      promptVersion: PORTAL_ASSISTANT_TEMPLATE_V1_ID,
      ...base,
      shaping: { ...base.shaping, ...fullShaping },
    });

    expect(v3).toContain('## Context shaping');
    expect(v3).toContain('Jump count band');
    expect(v3).toContain(`Prompt-Version: ${DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID}`);
    expect(v1).not.toContain('## Context shaping');
    expect(v1).toContain('Prompt-Version: portal_assistant@2026-04-13.v1');
  });

  it('v2 template includes phase-19 shaping only (no athlete bands)', () => {
    const v2 = composePortalAssistantSystemPromptFromRegistry(PORTAL_ASSISTANT_TEMPLATE_V2_ID, {
      promptVersion: PORTAL_ASSISTANT_TEMPLATE_V2_ID,
      userRole: 'JUMPER',
      currentRoute: '/mobile/chat',
      matches: [],
      platformContext: 'DZ: General',
      shaping: fullShaping,
    });
    expect(v2).toContain('## Context shaping');
    expect(v2).not.toContain('Jump count band');
    expect(v2).toContain(`Prompt-Version: ${PORTAL_ASSISTANT_TEMPLATE_V2_ID}`);
  });

  it('buildPortalAssistantSystemPrompt normalizes unknown prompt version header to default template', () => {
    const prompt = buildPortalAssistantSystemPrompt({
      userRole: 'JUMPER',
      currentRoute: undefined,
      matches: [],
      platformContext: 'DZ: General, Route: Unknown',
      promptVersion: 'totally-unknown@version',
      shaping: fullShaping,
    });
    expect(prompt).toContain(`Prompt-Version: ${DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID}`);
    expect(prompt).toContain('## Context shaping');
    expect(prompt).toContain('Jump count band');
  });
});
