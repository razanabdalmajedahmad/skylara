'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/constants';
import {
  Loader2,
  Cloud,
  Wind,
  Thermometer,
  Droplets,
  Eye,
  ArrowUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

interface WeatherData {
  jumpable: boolean;
  jumpabilityIndex: number;
  jumpabilityLabel: string;
  temperature: number;
  temperatureUnit: string;
  windSpeed: number;
  windGust: number | null;
  windDirection: string;
  windUnit: string;
  conditions: string;
  humidity: number | null;
  visibility: number | null;
  visibilityUnit: string;
  cloudCeiling: number | null;
  updatedAt: string;
  forecast: { time: string; temperature: number; windSpeed: number; conditions: string; jumpable: boolean }[];
}

function JumpabilityBadge({ jumpable, label, index }: { jumpable: boolean; label: string; index: number }) {
  if (jumpable) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
        <CheckCircle className="w-5 h-5 text-green-600" />
        <span className="text-sm font-semibold text-green-700 dark:text-green-400">{label}</span>
        <span className="text-xs text-green-600 dark:text-green-500">({index}%)</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
      <XCircle className="w-5 h-5 text-red-600" />
      <span className="text-sm font-semibold text-red-700 dark:text-red-400">{label}</span>
      <span className="text-xs text-red-600 dark:text-red-500">({index}%)</span>
    </div>
  );
}

export default function PublicWeatherPage() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/public/weather`);
        if (!res.ok) throw new Error('Failed to load weather');
        const json = await res.json();
        setWeather(json.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load weather data');
      } finally {
        setLoading(false);
      }
    };
    fetchWeather();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Cloud className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">No weather data available</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Weather</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Current conditions and jumpability forecast</p>

      {/* Jumpability */}
      <div className="mb-6">
        <JumpabilityBadge jumpable={weather.jumpable} label={weather.jumpabilityLabel} index={weather.jumpabilityIndex} />
      </div>

      {/* Current Conditions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Current Conditions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <Thermometer className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{weather.temperature}&deg;{weather.temperatureUnit}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Temperature</p>
          </div>
          <div className="text-center">
            <Wind className="w-6 h-6 text-teal-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{weather.windSpeed} {weather.windUnit}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Wind {weather.windDirection}
              {weather.windGust !== null && ` (G${weather.windGust})`}
            </p>
          </div>
          <div className="text-center">
            <Cloud className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{weather.conditions}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Conditions</p>
          </div>
          {weather.humidity !== null && (
            <div className="text-center">
              <Droplets className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{weather.humidity}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Humidity</p>
            </div>
          )}
          {weather.visibility !== null && (
            <div className="text-center">
              <Eye className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{weather.visibility} {weather.visibilityUnit}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Visibility</p>
            </div>
          )}
          {weather.cloudCeiling !== null && (
            <div className="text-center">
              <ArrowUp className="w-6 h-6 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{weather.cloudCeiling.toLocaleString()} ft</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Cloud Ceiling</p>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-right">
          Updated {new Date(weather.updatedAt).toLocaleTimeString()}
        </p>
      </div>

      {/* Forecast */}
      {weather.forecast && weather.forecast.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Forecast</h2>
          <div className="overflow-x-auto">
            <div className="flex gap-4 min-w-max pb-2">
              {weather.forecast.map((slot, i) => (
                <div
                  key={i}
                  className={`flex flex-col items-center p-3 rounded-lg border min-w-[90px] ${
                    slot.jumpable
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
                      : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
                  }`}
                >
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{slot.time}</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{slot.temperature}&deg;</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-1">{slot.conditions}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{slot.windSpeed} {weather.windUnit}</span>
                  {slot.jumpable ? (
                    <CheckCircle className="w-4 h-4 text-green-500 mt-2" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-2" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
