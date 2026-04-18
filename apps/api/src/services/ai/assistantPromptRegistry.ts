/**
 * Phase 20: versioned portal assistant prompt registry.
 * Composes system prompts from named sections — extension point for future variants.
 * No prompt bodies in logs from this module; callers log metadata only.
 */

import type { AssistantKnowledgeMatch } from './assistantContextTypes';

/** Default template (Phase 22 athlete bands in shaping). */
export const DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID = 'portal_assistant@2026-04-13.v3';

/** Legacy: no shaping block. */
export const PORTAL_ASSISTANT_TEMPLATE_V1_ID = 'portal_assistant@2026-04-13.v1';

/** Phase 19 shaping only (role + surface + jump profile); pin via ASSISTANT_PROMPT_VERSION. */
export const PORTAL_ASSISTANT_TEMPLATE_V2_ID = 'portal_assistant@2026-04-13.v2';

export type PromptShapingParts = {
  roleFocusTags: string[];
  surfaceClass: string;
  jumpProfile: string;
  /** Phase 22 — optional for pinned v2 template (ignored by phase-19 composer). */
  jumpBand?: string;
  licenseBand?: string;
  progressionStage?: string;
  disciplineBreadth?: string;
  instructionalStaffCapacity?: string;
};

export type PortalAssistantPromptComposeInput = {
  /** Shown in `Prompt-Version:` line (traceability; may differ from template id if extended later). */
  promptVersion: string;
  userRole: string;
  currentRoute: string | undefined;
  matches: AssistantKnowledgeMatch[];
  platformContext: string;
  shaping?: PromptShapingParts;
};

/** Immutable section text for v2 — tests and future templates can assert / fork from these. */
export const PORTAL_ASSISTANT_V2_SECTIONS = {
  identity:
    'You are the SkyLara AI Assistant — an operational intelligence layer for a skydiving dropzone platform.',
  relevantHelpHeading: '## Relevant Help Resources',
  featuresHeading: '## Available Features',
  responseFormatHeading: '## Response Format',
  responseFormatBody: `1. Give a direct, concise answer first
2. Include specific numbers from live data when available
3. Add clickable route links in format: [Page Name](/dashboard/route)
4. List action steps if applicable
5. Flag any warnings or blockers
6. Suggest a relevant follow-up question`,
  operationalRulesHeading: '## Operational Rules',
  operationalRulesBody: `- When asked "who is missing X" or "what is blocked", use the Live Operational State data above
- For manifest questions, reference specific load numbers and fill status
- For safety questions, always err on the side of caution
- Pilot is the final authority for aircraft weight, balance, fuel, and suitability — never auto-approve
- Weather suggestions are advisory — always flag "human review required"
- Every recommendation must be explainable`,
  securityRulesHeading: '## Security Rules',
  securityRulesBody: `- NEVER perform sensitive actions (payments, role changes, data deletion)
- Direct users to the appropriate dashboard for sensitive operations
- Do NOT fabricate feature names or routes
- Mask any PII in responses`,
  closingLine:
    'Be concise, operational, and action-oriented. SkyLara staff are busy — get to the point.',
  shapingHeading: '## Context shaping (metadata — do not invent permissions or data)',
  shapingTailoring:
    '- Tailor depth and examples to capability focus and surface. If the user asks outside their likely role, still answer helpfully and safely.',
  shapingAuthority:
    '- Never assume unstated operational authority; direct sensitive actions to the proper UI workflows.',
} as const;

/**
 * Role-focused lines (Phase 19 / registry extension point).
 */
export function composePromptRoleShapingLines(parts: Pick<PromptShapingParts, 'roleFocusTags'>): string {
  const rolesLine = parts.roleFocusTags.join(', ');
  return `- User capability focus (from account roles): ${rolesLine}`;
}

/**
 * Surface + athlete hint lines (client surface + DB athlete coarse hint).
 */
export function composePromptSurfaceAndAthleteLines(parts: Pick<PromptShapingParts, 'surfaceClass' | 'jumpProfile'>): string {
  return `- Client surface: ${parts.surfaceClass}
- Jump profile hint (from athlete record if any; not a license verification): ${parts.jumpProfile}`;
}

/** Phase 19 shaping only (pin template v2). */
export function composePromptShapingPhase19(parts: PromptShapingParts): string {
  const s = PORTAL_ASSISTANT_V2_SECTIONS;
  return `${s.shapingHeading}
${composePromptRoleShapingLines(parts)}
${composePromptSurfaceAndAthleteLines(parts)}
${s.shapingTailoring}
${s.shapingAuthority}`;
}

/** @deprecated use composePromptShapingPhase19 or composePromptShapingV3 */
export const composePromptShapingV2 = composePromptShapingPhase19;

/**
 * Phase 22: athlete / profile coarse bands (extension point).
 */
export function composePromptAthleteSignalLines(
  parts: Pick<
    PromptShapingParts,
    'jumpBand' | 'licenseBand' | 'progressionStage' | 'disciplineBreadth' | 'instructionalStaffCapacity'
  >
): string {
  const jb = parts.jumpBand ?? 'unknown';
  const lb = parts.licenseBand ?? 'unknown';
  const ps = parts.progressionStage ?? 'unknown';
  const db = parts.disciplineBreadth ?? 'unknown';
  const inst = parts.instructionalStaffCapacity ?? 'no';
  return `- Jump count band (coarse, from account): ${jb}
- License band (coarse; not verification): ${lb}
- Progression stage (coarse): ${ps}
- Discipline breadth (from athlete profile list): ${db}
- Instructional/coach staff roles present (JWT): ${inst}
- For events, camps, and boogies: calibrate suitability and prep advice to these bands without asserting official eligibility.`;
}

