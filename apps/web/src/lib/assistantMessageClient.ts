/**
 * Portal assistant: Claude + KB via POST /assistant/message/stream (SSE) with JSON fallback.
 * Mobile and other clients can reuse this module (no UI).
 */

import { API_BASE_URL } from './constants';
import { getAuthToken } from './api';

/** Compatible with `ActionLink` in `useAssistant` (no circular import). */
export type AssistantActionLink = { label: string; route: string; icon?: string };

export type AssistantMessageBody = {
  message: string;
  conversationId?: string;
  context?: { currentRoute?: string; currentPage?: string };
};

export type AssistantMessageSource = {
  type: string;
  title: string;
  route?: string;
};

export type AssistantMessageDonePayload = {
  conversationId: string;
  sources: AssistantMessageSource[];
  usedLlmText?: boolean;
  streamFallback?: boolean;
};

export type AssistantMessageStreamResult =
  | {
      ok: true;
      response: string;
      sources: AssistantMessageSource[];
      conversationId: string;
      streamFallback: boolean;
    }
  | { ok: false; reason: 'http' | 'parse' | 'no_done' | 'aborted' };

/** Exported for unit tests — parses one SSE block (after CRLF normalization). */
export function parseAssistantSseBlock(block: string): { event: string; data: Record<string, unknown> } | null {
  const lines = block.replace(/\r\n/g, '\n').split('\n');
  let eventName = '';
  const dataParts: string[] = [];
  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataParts.push(line.slice(5).trimStart());
    }
  }
  if (!eventName || dataParts.length === 0) return null;
  try {
    const data = JSON.parse(dataParts.join('\n')) as Record<string, unknown>;
    return { event: eventName, data };
  } catch {
    return null;
  }
}

function splitSseBlocks(buffer: string): { blocks: string[]; rest: string } {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const parts = normalized.split('\n\n');
  const rest = parts.pop() ?? '';
  return { blocks: parts, rest };
}

export function sourcesToActionLinks(sources: AssistantMessageSource[]): AssistantActionLink[] {
  return sources.map((s) => ({
    label: s.title,
    route: s.route && s.route.startsWith('/') ? s.route : `/dashboard/help`,
  }));
}

export type StreamDeltaCallback = (accumulatedText: string) => void;

/**
 * POST /assistant/message/stream — consumes SSE until `done` or `error`.
 * Does not log prompts or secrets.
 */
export async function postAssistantMessageStream(
  body: AssistantMessageBody,
  options: {
    signal: AbortSignal;
    onDelta?: StreamDeltaCallback;
  }
): Promise<AssistantMessageStreamResult> {
  if (options.signal.aborted) {
    return { ok: false, reason: 'aborted' };
  }

  const token = getAuthToken();
  if (!token) {
    return { ok: false, reason: 'http' };
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/assistant/message/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: options.signal,
    });
  } catch {
    return { ok: false, reason: 'http' };
  }

  if (!res.ok || !res.body) {
    return { ok: false, reason: 'http' };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';
  const doneBox: { payload: AssistantMessageDonePayload | null } = { payload: null };

  const applySseBlocks = (blocks: string[]): boolean => {
    for (const block of blocks) {
      const parsed = parseAssistantSseBlock(block);
      if (!parsed) continue;

      if (parsed.event === 'delta') {
        const c = typeof parsed.data.c === 'string' ? parsed.data.c : '';
        accumulated += c;
        options.onDelta?.(accumulated);
      } else if (parsed.event === 'replace') {
        accumulated = '';
        options.onDelta?.('');
      } else if (parsed.event === 'done') {
        const conversationId = typeof parsed.data.conversationId === 'string' ? parsed.data.conversationId : '';
        const sources = Array.isArray(parsed.data.sources) ? (parsed.data.sources as AssistantMessageSource[]) : [];
        doneBox.payload = {
          conversationId,
          sources,
          usedLlmText: Boolean(parsed.data.usedLlmText),
          streamFallback: Boolean(parsed.data.streamFallback),
        };
      } else if (parsed.event === 'error') {
        return false;
      }
    }
    return true;
  };

  try {
    while (!options.signal.aborted) {
      const { value, done: streamDone } = await reader.read();
      if (streamDone) break;
      buffer += decoder.decode(value, { stream: true });
      const { blocks, rest } = splitSseBlocks(buffer);
      buffer = rest;

      if (!applySseBlocks(blocks)) {
        await reader.cancel().catch(() => {});
        return { ok: false, reason: 'parse' };
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      const { blocks } = splitSseBlocks(buffer + '\n\n');
      if (!applySseBlocks(blocks)) {
        await reader.cancel().catch(() => {});
        return { ok: false, reason: 'parse' };
      }
    }
  } catch {
    if (options.signal.aborted) {
      await reader.cancel().catch(() => {});
      return { ok: false, reason: 'aborted' };
    }
    await reader.cancel().catch(() => {});
    return { ok: false, reason: 'http' };
  } finally {
    await reader.cancel().catch(() => {});
  }

  if (options.signal.aborted) {
    return { ok: false, reason: 'aborted' };
  }

  const completed = doneBox.payload;
  if (!completed?.conversationId) {
    return { ok: false, reason: 'no_done' };
  }

  return {
    ok: true,
    response: accumulated,
    sources: completed.sources,
    conversationId: completed.conversationId,
    streamFallback: Boolean(completed.streamFallback),
  };
}
