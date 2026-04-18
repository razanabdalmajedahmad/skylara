'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import { StatusBadge, ChannelIcon, PageLoading } from '@/components/onboarding/shared';
import type { TransactionalEvent } from '@/lib/notifications/types';

export default function TransactionalPage() {
  const [data, setData] = useState<TransactionalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setData(await apiGet<TransactionalEvent[]>('/notifications/transactional')); } catch { setData([]); }
      setLoading(false);
    })();
  }, []);

  if (loading) return <PageLoading label="Loading transactional events..." />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{data.length} transactional events</h3>
      </div>
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">User</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Event Type</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Channel</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Metadata</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Sent At</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{e.user}</td>
                <td className="px-4 py-3"><span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">{e.eventType}</span></td>
                <td className="px-4 py-3 text-center"><ChannelIcon channel={e.channel} /></td>
                <td className="px-4 py-3 text-center"><StatusBadge status={e.status} /></td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{e.metadata}</td>
                <td className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400">{new Date(e.sentAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
