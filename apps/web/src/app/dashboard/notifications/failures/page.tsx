'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { ChannelIcon, EmptyState, PageLoading } from '@/components/onboarding/shared';
import type { FailureItem } from '@/lib/notifications/types';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function FailuresPage() {
  const [failures, setFailures] = useState<FailureItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setFailures(await apiGet<FailureItem[]>('/notifications/failures')); } catch { setFailures([]); }
      setLoading(false);
    })();
  }, []);

  const handleRetry = async (id: string) => {
    try { await apiPost(`/notifications/failures/${id}/retry`); } catch {}
    setFailures(prev => prev.filter(f => f.id !== id));
  };

  const handleDismiss = (id: string) => {
    setFailures(prev => prev.filter(f => f.id !== id));
  };

  if (loading) return <PageLoading label="Loading failures..." />;

  if (failures.length === 0) {
    return <EmptyState message="No delivery failures. All messages delivered successfully!" icon={<CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />} />;
  }

  return (
    <div className="space-y-3">
      {failures.map((f) => (
        <div key={f.id} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <p className="font-medium text-gray-900 dark:text-white">{f.user}</p>
              <ChannelIcon channel={f.channel} />
            </div>
            <span className="text-xs text-gray-400">Attempts: {f.attempts}</span>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400">{f.failureReason}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Event: {f.eventType} &middot; Last: {new Date(f.lastAttempt).toLocaleString()}</p>
          <div className="flex gap-2 mt-3">
            <button onClick={() => handleRetry(f.id)} className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">Retry</button>
            <button onClick={() => handleDismiss(f.id)} className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Dismiss</button>
          </div>
        </div>
      ))}
    </div>
  );
}
