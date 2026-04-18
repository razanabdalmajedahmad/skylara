/**
 * Streaming LLM contracts — Phase 5. Wire formats live in routes; these are provider ↔ server boundaries.
 */

import type { LlmChatCompletionParams, LlmChatCompletionResult, LlmCompletionOutcome, LlmFailureCategory } from './types';

/** Events emitted by the provider stream parser (no user prompts; `delta` carries model output only). */
export type LlmUpstreamStreamEvent =
  | { kind: 'delta'; text: string }
  | { kind: 'end'; requestId: string | null }
  | {
      kind: 'error';
      outcome: LlmCompletionOutcome;
      failureCategory?: LlmFailureCategory;
      httpStatus?: number;
      /** Non-secret provider error type when present (e.g. Anthropic `error.type`). */
      providerErrorType?: string;
    };

export interface LlmStreamOptions {
  /** Structured log only — must not log message bodies or secrets. */
  log?: {
    warn: (obj: Record<string, unknown>) => void;
    error: (obj: Record<string, unknown>) => void;
    info?: (obj: Record<string, unknown>) => void;
  };
  /** Combined with provider timeout; also aborted when `abort()` is called on the session. */
  signal?: AbortSignal;
}

/**
 * Successful stream: iterate `events` once. Call `abort()` on client disconnect or to cancel.
 * Failed before body: use non-streaming `complete()` for retry-capable fallback.
 */
export type LlmStreamInitResult =
  | { ok: true; abort: () => void; events: AsyncGenerator<LlmUpstreamStreamEvent, void, undefined> }
  | { ok: false; failure: LlmChatCompletionResult };

export type LlmStreamOpenFn = (
  params: LlmChatCompletionParams,
  options?: LlmStreamOptions
) => Promise<LlmStreamInitResult>;
