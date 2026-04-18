/**
 * POST /api/assistant/message — auth + LLM wrapper + context assembly (fetch mocked; no real Anthropic call).
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

describe('POST /api/assistant/message', () => {
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
    const seed = await seedTestDropzone(app.prisma, 'assistant-msg');
    dropzoneId = seed.dropzoneId;

    const email = `assistant-msg-${Date.now()}@skylara.test`;
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

  it('returns assistant text when Claude API succeeds (mocked fetch)', async () => {
    globalThis.fetch = vi.fn(async () =>
      ({
        ok: true,
        status: 200,
        headers: { get: (n: string) => (n === 'request-id' ? 'req-int' : null) },
        json: async () => ({ content: [{ type: 'text', text: 'Integration LLM reply' }] }),
      }) as Response
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/assistant/message',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { message: 'What is manifest?' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.response).toBe('Integration LLM reply');
    expect(body.conversationId).toBeDefined();
    expect(globalThis.fetch).toHaveBeenCalled();
    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('https://api.anthropic.com/v1/messages');
    const reqBody = JSON.parse(call[1].body as string);
    expect(reqBody.system).toContain('SkyLara');
    expect(reqBody.messages?.length).toBeGreaterThanOrEqual(1);
  });

  it('returns 401 without Authorization header', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/assistant/message',
      payload: { message: 'Hi' },
    });
    expect(res.statusCode).toBe(401);
  });
});
