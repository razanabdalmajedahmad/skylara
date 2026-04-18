/**
 * POST /api/assistant/message/stream — SSE + stream/fallback paths (fetch mocked).
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fastifyJwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import prismaPlugin from '../plugins/prisma';
import authPlugin from '../plugins/auth';
import websocketPlugin from '../plugins/websocket';
import notificationsPlugin from '../plugins/notifications';
import { AppError } from '../utils/errors';
import { generateTokenPair } from '../utils/jwt';
import { resetEnvCacheForTests } from '../utils/env';
import { resetDefaultLlmChatProviderCache } from '../services/llm';
import { cleanupTestData, seedTestDropzone } from './setup';
import { authRoutes } from '../routes/auth';
import { assistantAdvancedRoutes } from '../routes/assistantAdvanced';

const originalFetch = globalThis.fetch;

async function buildAssistantApiApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false, bodyLimit: 1_048_576 });

  await fastify.register(helmet, { contentSecurityPolicy: false });
  await fastify.register(cors, { origin: '*', credentials: true });
  await fastify.register(rateLimit, {
    max: 5000,
    timeWindow: '1 minute',
    allowList: ['127.0.0.1'],
  });
  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'test-secret-minimum-thirty-two-characters-long!!',
    sign: { algorithm: 'HS256' },
  });

  await fastify.register(prismaPlugin);
  await fastify.register(authPlugin);
  await fastify.register(websocketPlugin);
  await fastify.register(notificationsPlugin);

  await fastify.register(
    async function apiRoutes(api) {
      await api.register(authRoutes);
      await api.register(assistantAdvancedRoutes);
    },
    { prefix: '/api' }
  );

  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.code(error.statusCode).send({ success: false, error: error.message, code: error.code });
    } else if (error.statusCode === 429) {
      reply.code(429).send({ success: false, error: 'Too many requests.' });
    } else if (error.statusCode === 400) {
      reply.code(400).send({ success: false, error: 'Validation failed', details: error.message });
    } else {
      reply.code(500).send({ success: false, error: 'Internal server error' });
    }
  });

  await fastify.ready();
  return fastify;
}

describe('POST /api/assistant/message/stream', () => {
  let app: FastifyInstance;
  let userToken: string;
  let userId: number;
  let dropzoneId: number;

  beforeAll(async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-integration-test-key';
    process.env.ANTHROPIC_TIMEOUT_MS = '60000';
    resetEnvCacheForTests();
    resetDefaultLlmChatProviderCache();

    app = await buildAssistantApiApp();
    const seed = await seedTestDropzone(app.prisma, 'assistant-sse');
    dropzoneId = seed.dropzoneId;

    const email = `assistant-sse-${Date.now()}@skylara.test`;
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email, password: 'Test@1234!Secure', firstName: 'A', lastName: 'B' },
    });
    const regBody = regRes.json();
    userId = regBody.data?.user?.id ?? 1;

    const { accessToken } = generateTokenPair({
      sub: String(userId),
      email,
      dropzoneId: String(dropzoneId),
      roles: ['JUMPER'],
    });
    userToken = accessToken;
  }, 60_000);

  afterAll(async () => {
    await cleanupTestData(app.prisma);
    await app.close();
    delete process.env.ANTHROPIC_API_KEY;
    resetEnvCacheForTests();
    resetDefaultLlmChatProviderCache();
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    resetDefaultLlmChatProviderCache();
  });

  it('streams deltas and done when upstream SSE succeeds', async () => {
    const encoder = new TextEncoder();
    const sse =
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Streamed reply"}}\n\n' +
      'data: {"type":"message_stop"}\n\n';

    globalThis.fetch = vi.fn(async (_url, init) => {
      const body = JSON.parse((init as RequestInit).body as string);
      if (body.stream) {
        return {
          ok: true,
          status: 200,
          headers: { get: (n: string) => (n === 'content-type' ? 'text/event-stream' : null) },
          arrayBuffer: async () => new ArrayBuffer(0),
          body: new ReadableStream({
            start(c) {
              c.enqueue(encoder.encode(sse));
              c.close();
            },
          }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({ content: [{ type: 'text', text: 'should not be used' }] }),
      } as Response;
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/assistant/message/stream',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { message: 'Hello SSE' },
    });

    expect(res.statusCode).toBe(200);
    expect(String(res.headers['content-type'] || '')).toMatch(/text\/event-stream/);
    expect(res.payload).toContain('event: delta');
    expect(res.payload).toContain('Streamed reply');
    expect(res.payload).toContain('event: done');
    expect(res.payload).toContain('"streamFallback":false');
  });

  it('falls back to non-streaming complete when stream open fails', async () => {
    globalThis.fetch = vi.fn(async (_url, init) => {
      const body = JSON.parse((init as RequestInit).body as string);
      if (body.stream) {
        return {
          ok: false,
          status: 401,
          headers: { get: () => null },
          arrayBuffer: async () => new ArrayBuffer(0),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({ content: [{ type: 'text', text: 'Fallback complete body' }] }),
      } as Response;
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/assistant/message/stream',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { message: 'Fallback path' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.payload).toContain('Fallback complete body');
    expect(res.payload).toContain('event: done');
    expect(res.payload).toContain('"streamFallback":true');
  });

  it('runs JSON-only mode when streaming is disabled by env', async () => {
    process.env.ASSISTANT_STREAMING_ENABLED = 'false';
    resetEnvCacheForTests();
    resetDefaultLlmChatProviderCache();

    globalThis.fetch = vi.fn(async (_url, init) => {
      const body = JSON.parse((init as RequestInit).body as string);
      // When streaming is disabled, provider stream should not be attempted.
      if (body.stream) {
        throw new Error('streaming request should not be made');
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({ content: [{ type: 'text', text: 'JSON-only mode response' }] }),
      } as Response;
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/assistant/message/stream',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { message: 'Hello rollout' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.payload).toContain('JSON-only mode response');
    expect(res.payload).toContain('"streamFallback":true');

    delete process.env.ASSISTANT_STREAMING_ENABLED;
    resetEnvCacheForTests();
    resetDefaultLlmChatProviderCache();
  });
});
