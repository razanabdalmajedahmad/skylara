/**
 * LLM provider contracts — modular monolith boundary.
 * Future: additional providers implement the same chat completion shape; Redis may cache idempotent completions (not implemented here).
 */

export type LlmChatRole = 'user' | 'assistant';

export interface LlmChatMessage {
  role: LlmChatRole;
  content: string;
}

export interface LlmChatCompletionParams {
  system: string;
  messages: LlmChatMessage[];
}

/** Route-stable outcome (backward compatible with /assistant/message). */
export type LlmCompletionOutcome =
  | 'success'
  | 'missing_api_key'
  | 'timeout'
  | 'http_error'
  | 'parse_error'
  | 'network_error';

/**
 * Finer-grained classification for logs/metrics — maps to `LlmCompletionOutcome` via `categoryToOutcome`.
 */
export type LlmFailureCategory =
  | 'none'
  | 'missing_api_key'
  | 'auth_or_forbidden'
  | 'rate_limited'
  | 'server_error_transient'
  | 'client_error'
  | 'timeout'
  | 'network_transient'
  | 'parse_error';

export function categoryToOutcome(category: LlmFailureCategory): LlmCompletionOutcome {
  switch (category) {
    case 'none':
      return 'success';
    case 'missing_api_key':
      return 'missing_api_key';
    case 'timeout':
      return 'timeout';
    case 'parse_error':
      return 'parse_error';
    case 'rate_limited':
    case 'server_error_transient':
    case 'auth_or_forbidden':
    case 'client_error':
      return 'http_error';
    case 'network_transient':
      return 'network_error';
    default:
      return 'network_error';
  }
}

export function httpStatusToFailureCategory(status: number): LlmFailureCategory {
  if (status === 401 || status === 403) return 'auth_or_forbidden';
  if (status === 429) return 'rate_limited';
  if (status === 500 || status === 502 || status === 503 || status === 504) return 'server_error_transient';
  if (status >= 400 && status < 500) return 'client_error';
  if (status >= 500) return 'server_error_transient';
  return 'client_error';
}

export interface LlmChatCompletionResult {
  /** Assistant text, or null when the caller should use local fallback (no key, timeout, HTTP error). */
  text: string | null;
  /** Set when the HTTP layer failed (for metrics; never contains secrets). */
  httpStatus?: number;
  /** Stable machine-readable reason for null text (e.g. missing_api_key, timeout, http_error). */
  outcome: LlmCompletionOutcome;
  /** Total HTTP attempts including retries (Phase 4). */
  attemptsUsed?: number;
  /** Normalized failure bucket when text is null (Phase 4). */
  failureCategory?: LlmFailureCategory;
}

/**
 * Pluggable chat completion (Anthropic today). Extension point for multi-provider routing.
 */
export interface LlmChatProvider {
  readonly providerId: string;
  complete(
    params: LlmChatCompletionParams,
    options?: LlmCompletionOptions
  ): Promise<LlmChatCompletionResult>;
  /**
   * Phase 5 — optional streaming (SSE upstream). When absent, routes should use `complete()` only.
   * Implementations typically do not retry the initial stream request; callers fall back to `complete()` for retries.
   */
  openCompletionStream?: (
    params: LlmChatCompletionParams,
    options?: import('./llmStreamTypes').LlmStreamOptions
  ) => Promise<import('./llmStreamTypes').LlmStreamInitResult>;
}

export interface LlmCompletionOptions {
  /** Structured log only — must not log message bodies or secrets. */
  log?: {
    warn: (obj: Record<string, unknown>) => void;
    error: (obj: Record<string, unknown>) => void;
    info?: (obj: Record<string, unknown>) => void;
  };
}
