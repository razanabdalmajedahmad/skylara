'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';
import { Shield, Loader2, CheckCircle2, AlertTriangle, Clock, ArrowLeft } from 'lucide-react';

export default function ReviewQueuePage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchQueue() {
    try {
      const res = await apiGet('/verifications/review-queue');
      setQueue(res?.data?.queue ?? []);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { fetchQueue(); }, []);

  async function verifyItem(entityType: string, entityId: number, status: string) {
    try {
      await apiPost('/verifications', { entityType, entityId, status, source: 'Dashboard review' });
      fetchQueue();
    } catch (err) {
      console.error('Verification failed:', err);
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center h-[60vh]">
      <Loader2 size={32} className="text-secondary-500 animate-spin" />
    </div>
  );

  return (
    <RouteGuard allowedRoles={[...ROLE_GROUPS.OPERATIONS, ...ROLE_GROUPS.SAFETY]}>
      <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <Link href="/dashboard/compliance/verifications" className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 no-underline text-sm mb-4 hover:text-gray-700 dark:hover:text-gray-300">
            <ArrowLeft size={16} /> Back to Verifications
          </Link>

          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            <AlertTriangle size={22} className="inline-block align-middle mr-2 text-amber-500 dark:text-amber-400" />
            Review Queue
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">
            {queue.length} item{queue.length !== 1 ? 's' : ''} need review — expired or flagged verifications
          </p>

          {queue.length === 0 ? (
            <div className="text-center py-16 text-emerald-500 dark:text-emerald-400">
              <CheckCircle2 size={48} strokeWidth={1.5} className="mb-4 mx-auto" />
              <p className="text-base font-semibold">Queue is clear — all verifications current.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {queue.map(item => (
                <div key={item.id} className={`bg-white dark:bg-slate-800 rounded-xl p-4 border ${item.status === 'VER_EXPIRED' ? 'border-red-500/25 dark:border-red-400/25' : 'border-amber-500/25 dark:border-amber-400/25'}`}>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-2.5">
                    <div>
                      <div className="font-semibold text-[15px] text-gray-900 dark:text-white">
                        {item.entityType} #{item.entityId}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400 text-[13px] mt-0.5">
                        Status: <span className={`px-1.5 py-px rounded font-semibold text-xs ${item.status === 'VER_EXPIRED' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'}`}>{item.status}</span>
                        {item.expiresAt && <span> · Expired {new Date(item.expiresAt).toLocaleDateString()}</span>}
                        {item.verificationSource && <span> · Source: {item.verificationSource}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => verifyItem(item.entityType, item.entityId, 'STAFF_VERIFIED')} className="px-3.5 py-1.5 rounded-md border border-emerald-500 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 cursor-pointer text-xs font-medium flex items-center gap-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50">
                        <CheckCircle2 size={14} /> Verify
                      </button>
                      <button onClick={() => verifyItem(item.entityType, item.entityId, 'REVIEW_REQUIRED')} className="px-3.5 py-1.5 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 cursor-pointer text-xs flex items-center gap-1 hover:bg-gray-50 dark:hover:bg-slate-700">
                        <Clock size={14} /> Defer
                      </button>
                    </div>
                  </div>
                  {item.evidenceNote && (
                    <div className="text-[13px] text-gray-500 dark:text-gray-400 italic px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                      {item.evidenceNote}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RouteGuard>
  );
}
