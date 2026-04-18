import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";

/**
 * IN-MEMORY RESPONSE CACHE — High-traffic endpoint optimization
 *
 * For V1 this uses a simple in-memory Map with TTL and LRU eviction.
 * When REDIS_URL is configured in a future phase, this can be swapped
 * to a Redis-backed cache without changing the API surface.
 *
 * Usage in routes:
 *   fastify.get("/path", { config: { cache: { ttlSeconds: 5 } } }, handler)
 *
 * Cache key = method + url + tenant (dropzoneId from JWT).
 * Mutations (POST/PUT/PATCH/DELETE) are never cached.
 * Cache-Control and ETag headers are set automatically.
 */

interface CacheEntry {
  body: string;
  statusCode: number;
  contentType: string;
  etag: string;
  createdAt: number;
  ttlMs: number;
}

interface CacheConfig {
  ttlSeconds: number;
}

const DEFAULT_MAX_ENTRIES = 5000;

class ResponseCacheStore {
  private cache = new Map<string, CacheEntry>();
  private maxEntries: number;

  constructor(maxEntries = DEFAULT_MAX_ENTRIES) {
    this.maxEntries = maxEntries;
  }

  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.createdAt > entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  set(key: string, entry: CacheEntry): void {
    // LRU eviction: if at capacity, delete oldest entries
    if (this.cache.size >= this.maxEntries) {
      const keysToDelete = Array.from(this.cache.keys()).slice(0, Math.floor(this.maxEntries * 0.1));
      for (const k of keysToDelete) {
        this.cache.delete(k);
      }
    }
    this.cache.set(key, entry);
  }

  /** Invalidate all entries matching a prefix (e.g., tenant-scoped bust). */
  invalidatePrefix(prefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /** Invalidate all entries. */
  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

function generateETag(body: string): string {
  // Simple hash-based ETag — sufficient for API responses
  let hash = 0;
  for (let i = 0; i < body.length; i++) {
    const char = body.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `"${Math.abs(hash).toString(36)}"`;
}

export default fp(async (fastify: FastifyInstance) => {
  const store = new ResponseCacheStore();

  fastify.decorate("responseCache", store);

  // Hook: check cache before handler runs
  fastify.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    // Only cache GET requests
    if (request.method !== "GET") return;

    const routeConfig = (request.routeOptions?.config as any)?.cache as CacheConfig | undefined;
    if (!routeConfig) return;

    const tenantId = (request as any).user?.dropzoneId || "global";
    const cacheKey = `${tenantId}:${request.method}:${request.url}`;

    const cached = store.get(cacheKey);
    if (!cached) return;

    // ETag: if client sends If-None-Match and it matches, return 304
    const clientEtag = request.headers["if-none-match"];
    if (clientEtag === cached.etag) {
      reply
        .code(304)
        .header("ETag", cached.etag)
        .header("Cache-Control", `private, max-age=${Math.ceil(cached.ttlMs / 1000)}`)
        .header("X-Cache", "HIT")
        .send();
      return;
    }

    // Return cached response
    reply
      .code(cached.statusCode)
      .header("Content-Type", cached.contentType)
      .header("ETag", cached.etag)
      .header("Cache-Control", `private, max-age=${Math.ceil(cached.ttlMs / 1000)}`)
      .header("X-Cache", "HIT")
      .send(cached.body);
  });

  // Hook: store response in cache after handler runs
  fastify.addHook("onSend", async (request: FastifyRequest, reply: FastifyReply, payload: any) => {
    if (request.method !== "GET") return payload;
    if (reply.statusCode !== 200) return payload;

    const routeConfig = (request.routeOptions?.config as any)?.cache as CacheConfig | undefined;
    if (!routeConfig) return payload;

    // Don't re-cache if we already served from cache
    if (reply.getHeader("X-Cache") === "HIT") return payload;

    const tenantId = (request as any).user?.dropzoneId || "global";
    const cacheKey = `${tenantId}:${request.method}:${request.url}`;
    const body = typeof payload === "string" ? payload : JSON.stringify(payload);
    const etag = generateETag(body);

    store.set(cacheKey, {
      body,
      statusCode: 200,
      contentType: reply.getHeader("Content-Type") as string || "application/json",
      etag,
      createdAt: Date.now(),
      ttlMs: routeConfig.ttlSeconds * 1000,
    });

    reply.header("ETag", etag);
    reply.header("Cache-Control", `private, max-age=${routeConfig.ttlSeconds}`);
    reply.header("X-Cache", "MISS");

    return payload;
  });

  fastify.log.info(`[ResponseCache] In-memory cache initialized (max ${DEFAULT_MAX_ENTRIES} entries)`);
});

declare module "fastify" {
  interface FastifyInstance {
    responseCache: ResponseCacheStore;
  }
}
