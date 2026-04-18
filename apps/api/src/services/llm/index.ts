export type {
  LlmChatMessage,
  LlmChatCompletionParams,
  LlmChatCompletionResult,
  LlmChatProvider,
  LlmCompletionOptions,
  LlmCompletionOutcome,
  LlmFailureCategory,
} from './types';

export type {
  LlmStreamInitResult,
  LlmStreamOptions,
  LlmUpstreamStreamEvent,
} from './llmStreamTypes';

export { categoryToOutcome, httpStatusToFailureCategory } from './types';

export {
  createAnthropicClaudeProvider,
  type AnthropicClaudeProviderConfig,
} from './anthropicClaudeProvider';

import { getEnv } from '../../utils/env';
import { createAnthropicClaudeProvider } from './anthropicClaudeProvider';
import type { LlmChatProvider } from './types';

let cachedAnthropicProvider: LlmChatProvider | null = null;

/** Test-only: clear cached provider so env / fetch mocks take effect. */
export function resetDefaultLlmChatProviderCache(): void {
  cachedAnthropicProvider = null;
}

/**
 * Default Claude (Anthropic Messages) provider for the modular monolith.
 * Config from env: ANTHROPIC_API_KEY (optional), ANTHROPIC_MODEL, ANTHROPIC_MAX_TOKENS, ANTHROPIC_TIMEOUT_MS.
 */
export function getDefaultLlmChatProvider(): LlmChatProvider {
  if (cachedAnthropicProvider) {
    return cachedAnthropicProvider;
  }

  const env = getEnv();
  const model =
    env.ANTHROPIC_MODEL ?? process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514';
  const maxTokens = env.ANTHROPIC_MAX_TOKENS ?? 1024;
  const assistantOutputCap = env.ASSISTANT_OUTPUT_MAX_TOKENS;
  const effectiveMaxTokens =
    assistantOutputCap && Number.isFinite(assistantOutputCap)
      ? Math.min(maxTokens, assistantOutputCap)
      : maxTokens;
  const timeoutMs = env.ANTHROPIC_TIMEOUT_MS ?? 60_000;
  const anthropicVersion =
    env.ANTHROPIC_API_VERSION ?? process.env.ANTHROPIC_API_VERSION ?? '2023-06-01';

  cachedAnthropicProvider = createAnthropicClaudeProvider({
    getApiKey: () => env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY,
    model,
    maxTokens: effectiveMaxTokens,
    timeoutMs,
    anthropicVersion,
    maxRetries: env.ANTHROPIC_MAX_RETRIES ?? 2,
    retryBaseDelayMs: env.ANTHROPIC_RETRY_BASE_MS ?? 250,
    retryMaxDelayMs: env.ANTHROPIC_RETRY_MAX_DELAY_MS ?? 4000,
  });

  return cachedAnthropicProvider;
}
