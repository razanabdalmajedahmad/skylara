'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import { logger } from '@/lib/logger';
import {
  Plane,
  Clock,
} from 'lucide-react';

// ── TYPES ────────────────────────────────────────────────
interface PilotData {
  name: string;
  aircraftAssigned: string;
  aircraftType: string;
  maxDutyHours: number;
  hoursFlownToday: number;
  certification: string;
  nextBreak: string;
}

interface Flight {
  id: string;
  time: string;
  aircraft: string;
  altitude: string;
  jumpCount: number;
  status: string;
  depart: string;
  land: string;
  estimatedDuration: number;
}

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
  cloudCover?: number;
  weatherCode?: number;
}

interface WeatherDisplay {
  temp: number;
  windSpeed: number;
  windDirection: string;
  visibility: string;
  ceiling: string;
  summary: string;
}

interface FuelData {
  current: number;
  capacity: number;
  burnRate: number;
  minimumReserve: number;
  flightTime: number;
}

interface WeightBalanceData {
  currentLoad: string;
  aircraft: string;
  totalWeight: number;
  maxWeight: number;
  cg: number;
  cgMin: number;
  cgMax: number;
  status: string;
}

interface DutyHoursData {
  flownToday: number;
  maxDaily: number;
  maxWeekly: number;
  flownThisWeek: number;
  restRequired: number;
}

// ── DEFAULTS ────────────────────────────────────────────────
const DEFAULT_PILOT: PilotData = {
  name: '',
  aircraftAssigned: '',
  aircraftType: '',
  maxDutyHours: 0,
  hoursFlownToday: 0,
  certification: '',
  nextBreak: '',
};

const DEFAULT_WEATHER: WeatherDisplay = {
  temp: 0,
  windSpeed: 0,
  windDirection: '',
  visibility: '',
  ceiling: '',
  summary: 'No weather data',
};

const DEFAULT_FUEL: FuelData = {
  current: 0,
  capacity: 0,
  burnRate: 0,
  minimumReserve: 0,
  flightTime: 0,
};

const DEFAULT_WEIGHT_BALANCE: WeightBalanceData = {
  currentLoad: '',
  aircraft: '',
  totalWeight: 0,
  maxWeight: 0,
  cg: 0,
  cgMin: 0,
  cgMax: 0,
  status: '',
};

const DEFAULT_DUTY_HOURS: DutyHoursData = {
  flownToday: 0,
  maxDaily: 0,
  maxWeekly: 0,
  flownThisWeek: 0,
  restRequired: 0,
};

