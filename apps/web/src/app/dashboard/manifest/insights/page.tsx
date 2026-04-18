'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  TrendingUp,
  Plane,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  ChevronRight,
  Activity,
  Zap,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';

interface InsightsSummary {
  todayLoads: number;
  completedLoads: number;
  todayJumps: number;
  todayBookings: number;
  queueLength: number;
  activeTandems: number;
  activeStudents: number;
  underfillCount: number;
}

interface ActiveLoad {
  loadNumber: number | null;
  status: string;
  aircraft: string;
  filled: number;
  capacity: number;
  fillPercent: number;
}

interface Insight {
  type: string;
  title: string;
  description: string;
  priority: string;
  route?: string;
}

const FALLBACK_SUMMARY: InsightsSummary = {
  todayLoads: 0, completedLoads: 0, todayJumps: 0, todayBookings: 0,
  queueLength: 0, activeTandems: 0, activeStudents: 0, underfillCount: 0,
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-emerald-100 text-emerald-700',
  FILLING: 'bg-blue-100 text-blue-700',
  LOCKED: 'bg-amber-100 text-amber-700',
  BOARDING: 'bg-orange-100 text-orange-700',
  AIRBORNE: 'bg-red-100 text-red-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: 'border-l-red-500',
  MEDIUM: 'border-l-amber-500',
  LOW: 'border-l-blue-500',
};

export default function ManifestInsightsPage() {
  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [loads, setLoads] = useState<ActiveLoad[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: { summary: InsightsSummary; activeLoads: ActiveLoad[]; insights: Insight[] } }>('/manifest/insights');
      if (res?.data) {
        setSummary(res.data.summary);
        setLoads(res.data.activeLoads ?? []);
        setInsights(res.data.insights ?? []);
      } else {
        setSummary(FALLBACK_SUMMARY);
        setLoads([]);
        setInsights([]);
      }
    } catch {
      setSummary(FALLBACK_SUMMARY);
      setLoads([]);
      setInsights([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <RouteGuard allowedRoles={ROLE_GROUPS.OPERATIONS}>
    <div className="min-h-screen bg-gray-50 dark:bg-transparent p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <Link href="/dashboard/manifest" className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white dark:text-gray-400 dark:hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Manifest
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Activity className="w-7 h-7 text-indigo-500" /> Manifest Insights
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Daily operations summary and AI-powered intelligence</p>
          </div>
          <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Loading insights...</p>
          </div>
        ) : (
          <>
            {/* KPI Grid */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Loads Today', value: summary.todayLoads, icon: Plane, color: 'text-blue-600' },
                  { label: 'Completed', value: summary.completedLoads, icon: CheckCircle, color: 'text-emerald-600' },
                  { label: 'Jumps Done', value: summary.todayJumps, icon: TrendingUp, color: 'text-indigo-600' },
                  { label: 'Bookings', value: summary.todayBookings, icon: Clock, color: 'text-purple-600' },
                  { label: 'In Queue', value: summary.queueLength, icon: Users, color: summary.queueLength > 5 ? 'text-red-600' : 'text-gray-600' },
                  { label: 'Tandems', value: summary.activeTandems, icon: Users, color: 'text-sky-600' },
                  { label: 'Students', value: summary.activeStudents, icon: Users, color: 'text-amber-600' },
                  { label: 'Underfilled', value: summary.underfillCount, icon: AlertTriangle, color: summary.underfillCount > 0 ? 'text-amber-600' : 'text-emerald-600' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">{stat.label}</p>
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Active Loads */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700">
                <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
                  <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Plane className="w-4 h-4 text-blue-500" /> Active Loads
                  </h2>
                </div>
                <div className="p-4 space-y-3">
                  {loads.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No active loads</p>
                  ) : (
                    loads.map((load, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-16 text-sm font-bold text-gray-900 dark:text-white">
                          Load {load.loadNumber || '?'}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[load.status] || 'bg-gray-100 text-gray-600'}`}>
                          {load.status}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{load.aircraft}</span>
                        <div className="flex-1">
                          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${load.fillPercent >= 80 ? 'bg-emerald-500' : load.fillPercent >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${load.fillPercent}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 w-12 text-right">{load.filled}/{load.capacity}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* AI Insights */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700">
                <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
                  <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" /> AI Insights
                  </h2>
                </div>
                <div className="p-4 space-y-3">
                  {insights.length === 0 ? (
                    <div className="text-center py-4">
                      <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">All clear — no issues detected</p>
                    </div>
                  ) : (
                    insights.map((insight, i) => (
                      <div key={i} className={`border-l-4 ${PRIORITY_COLORS[insight.priority] || 'border-l-gray-300'} bg-gray-50 dark:bg-slate-700/30 rounded-r-lg p-3`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{insight.title}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{insight.description}</p>
                            <p className="text-[10px] text-gray-400 mt-1 italic">Proposed by AI - needs human review</p>
                          </div>
                          {insight.route && (
                            <Link href={insight.route} className="flex-shrink-0 ml-2 p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition-colors">
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </Link>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Readiness Board', href: '/dashboard/manifest/readiness', icon: '🛡️' },
                { label: 'Load Planner', href: '/dashboard/manifest/load-planner', icon: '📋' },
                { label: 'AI Recommendations', href: '/dashboard/ai/recommendations', icon: '⚡' },
                { label: 'Weather', href: '/dashboard/weather', icon: '🌤️' },
              ].map((link, i) => (
                <Link key={i} href={link.href} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors flex items-center gap-3">
                  <span className="text-xl">{link.icon}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{link.label}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
    </RouteGuard>
  );
}
