import { describe, it, expect } from 'vitest';
import { assertNoForbiddenLogKeys, buildSafeLlmCompletionLog } from '../services/llm/llmStructuredLog';

describe('llmStructuredLog', () => {
  it('buildSafeLlmCompletionLog produces keys safe for assertNoForbiddenLogKeys', () => {
    const o = buildSafeLlmCompletionLog({
      event: 'llm.completion',
      provider: 'anthropic',
      durationMs: 12,
      outcome: 'success',
      hasText: true,
      requestId: 'rid',
      attemptsUsed: 2,
      failureCategory: 'none',
    });
    expect(() => assertNoForbiddenLogKeys(o)).not.toThrow();
  });

  it('allows llm.completion.attempt metadata without forbidden keys', () => {
    const o = buildSafeLlmCompletionLog({
      event: 'llm.completion.attempt',
      provider: 'anthropic',
      attemptIndex: 0,
      attemptDurationMs: 40,
      willRetry: true,
      failureCategory: 'rate_limited',
      httpStatus: 429,
      requestId: 'r1',
    });
    expect(() => assertNoForbiddenLogKeys(o)).not.toThrow();
  });

  it('allows llm.stream.* metadata without forbidden keys', () => {
    const o = buildSafeLlmCompletionLog({
      event: 'llm.stream.open',
      provider: 'anthropic',
      stream: 'anthropic_sse',
      requestId: 'r2',
      contentTypeUnexpected: false,
    });
    expect(() => assertNoForbiddenLogKeys(o)).not.toThrow();
  });

  it('assertNoForbiddenLogKeys throws on forbidden keys', () => {
    expect(() => assertNoForbiddenLogKeys({ messages: [] })).toThrow(/forbidden log key/);
    expect(() => assertNoForbiddenLogKeys({ content: 'x' })).toThrow();
  });
});