// ── UTILITY FUNCTIONS ────────────────────────────────────────
const getStatusColor = (
  status: string
): { bg: string; text: string } => {
  const statusMap: {
    [key: string]: { bg: string; text: string };
  } = {
    AIRBORNE: { bg: 'bg-sky-50 dark:bg-sky-950', text: 'text-sky-700 dark:text-sky-300' },
    '30MIN': { bg: 'bg-amber-50 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300' },
    '20MIN': { bg: 'bg-orange-50 dark:bg-orange-950', text: 'text-orange-700 dark:text-orange-300' },
    '10MIN': { bg: 'bg-orange-50 dark:bg-orange-950', text: 'text-orange-700 dark:text-orange-300' },
    BOARDING: { bg: 'bg-red-50 dark:bg-red-950', text: 'text-red-700 dark:text-red-300' },
    OPEN: { bg: 'bg-emerald-50 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-300' },
    LOCKED: { bg: 'bg-purple-50 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-300' },
    FILLING: { bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300' },
  };
  return statusMap[status] || { bg: 'bg-gray-100 dark:bg-slate-700', text: 'text-gray-500 dark:text-gray-400' };
};

const getFuelStatus = (
  percent: number
): { colorClass: string; status: string } => {
  if (percent < 20) return { colorClass: 'text-red-500', status: 'CRITICAL' };
  if (percent < 35) return { colorClass: 'text-amber-500', status: 'LOW' };
  if (percent < 60) return { colorClass: 'text-orange-500', status: 'CAUTION' };
  return { colorClass: 'text-emerald-500', status: 'OK' };
};

const getFuelBarColor = (percent: number): string => {
  if (percent < 20) return 'bg-red-500';
  if (percent < 35) return 'bg-amber-500';
  if (percent < 60) return 'bg-orange-500';
  return 'bg-emerald-500';
};

function parseWind(windStr: string): { speed: number; direction: string } {
  const match = windStr.match(/^(\d+)\s*kts?\s+(.+)$/i);
  if (match) return { speed: parseInt(match[1]), direction: match[2] };
  return { speed: 0, direction: '' };
}

function mapWeatherToDisplay(data: WeatherData): WeatherDisplay {
  const groundWind = parseWind(data.ground);
  const statusLabel =
    data.status === 'GREEN' ? 'VFR - Good conditions' :
    data.status === 'YELLOW' ? 'Marginal VFR - Use caution' :
    data.status === 'RED' ? 'IFR - Not suitable' :
    data.status || 'Unknown';

  return {
    temp: data.temp ?? 0,
    windSpeed: groundWind.speed,
    windDirection: groundWind.direction,
    visibility: data.vis || '',
    ceiling: data.base || '',
    summary: statusLabel,
  };
}

// ── MAIN COMPONENT ────────────────────────────────────────
export default function PilotPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [pilotData, setPilotData] = useState<PilotData>(DEFAULT_PILOT);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [weather, setWeather] = useState<WeatherDisplay>(DEFAULT_WEATHER);
  const [fuelStatus, setFuelStatusData] = useState<FuelData>(DEFAULT_FUEL);
  const [weightBalance, setWeightBalance] = useState<WeightBalanceData>(DEFAULT_WEIGHT_BALANCE);
  const [dutyHours, setDutyHours] = useState<DutyHoursData>(DEFAULT_DUTY_HOURS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPilotData = async () => {
      // Fetch pilot profile, loads, and weather in parallel
      const [profileRes, loadsRes, weatherRes] = await Promise.all([
        apiGet<{ success: boolean; data: any }>('/jumpers/me').catch((err) => {
          logger.warn('Failed to fetch pilot profile', { page: 'pilot', endpoint: '/jumpers/me' });
          return null;
        }),
        apiGet<{ success: boolean; data: any }>('/loads?status=OPEN,FILLING,LOCKED,BOARDING,AIRBORNE').catch((err) => {
          logger.warn('Failed to fetch loads', { page: 'pilot', endpoint: '/loads' });
          return null;
        }),
        apiGet<{ success: boolean; data: WeatherData }>('/weather').catch((err) => {
          logger.warn('Failed to fetch weather', { page: 'pilot', endpoint: '/weather' });
          return null;
        }),
      ]);

      // Map pilot profile
      if (profileRes?.data) {
        const d = profileRes.data;
        const name = `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim();
        setPilotData({
          ...DEFAULT_PILOT,
          name: name || user?.firstName ? `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() : '',
          certification: d.certification ?? d.role ?? '',
          aircraftAssigned: d.aircraftAssigned ?? d.aircraft?.registration ?? '',
          aircraftType: d.aircraftType ?? d.aircraft?.type ?? '',
          maxDutyHours: d.maxDutyHours ?? 0,
          hoursFlownToday: d.hoursFlownToday ?? 0,
          nextBreak: d.nextBreak ?? '',
        });
        // Map duty hours if provided in profile
        if (d.dutyHours) {
          setDutyHours({
            flownToday: d.dutyHours.flownToday ?? 0,
            maxDaily: d.dutyHours.maxDaily ?? 0,
            maxWeekly: d.dutyHours.maxWeekly ?? 0,
            flownThisWeek: d.dutyHours.flownThisWeek ?? 0,
            restRequired: d.dutyHours.restRequired ?? 0,
          });
        }
      } else if (user) {
        // Fallback to auth context for name
        setPilotData({
          ...DEFAULT_PILOT,
          name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
        });
      }

      // Map loads to flights
      if (loadsRes?.data) {
        const loadsList = Array.isArray(loadsRes.data) ? loadsRes.data : (loadsRes.data?.loads ?? []);
        if (loadsList.length > 0) {
          const apiFlights: Flight[] = loadsList.map((l: any) => {
            const slotsArr = Array.isArray(l.slots) ? l.slots : [];
            const slotsCount = typeof l.slots === 'number' ? l.slots : (l.slotsCount ?? slotsArr.length);
            const departTime = l.depart ?? (l.scheduledAt ? new Date(l.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
            return {
              id: l.loadNumber ? `L-${l.loadNumber}` : String(l.id ?? ''),
              time: departTime,
              aircraft: l.aircraftRegistration ?? (typeof l.aircraft === 'string' ? l.aircraft : l.aircraft?.registration ?? '') ?? 'N/A',
              altitude: l.altitude ? `${Number(l.altitude).toLocaleString()} ft` : '',
              jumpCount: slotsCount,
              status: l.status ?? 'OPEN',
              depart: departTime,
              land: l.landedAt ? new Date(l.landedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
              estimatedDuration: l.estimatedDuration ?? 30,
            };
          });
          setFlights(apiFlights);

          // Derive weight/balance from first active load if available
          const activeLoad = loadsList.find((l: any) => l.status === 'AIRBORNE' || l.status === 'BOARDING') ?? loadsList[0];
          if (activeLoad) {
            setWeightBalance({
              currentLoad: activeLoad.loadNumber ? `L-${activeLoad.loadNumber}` : String(activeLoad.id ?? ''),
              aircraft: activeLoad.aircraftRegistration ?? (typeof activeLoad.aircraft === 'string' ? activeLoad.aircraft : '') ?? '',
              totalWeight: activeLoad.totalWt ?? activeLoad.totalWeight ?? 0,
              maxWeight: activeLoad.maxWt ?? activeLoad.maxWeight ?? 0,
              cg: activeLoad.cg ?? 0,
              cgMin: activeLoad.cgMin ?? 0,
              cgMax: activeLoad.cgMax ?? 0,
              status: activeLoad.cgStatus ?? (activeLoad.cg ? 'COMPUTED' : ''),
            });
          }

          // Derive fuel data from first active load if available
          if (activeLoad?.fuel) {
            setFuelStatusData({
              current: activeLoad.fuel.current ?? 0,
              capacity: activeLoad.fuel.capacity ?? 0,
              burnRate: activeLoad.fuel.burnRate ?? 0,
              minimumReserve: activeLoad.fuel.minimumReserve ?? 0,
              flightTime: activeLoad.fuel.flightTime ?? 0,
            });
          }
        }
      }

      // Map weather data
      if (weatherRes?.data) {
        const raw = (weatherRes as any).data ?? weatherRes;
        // Handle both { success, data: WeatherData } and direct WeatherData shapes
        const wd: WeatherData | null = raw?.ground ? raw : (raw?.data?.ground ? raw.data : null);
        if (wd) {
          setWeather(mapWeatherToDisplay(wd));
        }
      }

      setIsLoading(false);
    };

    fetchPilotData();
  }, [user]);

  const dutyPercent = dutyHours.maxDaily > 0 ? (dutyHours.flownToday / dutyHours.maxDaily) * 100 : 0;
  const fuelPercent = fuelStatus.capacity > 0 ? (fuelStatus.current / fuelStatus.capacity) * 100 : 0;
  const fuelStatusInfo = getFuelStatus(fuelPercent);
  const weightPercent = weightBalance.maxWeight > 0 ? (weightBalance.totalWeight / weightBalance.maxWeight) * 100 : 0;
  const cgSafe =
    weightBalance.cgMin > 0 && weightBalance.cgMax > 0
      ? weightBalance.cg >= weightBalance.cgMin && weightBalance.cg <= weightBalance.cgMax
      : weightBalance.cg === 0; // No CG data = show as safe (no data yet)

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pilot Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {pilotData.name || 'Pilot'}{pilotData.certification ? ` \u2022 ${pilotData.certification}` : ''}
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Loading pilot data...</p>
          </div>
        ) : (
          <>
            {/* Top Row - Aircraft & Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {/* Aircraft Assignment */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
                <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
                  Aircraft Assignment
                </h2>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                      Tail Number
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {pilotData.aircraftAssigned || 'Not assigned'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                      Aircraft Type
                    </div>
                    <div className="text-sm text-gray-900 dark:text-white">
                      {pilotData.aircraftType || 'No data'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Duty Hours */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
                <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
                  Duty Hours Today
                </h2>
                {dutyHours.maxDaily > 0 ? (
                  <>
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {dutyHours.flownToday}h / {dutyHours.maxDaily}h
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full font-bold text-xs ${
                            dutyPercent > 80
                              ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                              : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {Math.round(dutyPercent)}%
                        </span>
                      </div>
                      <div className="bg-gray-200 dark:bg-slate-600 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${dutyPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(dutyPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {(dutyHours.maxDaily - dutyHours.flownToday).toFixed(1)} hours remaining
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No duty hours data</p>
                )}
              </div>

              {/* Next Break */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
                <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
                  Schedule
                </h2>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                      Next Break
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {pilotData.nextBreak || 'Not scheduled'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <Clock size={14} />
                    Recommended break point
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Row - Weather & Fuel */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {/* Weather Brief */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
                <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4">
                  Weather Brief
                </h2>
                {weather.summary !== 'No weather data' ? (
                  <>
                    <div className={`p-3 rounded-lg mb-4 ${
                      weather.summary.startsWith('VFR') ? 'bg-emerald-50 dark:bg-emerald-950' :
                      weather.summary.startsWith('Marginal') ? 'bg-amber-50 dark:bg-amber-950' :
                      weather.summary.startsWith('IFR') ? 'bg-red-50 dark:bg-red-950' :
                      'bg-gray-50 dark:bg-slate-700'
                    }`}>
                      <div className={`font-bold text-sm ${
                        weather.summary.startsWith('VFR') ? 'text-emerald-700 dark:text-emerald-300' :
                        weather.summary.startsWith('Marginal') ? 'text-amber-700 dark:text-amber-300' :
                        weather.summary.startsWith('IFR') ? 'text-red-700 dark:text-red-300' :
                        'text-gray-700 dark:text-gray-300'
                      }`}>
                        {weather.summary}
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Temperature</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {weather.temp > 0 ? `${weather.temp}\u00B0F` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Wind</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {weather.windSpeed > 0 ? `${weather.windSpeed} kt ${weather.windDirection}` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Visibility</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {weather.visibility || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Ceiling</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {weather.ceiling || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No weather data available</p>
                )}
              </div>

              {/* Fuel Status */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
                <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4">
                  Fuel Status
                </h2>

                {fuelStatus.capacity > 0 ? (
                  <>
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {fuelStatus.current} / {fuelStatus.capacity} gal
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full font-bold text-xs ${
                            fuelStatusInfo.status === 'OK'
                              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {fuelStatusInfo.status}
                        </span>
                      </div>
                      <div className="bg-gray-200 dark:bg-slate-600 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getFuelBarColor(fuelPercent)}`}
                          style={{ width: `${Math.min(fuelPercent, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                      <div className="flex justify-between">
                        <span>Burn Rate</span>
                        <span className="font-semibold">
                          {fuelStatus.burnRate} gal/hr
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Flight Time</span>
                        <span className="font-semibold">
                          {fuelStatus.flightTime} min
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Minimum Reserve</span>
                        <span className="font-semibold">
                          {fuelStatus.minimumReserve} gal
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No fuel data available</p>
                )}
              </div>

              {/* Weight & Balance */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
                <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4">
                  Weight & Balance
                </h2>

                {weightBalance.maxWeight > 0 ? (
                  <>
                    <div className={`p-3 rounded-lg mb-4 ${cgSafe ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-red-50 dark:bg-red-950'}`}>
                      <div className={`font-bold text-sm ${cgSafe ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                        {cgSafe ? 'SAFE' : 'OUT OF LIMITS'}
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Weight</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {weightBalance.totalWeight.toLocaleString()} lbs
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Max Weight</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {weightBalance.maxWeight.toLocaleString()} lbs
                        </span>
                      </div>
                      {weightBalance.cgMin > 0 && weightBalance.cgMax > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">CG</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {weightBalance.cg}% ({weightBalance.cgMin}-
                            {weightBalance.cgMax}%)
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No weight data available</p>
                )}
              </div>
            </div>

            {/* Today's Flights */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
              <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Today's Flights</h2>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {flights.length} scheduled {flights.length === 1 ? 'flight' : 'flights'}
                </p>
              </div>

              {flights.length > 0 ? (
                <div className="divide-y divide-gray-200 dark:divide-slate-700">
                  {flights.map((flight) => {
                    const statusColor = getStatusColor(flight.status);

                    return (
                      <div key={flight.id} className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {flight.id}
                              </h3>
                              <span
                                className={`px-2 py-1 rounded-full font-bold text-xs whitespace-nowrap ${statusColor.bg} ${statusColor.text}`}
                              >
                                {flight.status}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                                  Time
                                </div>
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  {flight.depart || 'TBD'}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                                  Aircraft
                                </div>
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  {flight.aircraft}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                                  Altitude
                                </div>
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  {flight.altitude || 'N/A'}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                                  Jumpers
                                </div>
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  {flight.jumpCount} on board
                                </div>
                              </div>
                            </div>

                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                              Flight Duration: {flight.estimatedDuration} minutes
                            </div>
                          </div>

                          <button
                            onClick={() => router.push('/dashboard/manifest')}
                            className="w-full lg:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center justify-center gap-2 flex-shrink-0"
                          >
                            <Plane size={16} />
                            View Load
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Plane size={32} className="mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No active flights</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Flights will appear here once loads are created
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
