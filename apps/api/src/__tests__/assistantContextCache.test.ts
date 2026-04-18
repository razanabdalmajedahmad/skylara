import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  NoOpAssistantContextCache,
  RedisAssistantContextCache,
  buildWeatherContextCacheKey,
  buildOpsContextCacheKey,
  utcDayBucket,
  createAssistantContextCache,
} from '../services/ai/assistantContextCache';

describe('assistantContextCache keys', () => {
  it('buildWeatherContextCacheKey is stable', () => {
    expect(buildWeatherContextCacheKey(42)).toBe('skylara:assistant:ctx:v1:weather:dz:42');
  });

  it('buildOpsContextCacheKey includes dz user and day', () => {
    expect(buildOpsContextCacheKey(7, 99, '2026-04-12')).toBe(
      'skylara:assistant:ctx:v1:ops:dz:7:u:99:day:2026-04-12'
    );
    expect(buildOpsContextCacheKey(null, 1, '2026-04-12')).toContain('dz:0');
  });

  it('utcDayBucket returns ISO date prefix', () => {
    expect(utcDayBucket(new Date('2026-06-15T12:00:00.000Z'))).toBe('2026-06-15');
  });
});

describe('NoOpAssistantContextCache', () => {
  it('always misses and ignores set', async () => {
    const c = new NoOpAssistantContextCache();
    await c.set('k', 'v', 60);
    expect(await c.get('k')).toBeNull();
  });
});

describe('RedisAssistantContextCache', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('get returns null on redis error (fallback)', async () => {
    const redis = {
      get: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      set: vi.fn(),
      quit: vi.fn().mockResolvedValue('OK'),
    };
    const c = new RedisAssistantContextCache(redis as any);
    expect(await c.get('x')).toBeNull();
  });

  it('set swallows redis error', async () => {
    const redis = {
      get: vi.fn(),
      set: vi.fn().mockRejectedValue(new Error('boom')),
      quit: vi.fn().mockResolvedValue('OK'),
    };
    const c = new RedisAssistantContextCache(redis as any);
    await expect(c.set('x', 'y', 10)).resolves.toBeUndefined();
  });
});

describe('createAssistantContextCache', () => {
  it('returns no-op when url missing', () => {
    const c = createAssistantContextCache(undefined);
    expect(c).toBeInstanceOf(NoOpAssistantContextCache);
  });
});
