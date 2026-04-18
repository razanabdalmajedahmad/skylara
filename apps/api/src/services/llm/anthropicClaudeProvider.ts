/**
 * Anthropic Messages API — single server-side boundary for Claude HTTP calls.
 * Retries: timeout, network throws, 429, selected 5xx — centralized here.
 */

import type {
  LlmChatProvider,
  LlmChatCompletionParams,
  LlmChatCompletionResult,
  LlmCompletionOptions,
  LlmFailureCategory,
} from './types';
import { categoryToOutcome, httpStatusToFailureCategory } from './types';
import type { LlmStreamInitResult, LlmStreamOptions, LlmUpstreamStreamEvent } from './llmStreamTypes';
import { parseAnthropicSseToEvents, anthropicStreamHttpFailure } from './anthropicSseParser';
import { buildSafeLlmLog, assertNoForbiddenLogKeys } from './llmStructuredLog';
import { computeRetryDelayMs, isRetryableHttpStatus, sleepMs } from './llmRetryPolicy';

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';

function isAbortError(err: unknown): boolean {
  if (err instanceof Error && err.name === 'AbortError') return true;
  if (typeof err === 'object' && err !== null && 'name' in err && (err as { name: string }).name === 'AbortError') {
    return true;
  }
  return false;
}

function emitLog(
  options: LlmCompletionOptions | undefined,
  level: 'warn' | 'error' | 'info',
  payload: Record<string, unknown>
): void {
  assertNoForbiddenLogKeys(payload);
  const fn = level === 'info' ? options?.log?.info : level === 'warn' ? options?.log?.warn : options?.log?.error;
  fn?.(payload);
}

function emitStreamLog(
  options: LlmStreamOptions | undefined,
  level: 'warn' | 'error' | 'info',
  payload: Record<string, unknown>
): void {
  assertNoForbiddenLogKeys(payload);
  const fn = level === 'info' ? options?.log?.info : level === 'warn' ? options?.log?.warn : options?.log?.error;
  fn?.(payload);
}

type AttemptResult =
  | { kind: 'success'; text: string; requestId: string | null; attemptMs: number }
  | { kind: 'parse_fail'; attemptMs: number; requestId: string | null }
  | {
      kind: 'http_fail';
      status: number;
      category: LlmFailureCategory;
      retryable: boolean;
      requestId: string | null;
      attemptMs: number;
    }
  | { kind: 'timeout'; attemptMs: number }
  | { kind: 'network'; errorName: string; attemptMs: number };

export interface AnthropicClaudeProviderConfig {
  getApiKey: () => string | undefined;
  model: string;
  maxTokens: number;
  timeoutMs: number;
  anthropicVersion: string;
  /** Max extra attempts after the first (default 2 → up to 3 HTTP calls). */
  maxRetries?: number;
  retryBaseDelayMs?: number;
  retryMaxDelayMs?: number;
}

