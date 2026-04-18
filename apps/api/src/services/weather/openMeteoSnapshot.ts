/**
 * Open-Meteo snapshot for assistant context — real API data only; returns null on failure.
 */

import type { OpenMeteoCurrentResponse } from './openMeteoCore';
import {
  buildOpenMeteoForecastUrl,
  calculateJumpabilityIndex,
  celsiusToFahrenheit,
  degToCompass,
  getJumpStatus,
  kphToKnots,
  metersToMiles,
} from './openMeteoCore';

export interface OpenMeteoAssistantSnapshot {
  dropzoneName: string;
  latitude: number;
  longitude: number;
  ji: number;
  jumpStatus: string;
  windKnotsGround: number;
  windDirCompass: string;
  windKnotsAlt3k: number;
  windKnotsAlt6k: number;
  visibilityMiles: number;
  tempF: number;
  cloudCoverPct: number;
  weatherCode: number;
  sunsetLocal: string | null;
  source: 'Open-Meteo';
  fetchedAtIso: string;
}

const FETCH_TIMEOUT_MS = 8000;

/**
 * Fetch current conditions from Open-Meteo. Returns null if HTTP fails, JSON invalid, or no current block.
 */
export async function fetchOpenMeteoAssistantSnapshot(params: {
  latitude: number;
  longitude: number;
  timezone: string;
  dropzoneName: string;
  fetchImpl?: typeof fetch;
}): Promise<OpenMeteoAssistantSnapshot | null> {
  const { latitude, longitude, timezone, dropzoneName, fetchImpl = globalThis.fetch } = params;
  const url = buildOpenMeteoForecastUrl({ latitude, longitude, timezone });

  try {
    const response = await fetchImpl(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as OpenMeteoCurrentResponse;
    if (!data.current) {
      return null;
    }

    const c = data.current;
    const windKnots = kphToKnots(c.wind_speed_10m);
    const windDir = degToCompass(c.wind_direction_10m);
    const visMiles = metersToMiles(c.visibility);
    const tempF = celsiusToFahrenheit(c.temperature_2m);
    const ji = calculateJumpabilityIndex(windKnots, visMiles, c.cloud_cover, c.weather_code);
    const alt3k = Math.round(windKnots * 1.3);
    const alt6k = Math.round(windKnots * 1.6);

    let sunsetLocal: string | null = null;
    if (data.daily?.sunset?.[0]) {
      sunsetLocal = new Date(data.daily.sunset[0]).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }

    return {
      dropzoneName,
      latitude,
      longitude,
      ji,
      jumpStatus: getJumpStatus(ji),
      windKnotsGround: windKnots,
      windDirCompass: windDir,
      windKnotsAlt3k: alt3k,
      windKnotsAlt6k: alt6k,
      visibilityMiles: visMiles,
      tempF,
      cloudCoverPct: c.cloud_cover,
      weatherCode: c.weather_code,
      sunsetLocal,
      source: 'Open-Meteo',
      fetchedAtIso: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
