'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import {
  Cloud,
  Wind,
  Droplets,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Loader2,
  RefreshCw,
} from 'lucide-react';

// ── TYPES ────────────────────────────────────────────
interface WeatherData {
  ji: number;
  status: string;
  ground: string;
  alt3k: string;
  alt6k: string;
  base: string;
  vis: string;
  temp: number;
  sunset: string;
  cloudCover: number;
  weatherCode: number;
  dropzone: string;
  source: string;
  updatedAt: string;
}

function parseWind(windStr: string): { speed: number; direction: string } {
  const match = windStr.match(/^(\d+)\s*kts?\s+(.+)$/i);
  if (match) return { speed: parseInt(match[1]), direction: match[2] };
  return { speed: 0, direction: 'N/A' };
}

function getJumpStatusMessage(status: string): string {
  if (status === 'GREEN') return 'Conditions suitable for jumping';
  if (status === 'YELLOW') return 'Marginal conditions — use caution';
  return 'Conditions not suitable for jumping';
}

function getJumpStatusDetails(data: WeatherData): string[] {
  const details: string[] = [];
  const groundWind = parseWind(data.ground);
  if (groundWind.speed <= 14) details.push('Ground wind within limits');
  else details.push(`Ground wind elevated: ${groundWind.speed} kts`);
  if (data.vis.includes('10+')) details.push('Visibility excellent');
  else details.push(`Visibility: ${data.vis}`);
  if (data.cloudCover < 50) details.push('Cloud cover minimal');
  else details.push(`Cloud cover: ${data.cloudCover}%`);
  if (data.weatherCode === 0) details.push('No precipitation');
  else if (data.weatherCode < 50) details.push('Fog or haze possible');
  else details.push('Precipitation active');
  return details;
}

function estimateDrift(groundSpeed: number): { distance: number; direction: string } {
  // Rough estimate: ~50ft drift per knot of wind during canopy flight
  return { distance: Math.round(groundSpeed * 53), direction: 'downwind' };
}

// ── UTILITY FUNCTIONS ────────────────────────────────────────
const getJumpStatusClasses = (
  status: string
): { bg: string; text: string; border: string; badgeBg: string } => {
  const statusMap: Record<string, { bg: string; text: string; border: string; badgeBg: string }> = {
    GREEN: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-500 dark:border-emerald-400',
      badgeBg: 'bg-emerald-500 dark:bg-emerald-400',
    },
    YELLOW: {
      bg: 'bg-amber-50 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-500 dark:border-amber-400',
      badgeBg: 'bg-amber-500 dark:bg-amber-400',
    },
    RED: {
      bg: 'bg-red-50 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-500 dark:border-red-400',
      badgeBg: 'bg-red-500 dark:bg-red-400',
    },
  };
  return statusMap[status] || statusMap.GREEN;
};

const getWindCategory = (speed: number): string => {
  if (speed < 8) return 'LIGHT';
  if (speed < 15) return 'MODERATE';
  if (speed < 20) return 'STRONG';
  return 'VERY STRONG';
};

