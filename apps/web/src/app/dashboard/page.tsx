'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api';
import { DashboardSkeleton } from '@/components/SkeletonLoader';
import {
  AlertCircle,
  Wind,
  Clock,
  Plane,
  Users,
  TrendingUp,
  DollarSign,
  Shield,
  ChevronRight,
  Plus,
  UserCheck,
  CloudSun,
  Pause,
  CalendarCheck,
} from 'lucide-react';

interface Load {
  id: string;
  status: 'OPEN' | 'FILLING' | 'LOCKED' | 'BOARDING' | 'AIRBORNE' | 'LANDED' | 'COMPLETE' | 'CANCELLED';
  aircraft: string;
  altitude: number;
  filled: number;
  slots: number;
  totalWt: number;
  maxWt: number;
  depart: string;
  pilot: string;
  waitlist: string[];
}

interface QueueMember {
  id: string;
  name: string;
  type: string;
  flags: string[];
  paid: boolean;
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
}

interface Alert {
  id: string;
  msg: string;
  severity: 'warning' | 'critical';
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  active: boolean;
}

interface ActivityEvent {
  id: string;
  time: string;
  event: string;
  details: string;
}

// Fallback data — used only when the API is unreachable
const FALLBACK_LOADS: Load[] = [];

const FALLBACK_QUEUE: QueueMember[] = [];

const FALLBACK_ALERTS: Alert[] = [];

const FALLBACK_STAFF: StaffMember[] = [];

const FALLBACK_ACTIVITY: ActivityEvent[] = [];

const FALLBACK_WEATHER: WeatherData = {
  ji: 0,
  status: 'GREEN',
  ground: '—',
  alt3k: '—',
  alt6k: '—',
  base: '—',
  vis: '—',
  temp: 0,
  sunset: '—',
};

interface DashboardStats {
  todayRevenue: number;
  activeLoads: number;
  totalJumpers: number;
  waitlistCount: number;
  utilization: number;
  complianceAlerts: number;
  weatherStatus: string;
  completedToday: number;
}

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    OPEN: '#10B981',
    FILLING: '#3B82F6',
    LOCKED: '#F59E0B',
    BOARDING: '#F97316',
    AIRBORNE: '#EF4444',
    LANDED: '#A855F7',
    COMPLETE: '#6B7280',
    CANCELLED: '#6B7280',
  };
  return colors[status] || '#9CA3AF';
};

const getStatusBgClass = (status: string): string => {
  const map: Record<string, string> = {
    OPEN: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    FILLING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    LOCKED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    BOARDING: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    AIRBORNE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    LANDED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    COMPLETE: 'bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-400',
    CANCELLED: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  };
  return map[status] || 'bg-gray-100 text-gray-600';
};

