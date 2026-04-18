'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { RouteGuard } from '@/components/RouteGuard';
import { ArrowLeft, Loader2, Clock, User } from 'lucide-react';

export default function PolicyHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        // Fetch all definitions, then history for each (simplified — in production, add a bulk history endpoint)
        const defRes = await apiGet('/policies');
        const defs = defRes?.data?.definitions ?? [];
        const allHistory: any[] = [];
        for (const def of defs.slice(0, 10)) { // limit to avoid too many requests
          const histRes = await apiGet(`/policies/history/${def.id}?limit=5`).catch(() => null);
          if (histRes?.data?.history) {
            for (const h of histRes.data.history) {
              allHistory.push({ ...h, policyKey: def.key, policyLabel: def.label });
            }
          }
        }
        allHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setHistory(allHistory);
      } catch {} finally { setLoading(false); }
    }
    fetch();
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-[60vh]">
      <Loader2 size={32} className="text-secondary-500 animate-spin" />
    </div>
  );

  return (
    <RouteGuard allowedRoles={['DZ_OWNER', 'DZ_MANAGER', 'PLATFORM_ADMIN']}>
      <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <Link href="/dashboard/settings/policies" className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 no-underline text-sm mb-4 hover:text-gray-700 dark:hover:text-gray-300">
            <ArrowLeft size={16} /> Back to Policy Center
          </Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-5">Policy Audit History</h1>

          {history.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500">No policy changes recorded yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {history.map((h, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-gray-200 dark:border-slate-700">
                  <div className="flex justify-between mb-1.5">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">{h.policyLabel ?? h.policyKey}</span>
                    <span className="text-gray-400 dark:text-gray-500 text-xs flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(h.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[13px] text-gray-500 dark:text-gray-400">
                    <span className="text-gray-400 dark:text-gray-500">Scope:</span> {h.scope}
                    {h.reason && <span> · <span className="text-gray-400 dark:text-gray-500">Reason:</span> {h.reason}</span>}
                  </div>
                  <div className="flex gap-4 mt-1.5 text-xs">
                    <span className="text-gray-400 dark:text-gray-500">Before: <code className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-1 py-px rounded">{JSON.stringify(h.previousValue)}</code></span>
                    <span className="text-gray-400 dark:text-gray-500">After: <code className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-1 py-px rounded">{JSON.stringify(h.newValue)}</code></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RouteGuard>
  );
}
