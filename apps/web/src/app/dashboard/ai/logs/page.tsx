'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ScrollText,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Search,
  Filter,
  MessageSquare,
  Zap,
  XCircle,
  CheckCircle,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';

interface AILogEntry {
  id: string;
  timestamp: string;
  type: 'query' | 'automation' | 'error';
  user: string;
  userId: string;
  query: string;
  responseSummary: string;
  status: 'success' | 'failed' | 'partial';
  durationMs: number;
  metadata?: Record<string, string>;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  query: { label: 'Query', icon: MessageSquare, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  automation: { label: 'Automation', icon: Zap, className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  error: { label: 'Error', icon: XCircle, className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  success: { label: 'Success', icon: CheckCircle, className: 'text-green-600 dark:text-green-400' },
  failed: { label: 'Failed', icon: XCircle, className: 'text-red-600 dark:text-red-400' },
  partial: { label: 'Partial', icon: AlertCircle, className: 'text-amber-600 dark:text-amber-400' },
};

// Fallback: empty — AI logs come from the API
const FALLBACK_LOGS: AILogEntry[] = [];

const PAGE_SIZE = 10;

export default function AILogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AILogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const response = await apiGet<{ data: AILogEntry[] }>('/ai/logs');
        if (response?.data && Array.isArray(response.data)) {
          setLogs(response.data);
        } else {
          setLogs([]);
        }
      } catch (err) {
        console.error('Failed to fetch logs:', err);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const uniqueUsers = useMemo(() => {
    const users = new Set(logs.map((l) => l.user));
    return Array.from(users).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.responseSummary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || log.type === filterType;
      const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
      const matchesUser = filterUser === 'all' || log.user === filterUser;

      let matchesDate = true;
      if (dateFrom) {
        matchesDate = matchesDate && new Date(log.timestamp) >= new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && new Date(log.timestamp) <= toDate;
      }

      return matchesSearch && matchesType && matchesStatus && matchesUser && matchesDate;
    });
  }, [logs, searchQuery, filterType, filterStatus, filterUser, dateFrom, dateTo]);

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, filterStatus, filterUser, dateFrom, dateTo]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await apiGet<{ data: AILogEntry[] }>('/ai/logs');
      if (response?.data) setLogs(response.data);
    } catch (err) {
      // keep existing data
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6">
        <Link
          href="/dashboard/ai"
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white dark:hover:text-white mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to AI Hub
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <ScrollText className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Activity Logs</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-300">
                {filteredLogs.length} entries {filteredLogs.length !== logs.length && `(filtered from ${logs.length})`}
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="query">Query</option>
              <option value="automation">Automation</option>
              <option value="error">Error</option>
            </select>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Users</option>
              {uniqueUsers.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="From"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="To"
              />
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Timestamp</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Query / Action</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Response</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {paginatedLogs.map((log) => {
                  const typeConfig = TYPE_CONFIG[log.type];
                  const statusConfig = STATUS_CONFIG[log.status];
                  const TypeIcon = typeConfig.icon;
                  const StatusIcon = statusConfig.icon;
                  const isExpanded = expandedId === log.id;

                  return (
                    <>
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                            <span className="text-gray-400">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${typeConfig.className}`}>
                            <TypeIcon className="w-3 h-3" />
                            {typeConfig.label}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-gray-400" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{log.user}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-sm text-gray-900 dark:text-white truncate max-w-xs">{log.query}</p>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{log.responseSummary}</p>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <StatusIcon className={`w-4 h-4 ${statusConfig.className}`} />
                            <span className={`text-xs font-medium ${statusConfig.className}`}>{statusConfig.label}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          >
                            <Eye className="w-4 h-4 text-gray-400" />
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${log.id}_detail`}>
                          <td colSpan={7} className="px-5 py-4 bg-gray-50 dark:bg-gray-800/50">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Full Query</p>
                                <p className="text-gray-600 dark:text-gray-400">{log.query}</p>
                              </div>
                              <div>
                                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Full Response</p>
                                <p className="text-gray-600 dark:text-gray-400">{log.responseSummary}</p>
                              </div>
                              <div>
                                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Duration</p>
                                <p className="text-gray-600 dark:text-gray-400">{log.durationMs}ms</p>
                              </div>
                              <div>
                                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">User ID</p>
                                <p className="text-gray-600 dark:text-gray-400 font-mono text-xs">{log.userId}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
            {paginatedLogs.map((log) => {
              const typeConfig = TYPE_CONFIG[log.type];
              const statusConfig = STATUS_CONFIG[log.status];
              const TypeIcon = typeConfig.icon;
              const StatusIcon = statusConfig.icon;

              return (
                <div key={log.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${typeConfig.className}`}>
                      <TypeIcon className="w-3 h-3" />
                      {typeConfig.label}
                    </span>
                    <div className="flex items-center gap-1">
                      <StatusIcon className={`w-4 h-4 ${statusConfig.className}`} />
                      <span className={`text-xs ${statusConfig.className}`}>{statusConfig.label}</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{log.query}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{log.responseSummary}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{log.user}</span>
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                    <span>{log.durationMs}ms</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {filteredLogs.length === 0 && (
            <div className="p-12 text-center">
              <ScrollText className="w-10 h-10 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No logs found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your filters or date range</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                      page === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
