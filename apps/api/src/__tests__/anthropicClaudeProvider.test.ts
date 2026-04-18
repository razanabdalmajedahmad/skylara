import { describe, it, expect, vi, afterEach } from 'vitest';
import { createAnthropicClaudeProvider } from '../services/llm/anthropicClaudeProvider';

vi.mock('../services/llm/llmRetryPolicy', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../services/llm/llmRetryPolicy')>();
  return { ...mod, sleepMs: () => Promise.resolve() };
});

/** Minimal Response.headers for provider (request-id logging). */
function mockHeaders(getImpl?: (name: string) => string | null) {
  return { get: (name: string) => getImpl?.(name) ?? null };
}

describe('createAnthropicClaudeProvider', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns missing_api_key when no API key', async () => {
    const p = createAnthropicClaudeProvider({
      getApiKey: () => undefined,
      model: 'claude-test',
      maxTokens: 100,
      timeoutMs: 5000,
      anthropicVersion: '2023-06-01',
    });
    const r = await p.complete({
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(r.text).toBeNull();
    expect(r.outcome).toBe('missing_api_key');
    expect(r.failureCategory).toBe('missing_api_key');
    expect(r.attemptsUsed).toBeUndefined();
  });

  it('returns text on HTTP 200 with expected JSON shape', async () => {
    globalThis.fetch = vi.fn(async () =>
      ({
        ok: true,
        status: 200,
        headers: mockHeaders((n) => (n === 'request-id' ? 'req-e2e' : null)),
        json: async () => ({ content: [{ text: 'Hello' }] }),
      }) as Response
    );

    const p = createAnthropicClaudeProvider({
      getApiKey: () => 'sk-test',
      model: 'claude-test',
      maxTokens: 100,
      timeoutMs: 5000,
      anthropicVersion: '2023-06-01',
    });
    const r = await p.complete({
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(r.text).toBe('Hello');
    expect(r.outcome).toBe('success');
    expect(r.attemptsUsed).toBe(1);
    expect(r.failureCategory).toBe('none');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries 429 until exhausted then returns http_error', async () => {
    globalThis.fetch = vi.fn(async () =>
      ({
        ok: false,
        status: 429,
        headers: mockHeaders(),
        json: async () => ({}),
      }) as Response
    );

    const p = createAnthropicClaudeProvider({
      getApiKey: () => 'sk-test',
      model: 'claude-test',
      maxTokens: 100,
      timeoutMs: 5000,
      anthropicVersion: '2023-06-01',
    });
    const r = await p.complete({
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(r.text).toBeNull();
    expect(r.outcome).toBe('http_error');
    expect(r.httpStatus).toBe(429);
    expect(r.failureCategory).toBe('rate_limited');
    expect(r.attemptsUsed).toBe(3);
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('does not retry 429 when maxRetries is 0', async () => {
    globalThis.fetch = vi.fn(async () =>
      ({
        ok: false,
        status: 429,
        headers: mockHeaders(),
        json: async () => ({}),
      }) as Response
    );

    const p = createAnthropicClaudeProvider({
      getApiKey: () => 'sk-test',
      model: 'claude-test',
      maxTokens: 100,
      timeoutMs: 5000,
      anthropicVersion: '2023-06-01',
      maxRetries: 0,
    });
    const r = await p.complete({
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(r.outcome).toBe('http_error');
    expect(r.attemptsUsed).toBe(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('succeeds after retryable 503 then 200', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: mockHeaders(),
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders(),
        json: async () => ({ content: [{ text: 'Recovered' }] }),
      } as Response);

    const p = createAnthropicClaudeProvider({
      getApiKey: () => 'sk-test',
      model: 'claude-test',
      maxTokens: 100,
      timeoutMs: 5000,
      anthropicVersion: '2023-06-01',
    });
    const r = await p.complete({
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(r.text).toBe('Recovered');
    expect(r.outcome).toBe('success');
    expect(r.attemptsUsed).toBe(2);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry 401', async () => {
    globalThis.fetch = vi.fn(async () =>
      ({
        ok: false,
        status: 401,
        headers: mockHeaders(),
        json: async () => ({}),
      }) as Response
    );

    const p = createAnthropicClaudeProvider({
      getApiKey: () => 'sk-test',
      model: 'claude-test',
      maxTokens: 100,
      timeoutMs: 5000,
      anthropicVersion: '2023-06-01',
    });
    const r = await p.complete({
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(r.text).toBeNull();
    expect(r.outcome).toBe('http_error');
    expect(r.failureCategory).toBe('auth_or_forbidden');
    expect(r.attemptsUsed).toBe(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('returns timeout when fetch is aborted (timeoutMs)', async () => {
    globalThis.fetch = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (signal?.aborted) {
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
          return;
        }
        signal?.addEventListener('abort', () => {
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
        });
      });
    });

    const p = createAnthropicClaudeProvider({
      getApiKey: () => 'sk-test',
      model: 'claude-test',
      maxTokens: 100,
      timeoutMs: 30,
      anthropicVersion: '2023-06-01',
      maxRetries: 0,
    });
    const r = await p.complete({
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(r.text).toBeNull();
    expect(r.outcome).toBe('timeout');
  });

  it('returns parse_error when JSON body is invalid', async () => {
    globalThis.fetch = vi.fn(async () =>
      ({
        ok: true,
        status: 200,
        headers: mockHeaders(),
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      }) as Response
    );

    const p = createAnthropicClaudeProvider({
      getApiKey: () => 'sk-test',
      model: 'claude-test',
      maxTokens: 100,
      timeoutMs: 5000,
      anthropicVersion: '2023-06-01',
    });
    const r = await p.complete({
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(r.text).toBeNull();
    expect(r.outcome).toBe('parse_error');
    expect(r.failureCategory).toBe('parse_error');
    expect(r.attemptsUsed).toBe(1);
  });

  it('returns parse_error when content shape has no text', async () => {
    globalThis.fetch = vi.fn(async () =>
      ({
        ok: true,
        status: 200,
        headers: mockHeaders(),
        json: async () => ({ content: [] }),
      }) as Response
    );

    const p = createAnthropicClaudeProvider({
      getApiKey: () => 'sk-test',
      model: 'claude-test',
      maxTokens: 100,
      timeoutMs: 5000,
      anthropicVersion: '2023-06-01',
    });
    const r = await p.complete({
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(r.text).toBeNull();
    expect(r.outcome).toBe('parse_error');
    expect(r.attemptsUsed).toBe(1);
  });

  describe('openCompletionStream', () => {
    it('returns ok false when stream HTTP fails', async () => {
      globalThis.fetch = vi.fn(async () =>
        ({
          ok: false,
          status: 401,
          headers: mockHeaders(),
          arrayBuffer: async () => new ArrayBuffer(0),
        }) as Response
      );

      const p = createAnthropicClaudeProvider({
        getApiKey: () => 'sk-test',
        model: 'claude-test',
        maxTokens: 100,
        timeoutMs: 5000,
        anthropicVersion: '2023-06-01',
      });
      const init = await p.openCompletionStream!(
        { system: 'sys', messages: [{ role: 'user', content: 'hi' }] },
        {}
      );
      expect(init.ok).toBe(false);
      if (!init.ok) {
        expect(init.failure.outcome).toBe('http_error');
        expect(init.failure.failureCategory).toBe('auth_or_forbidden');
      }
    });

    it('returns ok true and yields deltas from SSE body', async () => {
      const encoder = new TextEncoder();
      const sse =
        'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n\n' +
        'data: {"type":"message_stop"}\n\n';

      globalThis.fetch = vi.fn(async (_u, init) => {
        const body = JSON.parse((init as RequestInit).body as string);
        expect(body.stream).toBe(true);
        return {
          ok: true,
          status: 200,
          headers: mockHeaders((n) => (n === 'content-type' ? 'text/event-stream' : null)),
          arrayBuffer: async () => new ArrayBuffer(0),
          body: new ReadableStream({
            start(c) {
              c.enqueue(encoder.encode(sse));
              c.close();
            },
          }),
        } as Response;
      });

      const p = createAnthropicClaudeProvider({
        getApiKey: () => 'sk-test',
        model: 'claude-test',
        maxTokens: 100,
        timeoutMs: 5000,
        anthropicVersion: '2023-06-01',
      });
      const init = await p.openCompletionStream!(
        { system: 'sys', messages: [{ role: 'user', content: 'hi' }] },
        {}
      );
      expect(init.ok).toBe(true);
      if (init.ok) {
        let text = '';
        try {
          for await (const ev of init.events) {
            if (ev.kind === 'delta') text += ev.text;
          }
        } finally {
          init.abort();
        }
        expect(text).toBe('Hello');
      }
    });
  });
});
