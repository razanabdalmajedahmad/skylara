/**
 * Shared Open-Meteo parsing and jumpability math — used by `routes/weather.ts` and assistant context.
 * Deterministic only; no random values, no mock weather.
 */

export interface OpenMeteoCurrentResponse {
  current?: {
    temperature_2m: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    cloud_cover: number;
    visibility: number;
    weather_code: number;
  };
  daily?: {
    sunset: string[];
  };
}

const WIND_DIRECTIONS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

export function degToCompass(deg: number): string {
  const idx = Math.round(deg / 22.5) % 16;
  return WIND_DIRECTIONS[idx];
}

export function kphToKnots(kph: number): number {
  return Math.round(kph * 0.539957);
}

export function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

export function metersToMiles(m: number): number {
  return Math.round((m / 1609.34) * 10) / 10;
}

/**
 * Jumpability Index (0–100) — same formula as GET /weather.
 */
export function calculateJumpabilityIndex(
  windSpeedKnots: number,
  visibilityMiles: number,
  cloudCover: number,
  weatherCode: number
): number {
  let score = 100;

  if (windSpeedKnots > 10) score -= (windSpeedKnots - 10) * 2;
  if (windSpeedKnots > 20) score -= (windSpeedKnots - 20) * 3;
  if (windSpeedKnots > 30) score -= 20;

  if (visibilityMiles < 10) score -= (10 - visibilityMiles) * 3;
  if (visibilityMiles < 3) score -= 20;

  if (cloudCover > 60) score -= (cloudCover - 60) * 0.3;
  if (cloudCover > 80) score -= 10;

  if (weatherCode >= 95) score -= 40;
  else if (weatherCode >= 60) score -= 25;
  else if (weatherCode >= 50) score -= 15;
  else if (weatherCode >= 40) score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getJumpStatus(ji: number): string {
  if (ji >= 85) return 'GREEN';
  if (ji >= 70) return 'YELLOW';
  return 'RED';
}

export function buildOpenMeteoForecastUrl(params: {
  latitude: number;
  longitude: number;
  timezone: string;
}): string {
  const { latitude, longitude, timezone } = params;
  const tz = encodeURIComponent(timezone || 'UTC');
  return `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m,wind_direction_10m,cloud_cover,visibility,weather_code&daily=sunset&timezone=${tz}&forecast_days=1`;
}
