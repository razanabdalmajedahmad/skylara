'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import { StatusBadge, ChannelIcon, PageLoading } from '@/components/onboarding/shared';
import type { DeliveryLogItem } from '@/lib/notifications/types';

export default function DeliveryLogsPage() {
  const [logs, setLogs] = useState<DeliveryLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setLogs(await apiGet<DeliveryLogItem[]>('/notifications/delivery-logs')); } catch { setLogs([]); }
      setLoading(false);
    })();
  }, []);

  if (loading) return <PageLoading label="Loading delivery logs..." />;

  return (
    <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">User</th>
          <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Channel</th>
          <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Event</th>
          <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
          <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Sent</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {logs.map((dl) => (
            <tr key={dl.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{dl.user}</td>
              <td className="px-4 py-3 text-center"><ChannelIcon channel={dl.channel} /></td>
              <td className="px-4 py-3 text-xs"><span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{dl.eventType}</span></td>
              <td className="px-4 py-3 text-center"><StatusBadge status={dl.status} /></td>
              <td className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400">{new Date(dl.sentAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
