'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api';
import { PortalAssistantNav } from '../page';
import {
  ScrollText,
  Download,
  Filter,
  Check,
  Copy,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  MessageSquare,
  Search,
  Zap,
  Bot,
  XCircle,
  Clock,
  BarChart3,
  User,
  TrendingUp,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type LogType = 'query' | 'search' | 'action' | 'automation' | 'error';
type LogStatus = 'success' | 'failed';

interface LogEntry {
  id: string;
  timestamp: string;
  type: LogType;
  user: string;
  queryOrAction: string;
  responseSummary: string;
  durationMs: number;
  status: LogStatus;
}

interface LogStats {
  totalQueries: number;
  avgResponseTimeMs: number;
  successRate: number;
  mostActiveUser: string;
}

/* ------------------------------------------------------------------ */
/*  Fallback — empty defaults (data comes from API)                    */
/* ------------------------------------------------------------------ */

const FALLBACK_LOGS: LogEntry[] = [];

const FALLBACK_STATS: LogStats = {
  totalQueries: 0,
  avgResponseTimeMs: 0,
  successRate: 0,
  mostActiveUser: '-',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const TYPE_CONFIG: Record<LogType, { icon: React.ElementType; color: string; label: string }> = {
  query: { icon: MessageSquare, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', label: 'Query' },
  search: { icon: Search, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', label: 'Search' },
  action: { icon: Zap, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Action' },
  automation: { icon: Bot, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', label: 'Automation' },
  error: { icon: XCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: 'Error' },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 10;

export default function LogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats>({ totalQueries: 0, avgResponseTimeMs: 0, successRate: 0, mostActiveUser: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState<LogType | 'all'>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<LogStatus | 'all'>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiGet<LogEntry[]>('/assistant/logs');
        if (!cancelled && Array.isArray(data)) {
          setLogs(data);
        } else if (!cancelled) {
          setLogs([]);
        }
      } catch {
        if (!cancelled) setLogs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const uniqueUsers = useMemo(() => Array.from(new Set(logs.map((l) => l.user))).sort(), [logs]);

  const filtered = useMemo(() => {
    let items = logs;
    if (typeFilter !== 'all') items = items.filter((l) => l.type === typeFilter);
    if (userFilter !== 'all') items = items.filter((l) => l.user === userFilter);
    if (statusFilter !== 'all') items = items.filter((l) => l.status === statusFilter);
    return items;
  }, [logs, typeFilter, userFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = () => {
    const header = 'Timestamp,Type,User,Query/Action,Response Summary,Duration (ms),Status';
    const rows = filtered.map((l) =>
      `"${l.timestamp}","${l.type}","${l.user}","${l.queryOrAction.replace(/"/g, '""')}","${l.responseSummary.replace(/"/g, '""')}",${l.durationMs},"${l.status}"`
    );
    const csv = [header, ...rows].join('\n');
    navigator.clipboard.writeText(csv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PortalAssistantNav current="/dashboard/portal-assistant/logs" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Logs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Assistant activity and audit trail</p>
        </div>
        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Download className="w-4 h-4" />}
          {copied ? 'Copied CSV' : 'Export CSV'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Total Queries</span>
          </div>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.totalQueries}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Avg Response</span>
          </div>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.avgResponseTimeMs}ms</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Success Rate</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.successRate}%</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Most Active</span>
          </div>
          <p className="text-lg font-bold text-purple-700 dark:text-purple-300 truncate">{stats.mostActiveUser}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as LogType | 'all'); setPage(1); }}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="query">Query</option>
          <option value="search">Search</option>
          <option value="action">Action</option>
          <option value="automation">Automation</option>
          <option value="error">Error</option>
        </select>
        <select
          value={userFilter}
          onChange={(e) => { setUserFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Users</option>
          {uniqueUsers.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as LogStatus | 'all'); setPage(1); }}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
        <span className="self-center text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400">
          {filtered.length} entries
        </span>
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
          <span className="ml-3 text-gray-500 dark:text-gray-400">Loading logs...</span>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <>
          {paged.length === 0 ? (
            <div className="text-center py-16">
              <ScrollText className="w-12 h-12 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No log entries match your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Timestamp</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">User</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Query / Action</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase hidden lg:table-cell">Response</th>
                    <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Duration</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((log) => {
                    const tc = TYPE_CONFIG[log.type];
                    const TypeIcon = tc.icon;
                    return (
                      <tr key={log.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${tc.color}`}>
                            <TypeIcon className="w-3 h-3" /> {tc.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{log.user}</td>
                        <td className="py-3 px-3 text-gray-800 dark:text-gray-200 max-w-xs truncate">{log.queryOrAction}</td>
                        <td className="py-3 px-3 text-gray-500 dark:text-gray-400 max-w-sm truncate hidden lg:table-cell">{log.responseSummary}</td>
                        <td className="py-3 px-3 text-right text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap">
                          {log.durationMs >= 1000 ? `${(log.durationMs / 1000).toFixed(1)}s` : `${log.durationMs}ms`}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {log.status === 'success' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                              <Check className="w-3 h-3" /> OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                              <XCircle className="w-3 h-3" /> Fail
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
