/**
 * Audit-safe structured logging for LLM calls.
 * Never pass prompt bodies, message arrays, or API keys into log objects.
 */

import type { LlmCompletionOutcome, LlmFailureCategory } from './types';

/** Allowlisted keys only — extend here if new safe metadata is needed. */
export type SafeLlmLogPayload = {
  event:
    | 'llm.completion'
    | 'llm.completion.attempt'
    | 'llm.stream.open'
    | 'llm.stream.summary'
    | 'llm.stream.fallback';
  provider: 'anthropic';
  /** Wall time for full multi-attempt completion (final summary only). */
  durationMs?: number;
  /** Single HTTP attempt duration (attempt events). */
  attemptDurationMs?: number;
  /** Zero-based attempt index (attempt events). */
  attemptIndex?: number;
  /** Whether another attempt will run after backoff. */
  willRetry?: boolean;
  /** Total attempts performed (final summary). */
  attemptsUsed?: number;
  /** Normalized taxonomy (Phase 4). */
  failureCategory?: LlmFailureCategory;
  outcome?: LlmCompletionOutcome;
  httpStatus?: number;
  hasText?: boolean;
  errorName?: string;
  requestId?: string | null;
  /** Streaming only — counts and sizes, not text. */
  deltaEventCount?: number;
  charCount?: number;
  stream?: 'anthropic_sse';
  fallbackReason?: 'open_failed' | 'mid_stream_error' | 'client_abort' | 'unsupported';
  /** True when `Content-Type` was present but did not look like SSE (still attempting parse). */
  contentTypeUnexpected?: boolean;
};

export function buildSafeLlmLog(payload: SafeLlmLogPayload): Record<string, unknown> {
  return { ...payload };
}

/** Alias for call sites that predate `buildSafeLlmLog`. */
export function buildSafeLlmCompletionLog(payload: SafeLlmLogPayload): Record<string, unknown> {
  return buildSafeLlmLog(payload);
}

/**
 * Guard: reject objects that accidentally include forbidden keys (defense in depth).
 */
const FORBIDDEN_LOG_KEYS = new Set([
  'system',
  'messages',
  'body',
  'prompt',
  'x-api-key',
  'apiKey',
  'authorization',
  'content',
]);

export function assertNoForbiddenLogKeys(obj: Record<string, unknown>): void {
  for (const k of Object.keys(obj)) {
    if (FORBIDDEN_LOG_KEYS.has(k.toLowerCase())) {
      throw new Error(`[llm] forbidden log key blocked: ${k}`);
    }
  }
}
