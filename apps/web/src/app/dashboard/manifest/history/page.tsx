'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';
import {
  Plane,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
} from 'lucide-react';

interface HistoryLoad {
  id: number;
  loadNumber: string;
  status: string;
  aircraftRegistration: string;
  pilotName: string;
  slotCount: number;
  scheduledAt: string;
  completedAt: string | null;
}

function ManifestHistoryContent() {
  const [loads, setLoads] = useState<HistoryLoad[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '25', status: 'COMPLETE,CANCELLED' });
        if (dateFilter) params.set('date', dateFilter);
        const res = await apiGet(`/manifest/loads?${params}`);
        const data = res?.data;
        setLoads(data?.loads ?? data ?? []);
        setTotalPages(data?.totalPages ?? 1);
      } catch {
        setLoads([]);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [page, dateFilter]);

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Load History</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              Completed and cancelled loads
            </p>
          </div>
          <div className="flex gap-2.5 items-center">
            <Calendar size={16} className="text-gray-500 dark:text-gray-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={32} className="text-secondary-500 animate-spin" />
          </div>
        ) : loads.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <p className="text-base">No history found{dateFilter ? ` for ${dateFilter}` : ''}.</p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                      {['Load', 'Status', 'Aircraft', 'Pilot', 'Jumpers', 'Scheduled', 'Completed'].map((h) => (
                        <th
                          key={h}
                          className="px-3.5 py-2.5 text-left text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loads.map((load) => (
                      <tr key={load.id} className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-3.5 py-2.5">
                          <Link href={`/dashboard/manifest/${load.id}`} className="text-primary-500 dark:text-primary-400 font-semibold no-underline hover:underline">
                            {load.loadNumber}
                          </Link>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                            load.status === 'COMPLETE'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {load.status === 'COMPLETE'
                              ? <CheckCircle2 size={12} className="inline align-middle mr-0.5" />
                              : <XCircle size={12} className="inline align-middle mr-0.5" />
                            }
                            {load.status}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-gray-900 dark:text-white">{load.aircraftRegistration}</td>
                        <td className="px-3.5 py-2.5 text-gray-900 dark:text-white">{load.pilotName ?? '—'}</td>
                        <td className="px-3.5 py-2.5 text-gray-900 dark:text-white">{load.slotCount}</td>
                        <td className="px-3.5 py-2.5 text-gray-500 dark:text-gray-400">
                          {new Date(load.scheduledAt).toLocaleDateString()} {new Date(load.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-3.5 py-2.5 text-gray-500 dark:text-gray-400">
                          {load.completedAt ? new Date(load.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50 disabled:cursor-default cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <ChevronLeft size={16} className="text-gray-500 dark:text-gray-400" />
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50 disabled:cursor-default cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <ChevronRight size={16} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ManifestHistoryPage() {
  return (
    <RouteGuard allowedRoles={ROLE_GROUPS.MANIFEST}>
      <ManifestHistoryContent />
    </RouteGuard>
  );
}