async function runSingleAnthropicAttempt(
  config: AnthropicClaudeProviderConfig,
  apiKey: string,
  params: LlmChatCompletionParams
): Promise<AttemptResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': config.anthropicVersion,
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        system: params.system,
        messages: params.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
      signal: controller.signal,
    });

    const attemptMs = Date.now() - started;
    const requestId = response.headers.get('request-id') ?? response.headers.get('anthropic-ratelimit-request-id');

    if (!response.ok) {
      const category = httpStatusToFailureCategory(response.status);
      const retryable = isRetryableHttpStatus(response.status);
      return { kind: 'http_fail', status: response.status, category, retryable, requestId, attemptMs };
    }

    let data: { content?: Array<{ type?: string; text?: string }> };
    try {
      data = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
    } catch {
      return { kind: 'parse_fail', attemptMs, requestId };
    }

    const text = data.content?.[0]?.text ?? null;
    if (!text) {
      return { kind: 'parse_fail', attemptMs, requestId };
    }

    return { kind: 'success', text, requestId, attemptMs };
  } catch (err: unknown) {
    const attemptMs = Date.now() - started;
    if (isAbortError(err)) {
      return { kind: 'timeout', attemptMs };
    }
    return {
      kind: 'network',
      errorName: err instanceof Error ? err.name : 'unknown',
      attemptMs,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function attemptIsRetryable(r: AttemptResult): boolean {
  if (r.kind === 'http_fail') return r.retryable;
  if (r.kind === 'timeout' || r.kind === 'network') return true;
  return false;
}

function attemptToFailureParts(r: AttemptResult): {
  category: LlmFailureCategory;
  httpStatus?: number;
  outcome: LlmChatCompletionResult['outcome'];
} {
  if (r.kind === 'success') {
    return { category: 'none', outcome: 'success' };
  }
  if (r.kind === 'parse_fail') {
    return { category: 'parse_error', outcome: 'parse_error' };
  }
  if (r.kind === 'http_fail') {
    return { category: r.category, httpStatus: r.status, outcome: categoryToOutcome(r.category) };
  }
  if (r.kind === 'timeout') {
    return { category: 'timeout', outcome: 'timeout' };
  }
  return { category: 'network_transient', outcome: 'network_error' };
}

export function createAnthropicClaudeProvider(config: AnthropicClaudeProviderConfig): LlmChatProvider {
  const maxRetries = config.maxRetries ?? 2;
  const retryBase = config.retryBaseDelayMs ?? 250;
  const retryMax = config.retryMaxDelayMs ?? 4000;

  return {
    providerId: 'anthropic-claude-messages',

    async openCompletionStream(
      params: LlmChatCompletionParams,
      options?: LlmStreamOptions
    ): Promise<LlmStreamInitResult> {
      const apiKey = config.getApiKey();
      if (!apiKey) {
        return {
          ok: false,
          failure: {
            text: null,
            outcome: 'missing_api_key',
            failureCategory: 'missing_api_key',
          },
        };
      }

      const readAbort = new AbortController();
      const onParentAbort = () => readAbort.abort();
      if (options?.signal) {
        if (options.signal.aborted) readAbort.abort();
        else options.signal.addEventListener('abort', onParentAbort, { once: true });
      }

      const headerController = new AbortController();
      const headerTimeout = setTimeout(() => {
        headerController.abort();
        readAbort.abort();
      }, config.timeoutMs);

      try {
        const response = await fetch(ANTHROPIC_MESSAGES_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': config.anthropicVersion,
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: config.maxTokens,
            stream: true,
            system: params.system,
            messages: params.messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
          signal: headerController.signal,
        });

        clearTimeout(headerTimeout);

        const requestId =
          response.headers.get('request-id') ?? response.headers.get('anthropic-ratelimit-request-id');

        if (!response.ok) {
          await response.arrayBuffer().catch(() => {});
          const f = anthropicStreamHttpFailure(response.status);
          emitStreamLog(options, 'warn', buildSafeLlmLog({
            event: 'llm.stream.fallback',
            provider: 'anthropic',
            stream: 'anthropic_sse',
            requestId,
            outcome: f.outcome,
            failureCategory: f.failureCategory,
            httpStatus: f.httpStatus,
            fallbackReason: 'open_failed',
          }));
          return {
            ok: false,
            failure: {
              text: null,
              httpStatus: f.httpStatus,
              outcome: f.outcome,
              failureCategory: f.failureCategory,
              attemptsUsed: 1,
            },
          };
        }

        const ct = response.headers.get('content-type') ?? '';
        emitStreamLog(options, 'info', buildSafeLlmLog({
          event: 'llm.stream.open',
          provider: 'anthropic',
          stream: 'anthropic_sse',
          requestId,
          contentTypeUnexpected: Boolean(ct && !ct.includes('event-stream')),
        }));

        async function* events(): AsyncGenerator<LlmUpstreamStreamEvent, void, undefined> {
          try {
            for await (const ev of parseAnthropicSseToEvents(response.body, readAbort.signal)) {
              yield ev;
            }
          } finally {
            options?.signal?.removeEventListener('abort', onParentAbort);
          }
        }

        return {
          ok: true,
          abort: () => readAbort.abort(),
          events: events(),
        };
      } catch (err: unknown) {
        clearTimeout(headerTimeout);
        options?.signal?.removeEventListener('abort', onParentAbort);
        if (isAbortError(err)) {
          emitStreamLog(options, 'warn', buildSafeLlmLog({
            event: 'llm.stream.fallback',
            provider: 'anthropic',
            stream: 'anthropic_sse',
            outcome: 'timeout',
            failureCategory: 'timeout',
            fallbackReason: 'open_failed',
          }));
          return {
            ok: false,
            failure: {
              text: null,
              outcome: 'timeout',
              failureCategory: 'timeout',
              attemptsUsed: 1,
            },
          };
        }
        emitStreamLog(options, 'error', buildSafeLlmLog({
          event: 'llm.stream.fallback',
          provider: 'anthropic',
          stream: 'anthropic_sse',
          outcome: 'network_error',
          failureCategory: 'network_transient',
          errorName: err instanceof Error ? err.name : 'unknown',
          fallbackReason: 'open_failed',
        }));
        return {
          ok: false,
          failure: {
            text: null,
            outcome: 'network_error',
            failureCategory: 'network_transient',
            attemptsUsed: 1,
          },
        };
      }
    },

    async complete(
      params: LlmChatCompletionParams,
      options?: LlmCompletionOptions
    ): Promise<LlmChatCompletionResult> {
      const apiKey = config.getApiKey();
      if (!apiKey) {
        return {
          text: null,
          outcome: 'missing_api_key',
          failureCategory: 'missing_api_key',
        };
      }

      const wallStarted = Date.now();

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const ar = await runSingleAnthropicAttempt(config, apiKey, params);

        if (ar.kind === 'success') {
          const durationMs = Date.now() - wallStarted;
          emitLog(options, 'info', buildSafeLlmLog({
            event: 'llm.completion',
            provider: 'anthropic',
            durationMs,
            outcome: 'success',
            hasText: true,
            requestId: ar.requestId,
            attemptsUsed: attempt + 1,
            failureCategory: 'none',
          }));
          return {
            text: ar.text,
            outcome: 'success',
            attemptsUsed: attempt + 1,
            failureCategory: 'none',
          };
        }

        const { category, httpStatus, outcome } = attemptToFailureParts(ar);
        const willRetry = attemptIsRetryable(ar) && attempt < maxRetries;

        emitLog(options, 'warn', buildSafeLlmLog({
          event: 'llm.completion.attempt',
          provider: 'anthropic',
          attemptIndex: attempt,
          attemptDurationMs: ar.attemptMs,
          willRetry,
          failureCategory: category,
          httpStatus: ar.kind === 'http_fail' ? ar.status : undefined,
          requestId: ar.kind === 'http_fail' || ar.kind === 'parse_fail' ? ar.requestId : null,
          errorName: ar.kind === 'network' ? ar.errorName : undefined,
        }));

        if (!willRetry) {
          const durationMs = Date.now() - wallStarted;
          const level = outcome === 'network_error' ? 'error' : 'warn';
          emitLog(options, level, buildSafeLlmLog({
            event: 'llm.completion',
            provider: 'anthropic',
            durationMs,
            outcome,
            httpStatus,
            hasText: false,
            requestId: ar.kind === 'http_fail' || ar.kind === 'parse_fail' ? ar.requestId : null,
            attemptsUsed: attempt + 1,
            failureCategory: category,
            errorName: ar.kind === 'network' ? ar.errorName : undefined,
          }));
          return {
            text: null,
            httpStatus,
            outcome,
            attemptsUsed: attempt + 1,
            failureCategory: category,
          };
        }

        const delay = computeRetryDelayMs(attempt, retryBase, retryMax);
        await sleepMs(delay);
      }

      /* loop always returns — satisfies TypeScript */
      return { text: null, outcome: 'network_error', failureCategory: 'network_transient' };
    },
  };
}
