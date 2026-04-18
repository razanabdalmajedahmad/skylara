/**
 * Phase 7: prompt versioning + approximate token budgeting helpers.
 * This file must not log prompt bodies; metadata only.
 */

import { clampAssistantContext } from './assistantContextAssembly';
import type { LlmChatMessage } from '../llm/types';
import { DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID } from './assistantPromptRegistry';

/** Canonical default; single source in `assistantPromptRegistry.ts`. */
export const DEFAULT_ASSISTANT_PROMPT_VERSION = DEFAULT_ASSISTANT_PROMPT_TEMPLATE_ID;

/** Rough, model-agnostic token estimate (good enough for budgeting and logs). */
export function estimateTokensFromText(text: string): number {
  // English-ish text tends to be ~4 chars/token; add a small floor for very short strings.
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function estimateTokensForChat(system: string, messages: LlmChatMessage[]): number {
  // Include small per-message overhead.
  const overhead = messages.length * 6;
  const contentTokens =
    estimateTokensFromText(system) +
    messages.reduce((sum, m) => sum + estimateTokensFromText(m.content), 0);
  return contentTokens + overhead;
}

export type AssistantBudgetResult = {
  system: string;
  messages: LlmChatMessage[];
  estimatedInputTokens: number;
  truncatedSystem: boolean;
  droppedMessageCount: number;
};

/**
 * Enforce an approximate input token budget by:
 * - dropping oldest messages first (preserving the newest user turn)
 * - then clamping system prompt by characters if still over
 */
export function applyAssistantInputTokenBudget(params: {
  system: string;
  messages: LlmChatMessage[];
  maxInputTokens: number;
  minKeepMessages?: number;
}): AssistantBudgetResult {
  const max = Math.max(1, params.maxInputTokens);
  const minKeep = Math.max(1, params.minKeepMessages ?? 2);

  let system = params.system;
  const messages: LlmChatMessage[] = [...params.messages];
  let dropped = 0;
  let truncatedSystem = false;

  while (messages.length > minKeep) {
    const est = estimateTokensForChat(system, messages);
    if (est <= max) break;
    messages.shift();
    dropped += 1;
  }

  let est = estimateTokensForChat(system, messages);
  if (est > max) {
    // clamp system prompt proportional to budget remaining; keep at least 800 chars.
    const budgetForSystemTokens = Math.max(200, max - messages.reduce((s, m) => s + estimateTokensFromText(m.content), 0));
    const approxChars = Math.max(800, budgetForSystemTokens * 4);
    if (system.length > approxChars) {
      system = clampAssistantContext(system, approxChars);
      truncatedSystem = true;
    }
    est = estimateTokensForChat(system, messages);
  }

  return {
    system,
    messages,
    estimatedInputTokens: est,
    truncatedSystem,
    droppedMessageCount: dropped,
  };
}

