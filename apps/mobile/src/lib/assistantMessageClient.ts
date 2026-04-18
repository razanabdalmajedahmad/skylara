/**
 * Mobile assistant client — Phase 8.
 * Uses SSE when supported by the runtime, with JSON fallback via axios API client.
 * Never log prompt bodies or secrets.
 */

import { api } from '@/lib/api';
import * as SecureStore from '@/lib/secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

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
  | { ok: false; reason: 'unsupported' | 'http' | 'parse' | 'no_done' | 'aborted' };

export function parseAssistantSseBlock(block: string): { event: string; data: Record<string, unknown> } | null {
  const lines = block.replace(/\r\n/g, '\n').split('\n');
  let eventName = '';
  const dataParts: string[] = [];
  for (const line of lines) {
    if (line.startsWith('event:')) eventName = line.slice(6).trim();
    else if (line.startsWith('data:')) dataParts.push(line.slice(5).trimStart());
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

/**
 * Streaming request (SSE).
 * Notes:
 * - React Native / Expo runtimes may not expose `response.body.getReader()` — detect and return `unsupported`.
 * - Use JSON fallback in that case.
 */
export async function postAssistantMessageStream(
  body: AssistantMessageBody,
  options: { signal: AbortSignal; onDelta?: (accText: string) => void },
): Promise<AssistantMessageStreamResult> {
  if (options.signal.aborted) return { ok: false, reason: 'aborted' };

  const token = await SecureStore.getItemAsync('access_token');
  if (!token) return { ok: false, reason: 'http' };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/assistant/message/stream`, {
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
    return { ok: false, reason: options.signal.aborted ? 'aborted' : 'http' };
  }

  if (!res.ok) return { ok: false, reason: 'http' };

  const anyBody: any = (res as any).body;
  const reader = anyBody?.getReader?.();
  if (!reader) return { ok: false, reason: 'unsupported' };

  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';
  const doneBox: { payload: AssistantMessageDonePayload | null } = { payload: null };

  const applyBlocks = (blocks: string[]): boolean => {
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
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { blocks, rest } = splitSseBlocks(buffer);
      buffer = rest;
      if (!applyBlocks(blocks)) {
        await reader.cancel?.().catch(() => {});
        return { ok: false, reason: 'parse' };
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      const { blocks } = splitSseBlocks(buffer + '\n\n');
      if (!applyBlocks(blocks)) {
        await reader.cancel?.().catch(() => {});
        return { ok: false, reason: 'parse' };
      }
    }
  } catch {
    if (options.signal.aborted) return { ok: false, reason: 'aborted' };
    return { ok: false, reason: 'http' };
  } finally {
    await reader.cancel?.().catch(() => {});
  }

  if (options.signal.aborted) return { ok: false, reason: 'aborted' };
  const completed = doneBox.payload;
  if (!completed?.conversationId) return { ok: false, reason: 'no_done' };

  return {
    ok: true,
    response: accumulated,
    sources: completed.sources,
    conversationId: completed.conversationId,
    streamFallback: Boolean(completed.streamFallback),
  };
}

export async function postAssistantMessageJson(body: AssistantMessageBody): Promise<{
  response: string;
  sources: AssistantMessageSource[];
  conversationId: string;
}> {
  const { data } = await api.post('/assistant/message', body);
  return {
    response: (data as any)?.response ?? '',
    sources: (data as any)?.sources ?? [],
    conversationId: (data as any)?.conversationId ?? '',
  };
}

