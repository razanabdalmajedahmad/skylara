import { describe, it, expect, vi } from 'vitest';
import type { AssistantContextCache } from '../services/ai/assistantContextCache';
import {
  maskSensitiveData,
  buildPortalAssistantSystemPrompt,
  buildPortalPlatformContext,
  fetchWeatherFactsForAssistant,
  fetchOpsSnapshotForAssistant,
  clampAssistantContext,
} from '../services/ai/assistantContextAssembly';

class MemoryAssistantCache implements AssistantContextCache {
  private readonly m = new Map<string, string>();
  async get(key: string): Promise<string | null> {
    return this.m.get(key) ?? null;
  }
  async set(key: string, value: string, _ttl: number): Promise<void> {
    this.m.set(key, value);
  }
}

describe('assistantContextAssembly', () => {
  it('maskSensitiveData redacts card-like and email patterns', () => {
    expect(maskSensitiveData('pay 4111-1111-1111-1111 now')).toContain('xxxx-xxxx-xxxx-1111');
    expect(maskSensitiveData('contact a@b.com')).toContain('[email]');
  });

  it('buildPortalAssistantSystemPrompt includes role and platform context', () => {
    const prompt = buildPortalAssistantSystemPrompt({
      userRole: 'ADMIN',
      currentRoute: '/dashboard/manifest',
      matches: [
        {
          type: 'article',
          title: 'T',
          category: 'Ops',
          shortAnswer: 'S',
        },
      ],
      platformContext: buildPortalPlatformContext({
        currentPageLabel: 'DZ1',
        currentRoute: '/x',
      }),
    });
    expect(prompt).toContain('SkyLara AI Assistant');
    expect(prompt).toContain('ADMIN');
    expect(prompt).toContain('DZ1');
  });

  it('buildPortalPlatformContext concatenates weather then ops and stays bounded', () => {
    const long = 'x'.repeat(20_000);
    const out = buildPortalPlatformContext({
      currentPageLabel: 'DZ',
      currentRoute: '/w',
      weatherSnapshot: long,
      opsSnapshot: '\n## ops',
    });
    expect(out.length).toBeLessThanOrEqual(12_000);
    expect(out).toContain('[context truncated');
  });

  it('clampAssistantContext truncates', () => {
    const s = clampAssistantContext('ab'.repeat(5000), 100);
    expect(s.length).toBeLessThanOrEqual(100);
    expect(s).toContain('truncated');
  });

  it('fetchWeatherFactsForAssistant returns empty when no weather keywords', async () => {
    const r = await fetchWeatherFactsForAssistant({ user: { findUnique: async () => null } } as any, 1, 'hello manifest');
    expect(r).toBe('');
  });

  it('fetchWeatherFactsForAssistant includes Open-Meteo facts when keywords match and API succeeds', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn(async () => ({
          userRoles: [
            {
              dropzone: {
                id: 1,
                name: 'Test DZ',
                latitude: 33.78,
                longitude: -117.23,
                timezone: 'UTC',
              },
            },
          ],
        })),
      },
    };
    const fetchImpl = vi.fn(async () =>
      ({
        ok: true,
        json: async () => ({
          current: {
            temperature_2m: 15,
            wind_speed_10m: 18.52,
            wind_direction_10m: 270,
            cloud_cover: 25,
            visibility: 16093,
            weather_code: 0,
          },
          daily: { sunset: ['2026-04-12T22:00:00.000Z'] },
        }),
      }) as Response
    );

    const r = await fetchWeatherFactsForAssistant(prisma as any, 99, 'What is the wind today?', { fetchImpl });
    expect(r).toContain('Open-Meteo');
    expect(r).toContain('Jumpability');
    expect(r).toContain('WeatherThresholdEngine');
    expect(fetchImpl).toHaveBeenCalled();
  });

  it('fetchWeatherFactsForAssistant uses cache — second call does not refetch Open-Meteo', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn(async () => ({
          userRoles: [
            {
              dropzone: {
                id: 1,
                name: 'Test DZ',
                latitude: 33.78,
                longitude: -117.23,
                timezone: 'UTC',
              },
            },
          ],
        })),
      },
    };
    const fetchImpl = vi.fn(async () =>
      ({
        ok: true,
        json: async () => ({
          current: {
            temperature_2m: 15,
            wind_speed_10m: 18.52,
            wind_direction_10m: 270,
            cloud_cover: 25,
            visibility: 16093,
            weather_code: 0,
          },
          daily: { sunset: [] },
        }),
      }) as Response
    );
    const mem = new MemoryAssistantCache();
    const opts = { fetchImpl, cache: mem, ttlWeatherSeconds: 3600 };
    await fetchWeatherFactsForAssistant(prisma as any, 99, 'How is the wind?', opts);
    await fetchWeatherFactsForAssistant(prisma as any, 99, 'How is the wind?', opts);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fetchWeatherFactsForAssistant bypasses cache when get throws (safe fallback)', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn(async () => ({
          userRoles: [
            {
              dropzone: {
                id: 1,
                name: 'Test DZ',
                latitude: 33.78,
                longitude: -117.23,
                timezone: 'UTC',
              },
            },
          ],
        })),
      },
    };
    const fetchImpl = vi.fn(async () =>
      ({
        ok: true,
        json: async () => ({
          current: {
            temperature_2m: 15,
            wind_speed_10m: 18.52,
            wind_direction_10m: 270,
            cloud_cover: 25,
            visibility: 16093,
            weather_code: 0,
          },
          daily: {},
        }),
      }) as Response
    );
    const badCache: AssistantContextCache = {
      async get() {
        throw new Error('redis unavailable');
      },
      async set() {},
    };
    const r = await fetchWeatherFactsForAssistant(prisma as any, 99, 'wind today?', {
      fetchImpl,
      cache: badCache,
      ttlWeatherSeconds: 3600,
    });
    expect(r).toContain('Open-Meteo');
    expect(fetchImpl).toHaveBeenCalled();
  });

  it('fetchOpsSnapshotForAssistant uses cache — second call skips load query', async () => {
    const loadFindMany = vi.fn().mockResolvedValue([]);
    const prisma = {
      user: {
        findUnique: vi.fn(async () => ({
          userRoles: [{ dropzoneId: 1 }],
        })),
      },
      load: { findMany: loadFindMany },
      booking: { count: vi.fn().mockResolvedValue(0) },
      waiverSubmission: { count: vi.fn().mockResolvedValue(0) },
      onboardingApplication: { count: vi.fn().mockResolvedValue(0) },
      weatherHold: { count: vi.fn().mockResolvedValue(0) },
      incident: { count: vi.fn().mockResolvedValue(0) },
    };
    const mem = new MemoryAssistantCache();
    const opts = { cache: mem, ttlOpsSeconds: 3600 };
    await fetchOpsSnapshotForAssistant(prisma as any, 5, 'what is on the manifest today?', opts);
    await fetchOpsSnapshotForAssistant(prisma as any, 5, 'what is on the manifest today?', opts);
    expect(loadFindMany).toHaveBeenCalledTimes(1);
  });
});