// ── MAIN COMPONENT ────────────────────────────────────────
export default function WeatherPage() {
  const { user } = useAuth();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ success: boolean; data: WeatherData }>('/weather');
      if (res.success && res.data) {
        setWeather(res.data);
      } else {
        setError('Unexpected response from weather API');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to reach weather service');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather();
    // Refresh every 5 minutes
    const interval = setInterval(fetchWeather, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-secondary-500 mx-auto" />
          <p className="text-gray-500 dark:text-gray-400 mt-3">Loading weather data...</p>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Weather Dashboard</h1>
          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400 mx-auto mb-3" />
            <p className="text-amber-800 dark:text-amber-200 font-medium">{error || 'No weather data available'}</p>
            <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">Weather data could not be loaded. Check your connection or try again.</p>
            <button
              onClick={fetchWeather}
              className="mt-4 px-4 py-2 bg-amber-600 dark:bg-amber-500 text-white rounded-lg hover:bg-amber-700 dark:hover:bg-amber-600 inline-flex items-center gap-2 text-sm font-medium"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusClasses = getJumpStatusClasses(weather.status);
  const groundWind = parseWind(weather.ground);
  const alt3kWind = parseWind(weather.alt3k);
  const alt6kWind = parseWind(weather.alt6k);
  const drift = estimateDrift(groundWind.speed);
  const jumpDetails = getJumpStatusDetails(weather);

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Weather Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {weather.dropzone} — Last updated: {new Date(weather.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {weather.source === 'fallback' && (
                <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 font-medium">(fallback data)</span>
              )}
            </p>
          </div>
          <button
            onClick={fetchWeather}
            className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 inline-flex items-center gap-1.5"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {weather.source === 'fallback' && (
          <div className="mb-4 px-4 py-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-800 dark:text-amber-200">
            Live weather data unavailable — showing estimated conditions. Data will auto-refresh.
          </div>
        )}

          <>
            {/* Jump Status Alert */}
            <div
              className={`mb-6 p-4 rounded-lg border-2 flex items-start gap-4 ${statusClasses.bg} ${statusClasses.border}`}
            >
              <div>
                {weather.status === 'GREEN' ? (
                  <CheckCircle2 size={28} className={statusClasses.text} />
                ) : (
                  <AlertTriangle size={28} className={statusClasses.text} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className={`font-bold text-lg ${statusClasses.text}`}>
                    {weather.status === 'GREEN' ? 'Jump Conditions: GO'
                      : weather.status === 'YELLOW' ? 'Jump Conditions: CAUTION'
                      : 'Jump Conditions: NO-GO'}
                  </h2>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusClasses.badgeBg} text-white`}>
                    JI {weather.ji}/100
                  </span>
                </div>
                <p className={`text-sm mt-1 font-medium ${statusClasses.text}`}>
                  {getJumpStatusMessage(weather.status)}
                </p>
                <ul className="mt-2 space-y-1">
                  {jumpDetails.map((detail, i) => (
                    <li key={i} className={`text-xs ${statusClasses.text}`}>
                      {weather.status === 'GREEN' ? '\u2713' : '!'} {detail}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Current Conditions Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {/* Temperature */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                  Temperature
                </div>
                <div className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {weather.temp}°F
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Sunset at {weather.sunset}
                </div>
              </div>

              {/* Wind Speed */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Wind size={16} className="text-sky-600 dark:text-sky-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                    Ground Wind
                  </span>
                </div>
                <div className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {groundWind.speed} kt
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  From {groundWind.direction} — {getWindCategory(groundWind.speed)}
                </div>
              </div>

              {/* Visibility */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Eye size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                    Visibility
                  </span>
                </div>
                <div className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {weather.vis}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {weather.vis.includes('10+') ? 'Excellent' : 'Reduced'}
                </div>
              </div>

              {/* Cloud Base */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Cloud size={16} className="text-gray-500 dark:text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                    Cloud Base
                  </span>
                </div>
                <div className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {weather.base}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Cover: {weather.cloudCover}%
                </div>
              </div>

              {/* Jumpability Index */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Gauge size={16} className="text-sky-600 dark:text-sky-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                    Jumpability
                  </span>
                </div>
                <div className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {weather.ji}/100
                </div>
                <div className={`text-xs mt-1 ${statusClasses.text}`}>
                  {weather.status}
                </div>
              </div>

              {/* Sunset */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Droplets size={16} className="text-orange-500 dark:text-orange-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                    Sunset
                  </span>
                </div>
                <div className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {weather.sunset}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Local time
                </div>
              </div>
            </div>

            {/* Wind Profile */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 sm:p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Wind Profile by Altitude</h2>
              <div className="space-y-4">
                {[
                  { altitude: 'Ground', speed: groundWind.speed, direction: groundWind.direction },
                  { altitude: '3,000 ft', speed: alt3kWind.speed, direction: alt3kWind.direction },
                  { altitude: '6,000 ft', speed: alt6kWind.speed, direction: alt6kWind.direction },
                ].map((layer, i) => (
                  <div key={i} className="border-b border-gray-200 dark:border-slate-700 pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-gray-900 dark:text-white text-sm">
                        {layer.altitude}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {layer.speed} kt from {layer.direction}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${layer.speed > 18 ? 'bg-amber-500 dark:bg-amber-400' : 'bg-sky-500 dark:bg-sky-400'}`}
                          style={{
                            width: `${Math.min((layer.speed / 25) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-16">
                        {getWindCategory(layer.speed)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Spot Landing Calculator */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Spot Landing Estimate
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">
                    Current Wind Data
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                        Ground Wind
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {groundWind.speed} kt {groundWind.direction}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                        Estimated Drift
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        ~{drift.distance} ft
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Estimated canopy displacement {drift.direction}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">
                    Landing Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {[
                      `Plan landing area ~${drift.distance} ft ${drift.direction}`,
                      'Monitor wind changes during descent',
                      groundWind.speed > 15
                        ? 'Strong winds — consider holding for students/tandems'
                        : 'Conditions within normal limits',
                    ].map((rec, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-emerald-500 dark:bg-emerald-400 text-white text-xs font-bold mt-0.5">
                          {'\u2713'}
                        </span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </>
      </div>
    </div>
  );
}
