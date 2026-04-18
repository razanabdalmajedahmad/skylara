'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api';
import { PortalAssistantNav } from '../page';
import {
  Bot,
  Play,
  Pause,
  Clock,
  CheckCircle,
  XCircle,
  Bell,
  FileWarning,
  DollarSign,
  BarChart3,
  Users,
  GraduationCap,
  Calendar,
  ShieldAlert,
  Wrench,
  TrendingUp,
  Loader2,
  AlertCircle,
  RefreshCw,
  Activity,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AutomationRaw {
  id: string;
  name: string;
  description: string;
  trigger: string;
  action: string;
  frequency: string;
  status: 'active' | 'paused';
  lastRun: string | null;
  nextRun: string;
  iconName?: string;
}

interface Automation extends AutomationRaw {
  icon: React.ElementType;
}

interface AutomationStats {
  activeCount: number;
  totalRunsThisWeek: number;
  failedRuns: number;
}

/* ------------------------------------------------------------------ */
/*  Icon mapping for API data                                          */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<string, React.ElementType> = {
  Bell, FileWarning, DollarSign, BarChart3, Users,
  GraduationCap, Calendar, ShieldAlert, Wrench, TrendingUp,
  Bot, CheckCircle, Clock, Activity,
};

const resolveIcon = (name?: string): React.ElementType => {
  if (name && ICON_MAP[name]) return ICON_MAP[name];
  return Bot;
};

/* ------------------------------------------------------------------ */
/*  Fallback Data (used only when API is unreachable)                  */
/* ------------------------------------------------------------------ */

const FALLBACK_AUTOMATIONS: Automation[] = [];

const FALLBACK_STATS: AutomationStats = {
  activeCount: 0,
  totalRunsThisWeek: 0,
  failedRuns: 0,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AutomationsPage() {
  const { user } = useAuth();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [stats, setStats] = useState<AutomationStats>(FALLBACK_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [autoRes, statsRes] = await Promise.allSettled([
          apiGet<{ success: boolean; data: AutomationRaw[] }>('/portal-assistant/automations'),
          apiGet<{ success: boolean; data: AutomationStats }>('/portal-assistant/automations/stats'),
        ]);

        if (cancelled) return;

        if (autoRes.status === 'fulfilled' && autoRes.value?.success && Array.isArray(autoRes.value.data)) {
          setAutomations(autoRes.value.data.map((a: AutomationRaw) => ({
            ...a,
            icon: resolveIcon(a.iconName),
          })));
        } else {
          setAutomations(FALLBACK_AUTOMATIONS);
        }

        if (statsRes.status === 'fulfilled' && statsRes.value?.success && statsRes.value.data) {
          setStats(statsRes.value.data);
        } else {
          // Derive stats from automations if stats endpoint unavailable
          const activeCount = automations.filter((a) => a.status === 'active').length;
          setStats({ activeCount, totalRunsThisWeek: 0, failedRuns: 0 });
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load automations. Please try again.');
          setAutomations(FALLBACK_AUTOMATIONS);
          setStats(FALLBACK_STATS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Recompute stats when automations change
  useEffect(() => {
    if (automations.length > 0) {
      setStats((prev) => ({
        ...prev,
        activeCount: automations.filter((a) => a.status === 'active').length,
      }));
    }
  }, [automations]);

  const toggleAutomation = async (id: string) => {
    const target = automations.find((a) => a.id === id);
    if (!target) return;

    const newStatus = target.status === 'active' ? 'paused' as const : 'active' as const;

    // Optimistic update
    setAutomations((prev) =>
      prev.map((a) => a.id === id ? { ...a, status: newStatus } : a)
    );

    try {
      await apiPost(`/portal-assistant/automations/${id}/toggle`, { status: newStatus });
    } catch {
      // Revert on failure
      setAutomations((prev) =>
        prev.map((a) => a.id === id ? { ...a, status: target.status } : a)
      );
      setError('Failed to toggle automation. Please try again.');
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PortalAssistantNav current="/dashboard/portal-assistant/automations" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Automations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Operational alerts and automated workflows</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 flex items-center gap-3">
          <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.activeCount}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Active Automations</p>
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.totalRunsThisWeek}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">Runs This Week</p>
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.failedRuns}</p>
            <p className="text-xs text-red-600 dark:text-red-400">Failed Runs</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-500 dark:text-gray-400">Loading automations...</span>
        </div>
      )}

      {/* Automation list */}
      {!loading && (
        <div className="space-y-4">
          {automations.length === 0 ? (
            <div className="text-center py-16">
              <Bot className="w-12 h-12 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No automations configured</p>
            </div>
          ) : (
            automations.map((auto) => {
              const Icon = auto.icon;
              const isActive = auto.status === 'active';
              return (
                <div
                  key={auto.id}
                  className={`bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5 transition-opacity ${
                    !isActive ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Left: Icon + Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">{auto.name}</h3>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-gray-100 text-gray-500 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {isActive ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{auto.description}</p>
                        <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 space-y-0.5">
                          <p><span className="font-medium text-gray-500 dark:text-gray-400">Trigger:</span> {auto.trigger}</p>
                          <p><span className="font-medium text-gray-500 dark:text-gray-400">Action:</span> {auto.action}</p>
                        </div>
                      </div>
                    </div>

                    {/* Right: Meta + Toggle */}
                    <div className="flex items-center gap-6 flex-shrink-0">
                      <div className="text-right text-xs space-y-1">
                        <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3" /> {auto.frequency}
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 dark:text-gray-400">
                          Last: {formatDate(auto.lastRun)}
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 dark:text-gray-400">
                          Next: {formatDate(auto.nextRun)}
                        </p>
                      </div>

                      {/* Toggle */}
                      <button
                        onClick={() => toggleAutomation(auto.id)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          isActive ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        aria-label={isActive ? 'Pause automation' : 'Activate automation'}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white dark:bg-slate-800 rounded-full transition-transform shadow ${
                            isActive ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
