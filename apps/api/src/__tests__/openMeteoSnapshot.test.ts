import { describe, it, expect, vi } from 'vitest';
import { fetchOpenMeteoAssistantSnapshot } from '../services/weather/openMeteoSnapshot';

describe('fetchOpenMeteoAssistantSnapshot', () => {
  it('returns null on HTTP error', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 502 }) as Response);
    const r = await fetchOpenMeteoAssistantSnapshot({
      latitude: 33,
      longitude: -117,
      timezone: 'UTC',
      dropzoneName: 'Test DZ',
      fetchImpl,
    });
    expect(r).toBeNull();
  });

  it('returns null when no current block', async () => {
    const fetchImpl = vi.fn(async () =>
      ({
        ok: true,
        json: async () => ({}),
      }) as Response
    );
    const r = await fetchOpenMeteoAssistantSnapshot({
      latitude: 33,
      longitude: -117,
      timezone: 'UTC',
      dropzoneName: 'Test DZ',
      fetchImpl,
    });
    expect(r).toBeNull();
  });

  it('returns snapshot with deterministic fields from Open-Meteo shape', async () => {
    const fetchImpl = vi.fn(async () =>
      ({
        ok: true,
        json: async () => ({
          current: {
            temperature_2m: 0,
            wind_speed_10m: 18.52,
            wind_direction_10m: 0,
            cloud_cover: 20,
            visibility: 16093.4,
            weather_code: 0,
          },
          daily: { sunset: ['2026-04-12T22:00:00'] },
        }),
      }) as Response
    );

    const r = await fetchOpenMeteoAssistantSnapshot({
      latitude: 33,
      longitude: -117,
      timezone: 'America/Los_Angeles',
      dropzoneName: 'Test DZ',
      fetchImpl,
    });

    expect(r).not.toBeNull();
    expect(r!.source).toBe('Open-Meteo');
    expect(r!.dropzoneName).toBe('Test DZ');
    expect(r!.windKnotsGround).toBe(10);
    expect(r!.fetchedAtIso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
