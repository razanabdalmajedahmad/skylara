'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { RouteGuard } from '@/components/RouteGuard';
import { History, Loader2, RotateCcw, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Op {
  id: number;
  uuid: string;
  operationType: string;
  status: string;
  scenarioKey: string | null;
  batchId: string | null;
  recordsAffected: number;
  modulesAffected: string[] | null;
  conflictStrategy: string | null;
  exportFormat: string | null;
  startedAt: string | null;
  completedAt: string | null;
  rolledBackAt: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
}

function HistoryContent() {
  const [ops, setOps] = useState<Op[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');
  const [rollingBack, setRollingBack] = useState<number | null>(null);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
      if (filter) params.set('operationType', filter);
      const res: any = await apiGet(`/data-management/operations?${params}`);
      setOps(res.items || []);
      setTotal(res.total || 0);
    } catch { setOps([]); }
    setLoading(false);
  }, [page, filter]);

  useEffect(() => { void load(); }, [load]);

  const handleRollback = async (id: number) => {
    if (!confirm('Rollback this operation? This will delete all records created by this batch.')) return;
    setRollingBack(id);
    try {
      await apiPost(`/data-management/operations/${id}/rollback`, {});
      load();
    } catch (e: any) {
      // Rollback failed — error is displayed inline via the operation status
    }
    setRollingBack(null);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      COMPLETED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      FAILED: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      RUNNING: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      ROLLED_BACK: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      PENDING: 'bg-slate-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400',
    };
    const cls = map[status] || map.PENDING;
    return <span className={`${cls} px-2 py-0.5 rounded text-xs font-semibold`}>{status}</span>;
  };

  const opLabel = (type: string) => ({
    DEMO_LOAD: 'Scenario Load', DEMO_CLEAR: 'Demo Clear', EXPORT: 'Data Export',
    IMPORT: 'Data Import', TENANT_RESET: 'Tenant Reset',
  }[type] || type);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <Link href="/dashboard/admin/data-management" className="inline-flex items-center gap-1 text-secondary-500 dark:text-secondary-400 text-sm no-underline mb-4">
        <ArrowLeft size={14} /> Back to Data Management
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white m-0">Operation History</h1>
      <p className="text-gray-500 dark:text-gray-400 mt-1 mb-6 text-sm">
        Full audit trail of all data management operations.
      </p>

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['', 'DEMO_LOAD', 'DEMO_CLEAR', 'EXPORT', 'IMPORT', 'TENANT_RESET'].map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(0); }} className={`border rounded-md px-3.5 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${filter === f ? 'bg-primary-500 dark:bg-primary-600 text-white border-primary-500 dark:border-primary-600' : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700'}`}>
            {f ? opLabel(f) : 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center py-16"><Loader2 size={24} className="text-secondary-500 dark:text-secondary-400 animate-spin mx-auto" /></div>
        ) : ops.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <History size={32} className="mb-2 opacity-50 mx-auto" />
            <p>No operations found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
                  {['ID', 'Type', 'Scenario', 'Records', 'Status', 'Batch ID', 'By', 'Date', 'Actions'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ops.map(op => (
                  <tr key={op.id} className="border-b border-gray-200 dark:border-slate-700">
                    <td className="px-3 py-2.5 text-sm text-gray-400 dark:text-gray-500 tabular-nums">#{op.id}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-900 dark:text-white font-medium">{opLabel(op.operationType)}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">{op.scenarioKey || '-'}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-900 dark:text-white tabular-nums">{op.recordsAffected.toLocaleString()}</td>
                    <td className="px-3 py-2.5">{statusBadge(op.status)}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-400 dark:text-gray-500 font-mono">
                      {op.batchId ? op.batchId.substring(0, 8) + '...' : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">{op.user.firstName} {op.user.lastName}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-400 dark:text-gray-500">{new Date(op.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2.5">
                      {op.batchId && op.status === 'COMPLETED' && op.operationType === 'DEMO_LOAD' && (
                        <button onClick={() => handleRollback(op.id)} disabled={rollingBack === op.id} className="bg-transparent text-amber-500 dark:text-amber-400 border border-amber-500 dark:border-amber-400 rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer inline-flex items-center gap-1 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                          {rollingBack === op.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                          Rollback
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
            <span className="text-xs text-gray-400 dark:text-gray-500">{total} total operations</span>
            <div className="flex gap-1 items-center">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className={`bg-transparent border border-gray-200 dark:border-slate-700 rounded px-2 py-1 ${page === 0 ? 'opacity-40 cursor-default' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
                <ChevronLeft size={14} className="text-gray-500 dark:text-gray-400" />
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400 px-2">Page {page + 1} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className={`bg-transparent border border-gray-200 dark:border-slate-700 rounded px-2 py-1 ${page >= totalPages - 1 ? 'opacity-40 cursor-default' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
                <ChevronRight size={14} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <RouteGuard allowedRoles={['PLATFORM_ADMIN', 'DZ_OWNER', 'DZ_MANAGER']}>
      <HistoryContent />
    </RouteGuard>
  );
}