/** Default shaping (Phase 22): Phase 19 block + athlete signal lines. */
export function composePromptShapingV3(parts: PromptShapingParts): string {
  const s = PORTAL_ASSISTANT_V2_SECTIONS;
  return `${s.shapingHeading}
${composePromptRoleShapingLines(parts)}
${composePromptSurfaceAndAthleteLines(parts)}
${composePromptAthleteSignalLines(parts)}
${s.shapingTailoring}
${s.shapingAuthority}`;
}

function buildArticlesSection(matches: AssistantKnowledgeMatch[]): string {
  return matches
    .filter((m) => m.type === 'article')
    .slice(0, 3)
    .map((a) => `- "${a.title}" (${a.category}): ${a.shortAnswer}`)
    .join('\n');
}

function buildFeaturesSection(matches: AssistantKnowledgeMatch[]): string {
  return matches
    .filter((m) => m.type === 'feature')
    .slice(0, 3)
    .map((f) => `- "${f.name}": ${f.description} (route: ${f.route})`)
    .join('\n');
}

function composePortalAssistantPromptBody(
  input: PortalAssistantPromptComposeInput,
  shapingFn: ((p: PromptShapingParts) => string) | null
): string {
  const s = PORTAL_ASSISTANT_V2_SECTIONS;
  const versionLine = `Prompt-Version: ${input.promptVersion}`;
  const articlesSection = buildArticlesSection(input.matches);
  const featuresSection = buildFeaturesSection(input.matches);
  const shapingBlock = input.shaping && shapingFn ? `\n${shapingFn(input.shaping)}\n` : '';

  return `${versionLine}

${s.identity}

User Role: ${input.userRole}
${input.currentRoute ? `Current Page: ${input.currentRoute}` : ''}
${shapingBlock}
${input.platformContext}

${s.relevantHelpHeading}
${articlesSection || 'No specific articles found.'}

${s.featuresHeading}
${featuresSection || 'No features match the query.'}

${s.responseFormatHeading}
${s.responseFormatBody}

${s.operationalRulesHeading}
${s.operationalRulesBody}

${s.securityRulesHeading}
${s.securityRulesBody}

${s.closingLine}`;
}

function composePortalAssistantPromptV3(input: PortalAssistantPromptComposeInput): string {
  return composePortalAssistantPromptBody(input, composePromptShapingV3);
}

function composePortalAssistantPromptV2Phase19(input: PortalAssistantPromptComposeInput): string {
  return composePortalAssistantPromptBody(input, composePromptShapingPhase19);
}

/** v1: no shaping block; same KB / rules / identity as v3. */
function composePortalAssistantPromptV1(input: PortalAssistantPromptComposeInput): string {
  const withoutShaping: PortalAssistantPromptComposeInput = { ...input, shaping: undefined };
  return composePortalAssistantPromptBody(withoutShaping, null);
}

export type AssistantPromptTemplateDefinition = {
  readonly id: string;
  readonly description: string;
  readonly compose: (input: PortalAssistantPromptComposeInput) => string;
};

export const ASSISTANT_PROMPT_REGISTRY: Record<string, AssistantPromptTemplateDefinition> = {
  [PORTAL_ASSISTANT_TEMPLATE_V1_ID]: {
    id: PORTAL_ASSISTANT_TEMPLATE_V1_ID,
    description: 'Portal assistant without Phase 19 shaping (pin for A/B or rollback).',
    compose: composePortalAssistantPromptV1,
  },
  [PORTAL_ASSISTANT_TEMPLATE_V2_ID]: {
    id: PORTAL_ASSISTANT_TEMPLATE_V2_ID,
    description: 'Phase 19 shaping only (role, surface, jump profile).',
    compose: composePortalAssistantPromptV2Phase19,
  },
  [DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID]: {
    id: DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID,
    description: 'Default: Phase 19 + Phase 22 athlete/profile bands.',
    compose: composePortalAssistantPromptV3,
  },
};

/**
 * Resolve env / caller version string to a registered template id.
 * Unknown values fall back to {@link DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID}.
 */
export function resolveRegisteredAssistantTemplateId(requested?: string): string {
  const v = (requested || '').trim();
  if (v && ASSISTANT_PROMPT_REGISTRY[v]) {
    return v;
  }
  return DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID;
}

/** Safe metadata for admin UI — id + description only (no prompt bodies). */
export function listRegisteredAssistantTemplateSummaries(): Array<{ id: string; description: string }> {
  return (Object.keys(ASSISTANT_PROMPT_REGISTRY) as string[]).map((id) => ({
    id,
    description: ASSISTANT_PROMPT_REGISTRY[id].description,
  }));
}

export function isRegisteredAssistantTemplateId(raw: string | null | undefined): boolean {
  const v = (raw || '').trim();
  return Boolean(v && ASSISTANT_PROMPT_REGISTRY[v]);
}

/**
 * Compose full portal system prompt using a registered template.
 */
export function composePortalAssistantSystemPromptFromRegistry(
  templateId: string,
  input: PortalAssistantPromptComposeInput
): string {
  const def = ASSISTANT_PROMPT_REGISTRY[templateId] ?? ASSISTANT_PROMPT_REGISTRY[DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID];
  return def.compose(input);
}
