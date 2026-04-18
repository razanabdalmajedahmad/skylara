/**
 * Optional Redis cache for assembled assistant context slices (weather / ops).
 * Correctness does not depend on Redis — misses and connection errors bypass cache.
 */

import Redis from 'ioredis';
import { getEnv } from '../../utils/env';

const KEY_PREFIX = 'skylara:assistant:ctx:v1';

/** Small interface — no Redis types leak to routes. */
export interface AssistantContextCache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

/**
 * Deterministic keys — numeric tenant/user ids only (no free text, no secrets).
 * Weather: per dropzone location (shared by users at same DZ).
 * Ops: per user + dropzone + UTC day bucket (bookings/waiver counts are day-scoped).
 */
export function buildWeatherContextCacheKey(dropzoneId: number): string {
  return `${KEY_PREFIX}:weather:dz:${dropzoneId}`;
}

export function buildOpsContextCacheKey(
  dropzoneId: number | null,
  userId: number,
  utcDay: string
): string {
  const dz = dropzoneId ?? 0;
  return `${KEY_PREFIX}:ops:dz:${dz}:u:${userId}:day:${utcDay}`;
}

export function utcDayBucket(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export class NoOpAssistantContextCache implements AssistantContextCache {
  async get(): Promise<string | null> {
    return null;
  }

  async set(): Promise<void> {
    /* no-op */
  }
}

export class RedisAssistantContextCache implements AssistantContextCache {
  constructor(private readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, value, 'EX', ttlSeconds);
    } catch {
      /* bypass — source of truth is always recomputation */
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Factory — use REDIS_URL from env when present.
 */
export function createAssistantContextCache(redisUrl: string | undefined): AssistantContextCache {
  if (!redisUrl?.trim()) {
    return new NoOpAssistantContextCache();
  }
  try {
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
    return new RedisAssistantContextCache(redis);
  } catch {
    return new NoOpAssistantContextCache();
  }
}

let _singleton: AssistantContextCache | null = null;
let _redisClient: Redis | null = null;

export function getDefaultAssistantContextCache(): AssistantContextCache {
  if (_singleton) {
    return _singleton;
  }
  const env = getEnv();
  if (!env.REDIS_URL) {
    _singleton = new NoOpAssistantContextCache();
    return _singleton;
  }
  try {
    _redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
    _singleton = new RedisAssistantContextCache(_redisClient);
  } catch {
    _singleton = new NoOpAssistantContextCache();
  }
  return _singleton;
}

export async function resetAssistantContextCacheForTests(): Promise<void> {
  if (_redisClient) {
    await _redisClient.quit().catch(() => {});
    _redisClient = null;
  }
  _singleton = null;
}
