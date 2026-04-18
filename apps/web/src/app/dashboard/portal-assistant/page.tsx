'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api';
import Link from 'next/link';
import {
  Brain,
  MessageSquare,
  Search,
  BookOpen,
  Zap,
  Settings,
  ScrollText,
  Bot,
  TrendingUp,
  Database,
  Activity,
  Clock,
  HelpCircle,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OverviewStats {
  totalQueriesToday: number;
  knowledgeArticles: number;
  activeAutomations: number;
  searchIndexSize: number;
}

interface RecentQuery {
  id: string;
  query: string;
  user: string;
  timestamp: string;
  status: 'success' | 'failed';
}

interface PopularQuestion {
  question: string;
  count: number;
}

/* ------------------------------------------------------------------ */
/*  Sub-navigation tabs (shared across all 8 pages)                   */
/* ------------------------------------------------------------------ */

const NAV_TABS = [
  { label: 'Overview', href: '/dashboard/portal-assistant', icon: Brain },
  { label: 'Ask', href: '/dashboard/portal-assistant/ask', icon: MessageSquare },
  { label: 'Search', href: '/dashboard/portal-assistant/search', icon: Search },
  { label: 'Knowledge', href: '/dashboard/portal-assistant/knowledge', icon: BookOpen },
  { label: 'Actions', href: '/dashboard/portal-assistant/actions', icon: Zap },
  { label: 'Automations', href: '/dashboard/portal-assistant/automations', icon: Bot },
  { label: 'Logs', href: '/dashboard/portal-assistant/logs', icon: ScrollText },
  { label: 'Settings', href: '/dashboard/portal-assistant/settings', icon: Settings },
];

export function PortalAssistantNav({ current }: { current: string }) {
  return (
    <nav className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 pb-2 mb-6">
      {NAV_TABS.map((tab) => {
        const Icon = tab.icon;
        const active = current === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-md transition-colors ${
              active
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Fallback Data (used only when API is unreachable)                  */
/* ------------------------------------------------------------------ */

const FALLBACK_STATS: OverviewStats = {
  totalQueriesToday: 0,
  knowledgeArticles: 0,
  activeAutomations: 0,
  searchIndexSize: 0,
};

const FALLBACK_RECENT: RecentQuery[] = [];

const FALLBACK_POPULAR: PopularQuestion[] = [];

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function PortalAssistantOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [recent, setRecent] = useState<RecentQuery[]>([]);
  const [popular, setPopular] = useState<PopularQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchOverviewData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      // Use the available portal-assistant endpoints
      const [suggestionsRes, statsRes] = await Promise.allSettled([
        apiGet<{ success: boolean; data: { suggestions: string[] } }>(
          `/portal-assistant/suggestions?role=${user?.roles?.[0] || ''}&route=/dashboard`
        ),
        apiGet<{ success: boolean; data: OverviewStats }>('/portal-assistant/stats'),
      ]);

      if (signal?.aborted) return;

      // Map suggestions to popular questions format
      if (suggestionsRes.status === 'fulfilled' && suggestionsRes.value?.success && suggestionsRes.value.data?.suggestions) {
        const suggestions = suggestionsRes.value.data.suggestions;
        setPopular(suggestions.map((q: string, i: number) => ({ question: q, count: 0 })));
      } else {
        setPopular(FALLBACK_POPULAR);
      }

      // Set stats if available
      if (statsRes.status === 'fulfilled' && statsRes.value?.success && statsRes.value.data) {
        setStats(statsRes.value.data);
      } else {
        setStats(FALLBACK_STATS);
      }

      // Recent queries are not available from a dedicated endpoint; set empty
      setRecent(FALLBACK_RECENT);
    } catch {
      if (!signal?.aborted) {
        setError('Failed to load assistant data. Some features may be unavailable.');
        setStats(FALLBACK_STATS);
        setRecent(FALLBACK_RECENT);
        setPopular(FALLBACK_POPULAR);
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [user?.roles]);

  useEffect(() => {
    const controller = new AbortController();
    fetchOverviewData(controller.signal);
    return () => { controller.abort(); };
  }, [fetchOverviewData, refreshKey]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  /* Stat cards config */
  const statCards = stats
    ? [
        { label: 'Queries Today', value: stats.totalQueriesToday, icon: MessageSquare, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
        { label: 'Knowledge Articles', value: stats.knowledgeArticles, icon: BookOpen, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
        { label: 'Active Automations', value: stats.activeAutomations, icon: Bot, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30' },
        { label: 'Search Index Size', value: stats.searchIndexSize.toLocaleString(), icon: Database, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
      ]
    : [];

  /* Quick action cards */
  const quickActions = [
    { label: 'Ask Assistant', description: 'Chat with the portal assistant', href: '/dashboard/portal-assistant/ask', icon: MessageSquare, color: 'border-blue-500' },
    { label: 'Universal Search', description: 'Search across all entities', href: '/dashboard/portal-assistant/search', icon: Search, color: 'border-emerald-500' },
    { label: 'Knowledge Base', description: 'Browse SOPs and guides', href: '/dashboard/portal-assistant/knowledge', icon: BookOpen, color: 'border-purple-500' },
    { label: 'Quick Actions', description: 'Launch common operations', href: '/dashboard/portal-assistant/actions', icon: Zap, color: 'border-amber-500' },
    { label: 'Automations', description: 'Manage automation rules', href: '/dashboard/portal-assistant/automations', icon: Bot, color: 'border-rose-500' },
    { label: 'Logs', description: 'View activity trail', href: '/dashboard/portal-assistant/logs', icon: ScrollText, color: 'border-cyan-500' },
  ];

  /* -------------------------------------------------------------- */
  /*  Render                                                         */
  /* -------------------------------------------------------------- */

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PortalAssistantNav current="/dashboard/portal-assistant" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Portal Assistant</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            AI-powered operations hub for your drop zone
          </p>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-500 dark:text-gray-400">Loading assistant data...</span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 mb-6">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!loading && (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {statCards.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className={`${s.bg} rounded-xl p-5`}>
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className={`w-5 h-5 ${s.color}`} />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{s.label}</span>
                  </div>
                  <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              );
            })}
          </div>

          {/* Quick Actions Grid */}
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.href}
                  href={a.href}
                  className={`flex items-center gap-4 p-4 bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border-l-4 ${a.color} shadow-sm hover:shadow-md transition-shadow`}
                >
                  <Icon className="w-6 h-6 text-gray-600 dark:text-gray-400 dark:text-gray-300" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">{a.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{a.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </Link>
              );
            })}
          </div>

          {/* Two-column: Recent Activity + Popular Questions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Activity Feed */}
            <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Recent Activity
                </h3>
                <Link
                  href="/dashboard/portal-assistant/logs"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View all
                </Link>
              </div>
              {recent.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 dark:text-gray-400 py-8 text-center">No recent activity</p>
              ) : (
                <ul className="space-y-3">
                  {recent.map((r) => (
                    <li key={r.id} className="flex items-start gap-3">
                      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${r.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{r.query}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400">
                          {r.user} &middot; {formatTime(r.timestamp)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Popular Questions */}
            <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" /> Popular Questions
                </h3>
                <Link
                  href="/dashboard/portal-assistant/ask"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Ask now
                </Link>
              </div>
              {popular.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 dark:text-gray-400 py-8 text-center">No data yet</p>
              ) : (
                <ul className="space-y-3">
                  {popular.map((q, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 dark:text-gray-400 w-5 text-right">{i + 1}</span>
                      <Link
                        href={`/dashboard/portal-assistant/ask?q=${encodeURIComponent(q.question)}`}
                        className="flex-1 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 truncate"
                      >
                        {q.question}
                      </Link>
                      <span className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 tabular-nums">{q.count} asks</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
