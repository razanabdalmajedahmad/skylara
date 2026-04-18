/**
 * Parse Anthropic Messages API SSE (`stream: true`) into normalized upstream events.
 * @see https://docs.anthropic.com/en/api/messages-streaming
 */

import type { LlmUpstreamStreamEvent } from './llmStreamTypes';
import type { LlmCompletionOutcome, LlmFailureCategory } from './types';
import { categoryToOutcome, httpStatusToFailureCategory } from './types';

type AnthropicSseJson = {
  type?: string;
  error?: { type?: string; message?: string };
  delta?: { type?: string; text?: string };
  message?: { id?: string };
};

function parseSseBlocks(buffer: string): { blocks: string[]; rest: string } {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const parts = normalized.split(/\n\n/);
  const rest = parts.pop() ?? '';
  return { blocks: parts, rest };
}

function extractDataJson(block: string): AnthropicSseJson | null {
  const lines = block.split('\n');
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }
  if (dataLines.length === 0) return null;
  const joined = dataLines.join('\n');
  if (joined === '[DONE]') return null;
  try {
    return JSON.parse(joined) as AnthropicSseJson;
  } catch {
    return null;
  }
}

function jsonToStreamEvent(data: AnthropicSseJson): LlmUpstreamStreamEvent | null {
  const t = data.type;
  if (t === 'error' && data.error) {
    return {
      kind: 'error',
      outcome: 'http_error',
      failureCategory: 'client_error',
      providerErrorType: typeof data.error.type === 'string' ? data.error.type : undefined,
    };
  }
  if (t === 'content_block_delta' && data.delta?.type === 'text_delta' && typeof data.delta.text === 'string') {
    return { kind: 'delta', text: data.delta.text };
  }
  if (t === 'message_stop') {
    return { kind: 'end', requestId: null };
  }
  return null;
}

/**
 * Read Anthropic SSE from a fetch response body; yields deltas and a terminal `end` or `error`.
 */
export async function* parseAnthropicSseToEvents(
  body: ReadableStream<Uint8Array> | null,
  signal: AbortSignal
): AsyncGenerator<LlmUpstreamStreamEvent, void, undefined> {
  if (!body) {
    yield {
      kind: 'error',
      outcome: 'parse_error',
      failureCategory: 'parse_error',
    };
    return;
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sawEnd = false;

  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { blocks, rest } = parseSseBlocks(buffer);
      buffer = rest;

      for (const block of blocks) {
        const data = extractDataJson(block);
        if (!data) continue;
        const ev = jsonToStreamEvent(data);
        if (!ev) continue;
        if (ev.kind === 'end') {
          sawEnd = true;
        }
        yield ev;
        if (ev.kind === 'error') {
          await reader.cancel().catch(() => {});
          return;
        }
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      const { blocks } = parseSseBlocks(buffer + '\n\n');
      for (const block of blocks) {
        const data = extractDataJson(block);
        if (!data) continue;
        const ev = jsonToStreamEvent(data);
        if (!ev) continue;
        if (ev.kind === 'end') sawEnd = true;
        yield ev;
        if (ev.kind === 'error') {
          await reader.cancel().catch(() => {});
          return;
        }
      }
    }

    if (signal.aborted) {
      yield { kind: 'error', outcome: 'timeout', failureCategory: 'timeout' };
      return;
    }

    if (!sawEnd) {
      yield { kind: 'end', requestId: null };
    }
  } catch (err: unknown) {
    if (signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
      yield { kind: 'error', outcome: 'timeout', failureCategory: 'timeout' };
      return;
    }
    yield {
      kind: 'error',
      outcome: 'network_error',
      failureCategory: 'network_transient',
    };
  } finally {
    await reader.cancel().catch(() => {});
  }
}

/** Map a failed streaming HTTP response to a completion-shaped failure (no retries here). */
export function anthropicStreamHttpFailure(status: number): {
  outcome: LlmCompletionOutcome;
  failureCategory: LlmFailureCategory;
  httpStatus: number;
} {
  const failureCategory = httpStatusToFailureCategory(status);
  return {
    httpStatus: status,
    failureCategory,
    outcome: categoryToOutcome(failureCategory),
  };
}
