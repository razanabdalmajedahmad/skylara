'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Bell,
  TrendingUp,
  Users,
  Plane,
  FileText,
  Shield,
  ChevronRight,
  RefreshCw,
  Clock,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api';

interface Recommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'ACCEPTED' | 'DISMISSED';
  category: string;
  actionLabel?: string;
  actionRoute?: string;
  createdAt: string;
}

interface OpsContext {
  activeLoads: { id: string | number; status: string; aircraft: string; filled: number; capacity: number }[];
  underfillCount: number;
  todayBookings: number;
  expiringWaivers: number;
  pendingOnboarding: number;
  recentIncidents: number;
  todayJumps: number;
  weather: { wind: string; temp: number; cloudBase: number; visibility: number } | null;
  summary: string;
}

const FALLBACK_RECS: Recommendation[] = [];

const PRIORITY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  HIGH: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
  MEDIUM: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  LOW: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
};

const CATEGORY_ICONS: Record<string, typeof Bell> = {
  compliance: Shield,
  manifest: Plane,
  onboarding: Users,
  staffing: Users,
  general: Zap,
};

export default function RecommendationsPage() {
  const { user } = useAuth();
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [opsContext, setOpsContext] = useState<OpsContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'HIGH' | 'MEDIUM' | 'LOW'>('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recsRes, opsRes] = await Promise.allSettled([
        apiGet<{ success: boolean; data: Recommendation[] }>('/assistant/recommendations'),
        apiGet<{ success: boolean; data: OpsContext }>('/assistant/ops-context'),
      ]);

      if (recsRes.status === 'fulfilled' && recsRes.value?.data) {
        setRecs(recsRes.value.data);
      } else {
        setRecs([]);
      }

      if (opsRes.status === 'fulfilled' && opsRes.value?.data) {
        setOpsContext(opsRes.value.data);
      }
    } catch {
      setRecs(FALLBACK_RECS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) fetchData(); }, [user]);

  const handleAction = async (rec: Recommendation, action: 'accept' | 'dismiss') => {
    try {
      await apiPost(`/assistant/recommendations/${rec.id}/action`, { action });
    } catch { /* API may not be available */ }
    setRecs(prev => prev.map(r => r.id === rec.id ? { ...r, status: action === 'accept' ? 'ACCEPTED' : 'DISMISSED' } : r));
  };

  const filtered = recs.filter(r => r.status === 'PENDING' && (filter === 'all' || r.priority === filter));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent p-4 lg:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <Link href="/dashboard/ai" className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white dark:text-gray-400 dark:hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to AI Hub
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Zap className="w-7 h-7 text-amber-500" /> Recommendations
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">AI-generated operational insights and suggested actions</p>
          </div>
          <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 dark:text-gray-300">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Ops Summary Strip */}
        {opsContext && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            {[
              { label: 'Active Loads', value: opsContext.activeLoads.length, color: 'text-blue-600' },
              { label: 'Underfilled', value: opsContext.underfillCount, color: opsContext.underfillCount > 0 ? 'text-amber-600' : 'text-gray-600' },
              { label: 'Bookings Today', value: opsContext.todayBookings, color: 'text-emerald-600' },
              { label: 'Jumps Done', value: opsContext.todayJumps, color: 'text-indigo-600' },
              { label: 'Waivers Expiring', value: opsContext.expiringWaivers, color: opsContext.expiringWaivers > 0 ? 'text-red-600' : 'text-gray-600' },
              { label: 'Pending Onboard', value: opsContext.pendingOnboarding, color: opsContext.pendingOnboarding > 0 ? 'text-amber-600' : 'text-gray-600' },
              { label: 'Incidents (7d)', value: opsContext.recentIncidents, color: opsContext.recentIncidents > 0 ? 'text-red-600' : 'text-emerald-600' },
            ].map((stat, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-3">
                <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'HIGH', 'MEDIUM', 'LOW'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 dark:border-gray-600 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? `All (${recs.filter(r => r.status === 'PENDING').length})` : f}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Analyzing operations...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white">All clear</p>
            <p className="text-gray-600 dark:text-gray-400 mt-1">No pending recommendations right now</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(rec => {
              const style = PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.MEDIUM;
              const Icon = CATEGORY_ICONS[rec.category] || Zap;
              return (
                <div key={rec.id} className={`bg-white dark:bg-slate-800 rounded-xl border ${style.bg} dark:border-gray-700 p-5`}>
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${style.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${style.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                        <span className={`text-xs font-bold ${style.text} uppercase`}>{rec.priority}</span>
                        <span className="text-xs text-gray-400">-</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{rec.category}</span>
                        <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{rec.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{rec.description}</p>

                      {/* Explainability label */}
                      <p className="text-[10px] text-gray-400 mt-2 italic">Proposed by AI - needs human review</p>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        {rec.actionRoute && (
                          <Link
                            href={rec.actionRoute}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                          >
                            {rec.actionLabel || 'View'} <ChevronRight className="w-3 h-3" />
                          </Link>
                        )}
                        <button
                          onClick={() => handleAction(rec, 'accept')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Accept
                        </button>
                        <button
                          onClick={() => handleAction(rec, 'dismiss')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Actioned History */}
        {recs.filter(r => r.status !== 'PENDING').length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Actions</h2>
            <div className="space-y-2">
              {recs.filter(r => r.status !== 'PENDING').slice(0, 5).map(rec => (
                <div key={rec.id} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 px-4 py-3 flex items-center gap-3 opacity-60">
                  {rec.status === 'ACCEPTED' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{rec.title}</span>
                  <span className="text-xs text-gray-400 ml-auto">{rec.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