const getJumpStatus = (ji: number): { text: string; color: string } => {
  if (ji >= 85) return { text: 'GREEN', color: '#10B981' };
  if (ji >= 70) return { text: 'YELLOW', color: '#F59E0B' };
  return { text: 'RED', color: '#EF4444' };
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [loads, setLoads] = useState<Load[]>([]);
  const [queue, setQueue] = useState<QueueMember[]>([]);
  const [weather, setWeather] = useState<WeatherData>({ ji: 0, status: 'GREEN', ground: '—', alt3k: '—', alt6k: '—', base: '—', vis: '—', temp: 0, sunset: '—' });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [manifestFeedback, setManifestFeedback] = useState<{ id: string; msg: string; type: 'success' | 'error' } | null>(null);

  // ── LIVE OPS NOTIFICATIONS ──────────────────────────────────────────
  interface OpsNotification {
    id: string;
    type: 'load' | 'safety' | 'weather' | 'gear' | 'checkin';
    message: string;
    timestamp: Date;
    severity: 'info' | 'warning' | 'critical';
  }

  const [opsNotifications, setOpsNotifications] = useState<OpsNotification[]>([]);

  // Generate live ops notifications from load state changes
  useEffect(() => {
    const generateOpsEvents = () => {
      const events: OpsNotification[] = [];
      const now = new Date();

      // Load state events
      loads.forEach((load) => {
        if (load.status === 'AIRBORNE') {
          events.push({
            id: `airborne-${load.id}`,
            type: 'load',
            message: `${load.id} is AIRBORNE — ${load.aircraft} at ${load.altitude?.toLocaleString() || '14,000'} ft`,
            timestamp: now,
            severity: 'info',
          });
        }
        if (load.status === 'BOARDING') {
          events.push({
            id: `boarding-${load.id}`,
            type: 'load',
            message: `NOW BOARDING: ${load.id} — ${load.filled}/${load.slots} jumpers, pilot ${load.pilot}`,
            timestamp: now,
            severity: 'warning',
          });
        }
      });

      // Weather event
      if (weather.status === 'RED') {
        events.push({
          id: 'weather-hold',
          type: 'weather',
          message: `WEATHER HOLD — Conditions unsafe. Wind ${weather.ground}`,
          timestamp: now,
          severity: 'critical',
        });
      } else if (weather.status === 'YELLOW') {
        events.push({
          id: 'weather-marginal',
          type: 'weather',
          message: `Marginal conditions — Wind ${weather.ground}. Student jumps may be restricted.`,
          timestamp: now,
          severity: 'warning',
        });
      }

      setOpsNotifications(events.slice(0, 5)); // Max 5 visible
    };

    generateOpsEvents();
    const interval = setInterval(generateOpsEvents, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [loads, weather]);

  // Clear manifest feedback after 3 seconds
  useEffect(() => {
    if (!manifestFeedback) return;
    const timer = setTimeout(() => setManifestFeedback(null), 3000);
    return () => clearTimeout(timer);
  }, [manifestFeedback]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      let fellBack = false;
      let mappedLoadsForActivity: Load[] = [];

      // Fetch dashboard stats
      try {
        const statsRes = await apiGet<{ success: boolean; data: DashboardStats }>('/manifest/dashboard-stats');
        if (statsRes?.success && statsRes?.data) {
          setDashboardStats(statsRes.data);
        }
      } catch {
        // Stats endpoint unavailable — derived values will be computed from loads
      }

      // Fetch loads
      try {
        const loadsRes = await apiGet<{ success: boolean; data: any[] }>('/loads');
        if (loadsRes?.success && loadsRes?.data) {
          const rawLoads = Array.isArray(loadsRes.data) ? loadsRes.data : [];
          mappedLoadsForActivity = rawLoads.map((l: any) => {
            const slotsArr = Array.isArray(l.slots) ? l.slots : [];
            const slotsCount = typeof l.slots === 'number' ? l.slots : (l.slotsCount ?? slotsArr.length);
            const maxCap = l.maxCapacity ?? l.maxWt ?? l.maxSlots ?? 14;
            const filledCount = typeof l.filled === 'number' ? l.filled : slotsCount;
            const totalWeight = l.totalWt ?? l.totalWeight ?? slotsArr.reduce((s: number, sl: any) => s + (sl.weight || 0), 0);
            const departTime = l.depart ?? (l.scheduledAt ? new Date(l.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
            const pilotSlot = slotsArr.find((s: any) => s.position === 1);
            return {
              id: l.loadNumber ? `LD-${l.loadNumber}` : String(l.id ?? ''),
              status: l.status ?? 'OPEN',
              aircraft: l.aircraftRegistration ?? (typeof l.aircraft === 'string' ? l.aircraft : '') ?? '',
              altitude: l.altitude ?? 0,
              filled: filledCount,
              slots: maxCap,
              totalWt: totalWeight,
              maxWt: l.maxWt ?? l.maxWeight ?? 3200,
              depart: departTime,
              pilot: l.pilot ?? l.pilotName ?? pilotSlot?.userName ?? '',
              waitlist: Array.isArray(l.waitlist) ? l.waitlist.map((w: any) => typeof w === 'string' ? w : String(w.userName ?? w.id ?? '')) : [],
            };
          });
          setLoads(mappedLoadsForActivity);
        } else {
          setLoads(FALLBACK_LOADS);
          mappedLoadsForActivity = FALLBACK_LOADS;
          fellBack = true;
        }
      } catch {
        setLoads(FALLBACK_LOADS);
        mappedLoadsForActivity = FALLBACK_LOADS;
        fellBack = true;
      }

      // Fetch queue
      try {
        const queueRes = await apiGet<{ success: boolean; data: QueueMember[] }>('/queue');
        if (queueRes?.success && queueRes?.data) {
          setQueue(queueRes.data);
        } else {
          setQueue(FALLBACK_QUEUE);
          fellBack = true;
        }
      } catch {
        setQueue(FALLBACK_QUEUE);
        fellBack = true;
      }

      // Fetch weather
      try {
        const weatherRes = await apiGet<{ success: boolean; data: WeatherData }>('/weather');
        if (weatherRes?.success && weatherRes?.data) {
          setWeather(weatherRes.data);
        } else {
          setWeather(FALLBACK_WEATHER);
          fellBack = true;
        }
      } catch {
        setWeather(FALLBACK_WEATHER);
        fellBack = true;
      }

      // Fetch alerts from incidents
      try {
        const incidentsRes = await apiGet<{ success: boolean; data: Array<{ id: string; description?: string; title?: string; severity?: string }> }>('/incidents?status=REPORTED');
        if (incidentsRes?.success && incidentsRes?.data) {
          setAlerts(incidentsRes.data.map((inc) => ({
            id: inc.id,
            msg: inc.description || inc.title || 'Active incident',
            severity: inc.severity === 'CRITICAL' ? 'critical' as const : 'warning' as const,
          })));
        } else {
          setAlerts(FALLBACK_ALERTS);
          fellBack = true;
        }
      } catch {
        setAlerts(FALLBACK_ALERTS);
        fellBack = true;
      }

      // Fetch staff
      try {
        const staffRes = await apiGet<{ success: boolean; data: Array<{ id: string; name?: string; firstName?: string; lastName?: string; role?: string; status?: string }> }>('/users?limit=10');
        if (staffRes?.success && staffRes?.data) {
          setStaff(staffRes.data.map((u) => ({
            id: u.id,
            name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Staff',
            role: u.role || 'Staff',
            active: u.status !== 'INACTIVE' && u.status !== 'OFF',
          })));
        } else {
          setStaff(FALLBACK_STAFF);
          fellBack = true;
        }
      } catch {
        setStaff(FALLBACK_STAFF);
        fellBack = true;
      }

      // Activity — derived from freshly fetched loads (not React state; avoids stale closure)
      const derivedActivity: ActivityEvent[] = mappedLoadsForActivity.length > 0
        ? mappedLoadsForActivity.slice(0, 8).map((l, i) => ({
            id: `E${i}`,
            time: l.depart || '--:--',
            event: l.status === 'COMPLETE' ? 'Load Complete' : l.status === 'AIRBORNE' ? 'Load Airborne' : l.status === 'BOARDING' ? 'Boarding' : l.status === 'LOCKED' ? 'Load Locked' : 'Load Created',
            details: `${l.id} — ${l.aircraft} — ${l.filled}/${l.slots} jumpers`,
          }))
        : [];
      setActivity(derivedActivity.length > 0 ? derivedActivity : FALLBACK_ACTIVITY);

      setUsingFallback(fellBack);
      setIsLoading(false);
    };
    fetchDashboardData();
  }, []);

  const airborneCount = loads.filter((l) => l.status === 'AIRBORNE').length;
  const boardingCount = loads.filter((l) => l.status === 'BOARDING').length;
  const fillingCount = loads.filter((l) => l.status === 'FILLING').length;
  const activeLoads = dashboardStats?.activeLoads ?? loads.filter((l) => !['COMPLETE', 'CANCELLED'].includes(l.status)).length;
  const completedLoads = loads.filter((l) => l.status === 'COMPLETE');
  const jumpersCompleted = dashboardStats?.completedToday ?? completedLoads.reduce((sum, l) => sum + (l.filled || 0), 0);
  const jumpersInQueue = dashboardStats?.waitlistCount ?? queue.length;
  const tandemsCompleted = completedLoads.reduce((sum, l) => sum + ((l as any).tandemCount || 0), 0);
  const tandemsBooked = loads.filter((l) => ['OPEN', 'FILLING'].includes(l.status)).reduce((sum, l) => sum + ((l as any).tandemCount || 0), 0);
  const revenue = dashboardStats?.todayRevenue ?? 0;
  const staffOnDuty = staff.filter((s) => s.active).length;
  const totalStaff = staff.length;
  const safetyScore = weather.ji ?? 0;
  const jumpStatus = getJumpStatus(weather.ji);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen font-sans overflow-x-hidden -m-4 lg:-m-6">
      {/* FALLBACK DATA BANNER */}
      {usingFallback && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-6 py-2 text-center">
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Some data may be stale — unable to reach one or more API endpoints. Showing cached/fallback data.
          </span>
        </div>
      )}

      {/* TOP STATUS BAR */}
      <div className="bg-white dark:bg-slate-800 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-6 py-3 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white dark:text-gray-100">DZ OPEN</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Wind size={15} className="text-blue-500" />
              <span>{weather.ground}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: jumpStatus.color }}
              />
              <span className="font-bold text-gray-900 dark:text-white dark:text-gray-100">{jumpStatus.text}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Clock size={15} />
              <span>14:52 · Sunset {weather.sunset}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Plane size={15} className="text-amber-500" />
              <span>{airborneCount} airborne</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        {/* ALERTS BANNER */}
        {alerts.length > 0 && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-4">
            <AlertCircle size={20} className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                Operational Alerts ({alerts.length})
              </div>
              <div className="space-y-1 text-sm text-red-700 dark:text-red-300">
                {alerts.map((alert) => (
                  <div key={alert.id}>• {alert.msg}</div>
                ))}
              </div>
            </div>
            <Link
              href="/dashboard/incidents"
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-semibold whitespace-nowrap flex items-center gap-1"
            >
              Review <ChevronRight size={14} />
            </Link>
          </div>
        )}

        {/* LIVE OPS NOTIFICATIONS */}
        {opsNotifications.length > 0 && (
          <div className="mb-4 space-y-2">
            {opsNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium border-l-4 animate-pulse-once ${
                  notif.severity === 'critical'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-800 dark:text-red-300'
                    : notif.severity === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500 text-amber-800 dark:text-amber-300'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-800 dark:text-blue-300'
                }`}
              >
                <span className="text-xs opacity-60">{notif.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="flex-1">{notif.message}</span>
                <button
                  onClick={() => setOpsNotifications(prev => prev.filter(n => n.id !== notif.id))}
                  className="opacity-40 hover:opacity-100 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* KPI ROW */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4 mb-6">
          {[
            {
              label: 'ACTIVE LOADS',
              value: activeLoads,
              icon: Plane,
              iconColor: 'text-blue-500',
              sub: (
                <>
                  <span>{airborneCount} airborne</span> · <span>{boardingCount} boarding</span> · <span>{fillingCount} filling</span>
                </>
              ),
            },
            {
              label: 'JUMPERS TODAY',
              value: jumpersCompleted + jumpersInQueue,
              icon: Users,
              iconColor: 'text-indigo-500',
              sub: (
                <>
                  <span>{jumpersCompleted} completed</span> · <span className="text-amber-600 dark:text-amber-400">{jumpersInQueue} in queue</span>
                </>
              ),
            },
            {
              label: 'TANDEMS',
              value: `${tandemsCompleted}/${tandemsCompleted + tandemsBooked}`,
              icon: UserCheck,
              iconColor: 'text-purple-500',
              sub: (
                <>
                  <span>{tandemsCompleted} done</span> · <span>{tandemsBooked} booked</span>
                </>
              ),
            },
            {
              label: 'REVENUE',
              value: `$${revenue.toLocaleString()}`,
              valueColor: 'text-green-600 dark:text-green-400',
              icon: DollarSign,
              iconColor: 'text-green-500',
              sub: 'Live tally',
            },
            {
              label: 'STAFF ON DUTY',
              value: `${staffOnDuty}/${totalStaff || '—'}`,
              icon: Users,
              iconColor: 'text-cyan-500',
              sub: totalStaff > 0
                ? `${staff.filter(s => s.active).length} active, ${staff.filter(s => !s.active).length} off`
                : 'No staff data',
            },
            {
              label: 'SAFETY STREAK',
              value: `${safetyScore}d`,
              valueColor: 'text-green-600 dark:text-green-400',
              icon: Shield,
              iconColor: 'text-green-500',
              sub: 'Incident-free days',
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 dark:text-gray-400 tracking-wider uppercase">
                  {kpi.label}
                </span>
                <kpi.icon size={16} className={kpi.iconColor} />
              </div>
              <div className={`text-2xl lg:text-3xl font-bold mb-1 ${kpi.valueColor || 'text-gray-900 dark:text-white dark:text-gray-100'}`}>
                {kpi.value}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                {kpi.sub}
              </div>
            </div>
          ))}
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {/* LIVE LOAD BOARD */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 lg:p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base lg:text-lg font-bold text-gray-900 dark:text-white dark:text-gray-100">Live Load Board</h2>
              <Link
                href="/dashboard/manifest"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Plus size={16} /> Create Load
              </Link>
            </div>

            <div className="space-y-3 max-h-[26rem] overflow-y-auto pr-1">
              {loads.map((load) => {
                const fillPct = ((load.filled ?? 0) / (load.slots || 1)) * 100;
                const wtPct = ((load.totalWt ?? 0) / (load.maxWt || 1)) * 100;
                const color = getStatusColor(load.status);
                return (
                  <Link
                    href={`/dashboard/manifest`}
                    key={load.id}
                    className="block border border-gray-100 dark:border-slate-700 rounded-lg p-4 hover:border-gray-300 dark:border-slate-600 dark:hover:border-slate-600 hover:shadow-sm transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-1 h-14 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="font-bold text-sm text-gray-900 dark:text-white dark:text-gray-100">Load {load.id}</span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">{load.aircraft}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBgClass(load.status)}`}>
                            {load.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Pilot: {load.pilot}</div>
                        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                          <span className="font-medium">{load.filled}/{load.slots}</span>
                          <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden max-w-[180px]">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${fillPct}%`, backgroundColor: color }}
                            />
                          </div>
                          <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400 text-[10px]">
                            {(load.totalWt ?? 0).toLocaleString()} lbs
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-mono font-bold text-gray-900 dark:text-white dark:text-gray-100">{load.depart}</div>
                        {(load.altitude ?? 0) > 0 && (
                          <div className="text-xs text-blue-500 dark:text-blue-400 mt-1 font-medium">
                            {(load.altitude ?? 0).toLocaleString()} ft
                          </div>
                        )}
                        {(load.waitlist?.length ?? 0) > 0 && (
                          <div className="text-xs text-amber-500 mt-1 font-semibold">+{load.waitlist.length} wait</div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-6">
            {/* WEATHER */}
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 dark:text-gray-400 uppercase tracking-wider">Weather</h3>
                <CloudSun size={16} className="text-amber-400" />
              </div>
              <div className="text-center mb-5">
                <div className="text-5xl font-bold mb-1" style={{ color: jumpStatus.color }}>
                  {weather.ji}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Jumpability Index</div>
              </div>

              <div className="space-y-2.5 text-xs">
                {[
                  { label: 'Ground', value: weather.ground },
                  { label: '3,000 ft', value: weather.alt3k },
                  { label: '6,000 ft', value: weather.alt6k },
                  { label: 'Cloud Base', value: weather.base },
                  { label: 'Visibility', value: weather.vis },
                  { label: 'Temp / Sunset', value: `${weather.temp}°F / ${weather.sunset}` },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between py-1.5 border-b border-gray-100 dark:border-slate-700 last:border-b-0">
                    <span className="text-gray-500 dark:text-gray-400">{row.label}</span>
                    <span className="font-mono text-gray-700 dark:text-gray-300 font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 lg:p-6">
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/dashboard/manifest"
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <Plus size={14} /> New Load
                </Link>
                <Link
                  href="/dashboard/checkin"
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-lg transition-colors"
                >
                  <UserCheck size={14} /> Check-In
                </Link>
                <Link
                  href="/dashboard/bookings"
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-lg transition-colors"
                >
                  <Users size={14} /> Walk-In
                </Link>
                <Link
                  href="/dashboard/weather"
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 text-xs font-semibold rounded-lg transition-colors"
                >
                  <Pause size={14} /> Weather Hold
                </Link>
                <Link
                  href="/dashboard/end-of-day"
                  className="col-span-2 flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-lg transition-colors"
                >
                  <CalendarCheck size={14} /> End of Day
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* QUEUE */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 dark:text-gray-400 uppercase tracking-wider">Queue & Waitlist</h3>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                {queue.length}
              </span>
            </div>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {queue.map((person, idx) => (
                <div
                  key={person.id}
                  className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-slate-700 last:border-b-0"
                >
                  <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 dark:text-gray-400 w-4 text-right">{idx + 1}</span>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      backgroundColor: person.flags.length > 0 ? '#FEE2E2' : '#DBEAFE',
                      color: person.flags.length > 0 ? '#DC2626' : '#1E40AF',
                    }}
                  >
                    {person.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white dark:text-gray-100 truncate">{person.name}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">{person.type}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {person.flags.length > 0 && (
                      <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded font-medium">
                        {person.flags[0]}
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        person.paid
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}
                    >
                      {person.paid ? 'Paid' : 'Unpaid'}
                    </span>
                    <button
                      onClick={async () => {
                        try {
                          // Manifest this person to the next available load
                          const loadRes = await apiGet<{ success: boolean; data: any[] }>('/loads?status=FILLING&limit=1');
                          if (loadRes?.data?.[0]) {
                            await apiPost(`/loads/${loadRes.data[0].id}/slots`, {
                              userId: person.id,
                              weight: 200,
                              slotType: person.type === 'Tandem' ? 'TANDEM_PASSENGER' : 'FUN',
                            });
                            setQueue(prev => prev.filter(p => p.id !== person.id));
                            setManifestFeedback({ id: person.id, msg: `${person.name} manifested`, type: 'success' });
                          } else {
                            setManifestFeedback({ id: person.id, msg: 'No open loads available', type: 'error' });
                          }
                        } catch {
                          setManifestFeedback({ id: person.id, msg: 'Failed to manifest — try again', type: 'error' });
                        }
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 hover:bg-sky-200"
                      title="Manifest to next load"
                    >
                      {manifestFeedback?.id === person.id ? (
                        <span className={manifestFeedback.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {manifestFeedback.msg}
                        </span>
                      ) : (
                        'Manifest'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* STAFF STATUS */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 dark:text-gray-400 uppercase tracking-wider">Staff on Duty</h3>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                {staffOnDuty}/{totalStaff}
              </span>
            </div>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-slate-700 last:border-b-0"
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: member.active ? '#10B981' : '#6B7280' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white dark:text-gray-100 truncate">{member.name}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">{member.role}</div>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      member.active
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {member.active ? 'Active' : 'Off'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* RECENT ACTIVITY */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recent Activity</h3>
              <TrendingUp size={14} className="text-gray-400" />
            </div>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {activity.map((event) => (
                <div key={event.id} className="py-2.5 border-b border-gray-100 dark:border-slate-700 last:border-b-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 dark:text-gray-400 font-mono tabular-nums">{event.time}</span>
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{event.event}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 pl-12">{event.details}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
