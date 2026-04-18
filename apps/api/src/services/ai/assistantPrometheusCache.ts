import type { PrismaClient } from '@prisma/client';
import { buildAssistantPrometheusMetrics } from './assistantPrometheusExport';

type CacheState = {
  body: string;
  generatedAtMs: number;
  expiresAtMs: number;
  building: Promise<string> | null;
};

const state: CacheState = {
  body: '',
  generatedAtMs: 0,
  expiresAtMs: 0,
  building: null,
};

/**
 * In-process cache with stale-while-revalidate semantics.
 * - Returns fresh body when within TTL
 * - Returns stale body while rebuilding (if available)
 * - Builds at most one refresh concurrently
 */
export async function getAssistantPrometheusMetricsCached(
  prisma: PrismaClient,
  opts: { ttlMs: number; nowMs?: number }
): Promise<{ body: string; cache: { hit: boolean; stale: boolean; ageMs: number } }> {
  const nowMs = opts.nowMs ?? Date.now();
  const ttlMs = Math.max(1000, Math.min(300_000, Math.floor(opts.ttlMs)));
  const ageMs = state.generatedAtMs ? nowMs - state.generatedAtMs : 0;

  const fresh = state.body && nowMs < state.expiresAtMs;
  if (fresh) {
    return { body: state.body, cache: { hit: true, stale: false, ageMs } };
  }

  // Kick off rebuild if not already building.
  if (!state.building) {
    state.building = buildAssistantPrometheusMetrics(prisma)
      .then((body) => {
        state.body = body;
        state.generatedAtMs = Date.now();
        state.expiresAtMs = state.generatedAtMs + ttlMs;
        return body;
      })
      .finally(() => {
        state.building = null;
      });
  }

  // If we have stale body, return it while rebuilding.
  if (state.body) {
    return { body: state.body, cache: { hit: true, stale: true, ageMs } };
  }

  // No cached body yet; await build.
  const body = await state.building;
  return { body, cache: { hit: false, stale: false, ageMs: 0 } };
}

