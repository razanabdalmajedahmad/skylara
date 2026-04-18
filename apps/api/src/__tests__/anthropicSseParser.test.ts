import { describe, it, expect } from 'vitest';
import { parseAnthropicSseToEvents } from '../services/llm/anthropicSseParser';

function makeSseStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) {
        controller.enqueue(encoder.encode(c));
      }
      controller.close();
    },
  });
}

describe('parseAnthropicSseToEvents', () => {
  it('yields text deltas then end for message_stop', async () => {
    const ac = new AbortController();
    const stream = makeSseStream([
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hi"}}\n\n',
      'data: {"type":"message_stop"}\n\n',
    ]);
    const out: unknown[] = [];
    for await (const ev of parseAnthropicSseToEvents(stream, ac.signal)) {
      out.push(ev);
    }
    expect(out).toEqual([
      { kind: 'delta', text: 'Hi' },
      { kind: 'end', requestId: null },
    ]);
  });

  it('yields error for SSE error event', async () => {
    const ac = new AbortController();
    const stream = makeSseStream([
      'data: {"type":"error","error":{"type":"rate_limit_error","message":"x"}}\n\n',
    ]);
    const out: unknown[] = [];
    for await (const ev of parseAnthropicSseToEvents(stream, ac.signal)) {
      out.push(ev);
    }
    expect(out).toHaveLength(1);
    expect((out[0] as { kind: string }).kind).toBe('error');
  });

  it('normalizes CRLF in SSE blocks', async () => {
    const ac = new AbortController();
    const stream = makeSseStream([
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"A"}}\r\n\r\n',
    ]);
    const out: unknown[] = [];
    for await (const ev of parseAnthropicSseToEvents(stream, ac.signal)) {
      out.push(ev);
    }
    expect(out.some((e) => (e as { kind: string }).kind === 'delta')).toBe(true);
  });
});
