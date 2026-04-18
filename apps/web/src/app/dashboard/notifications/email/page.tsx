'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import { StatusBadge, PageLoading } from '@/components/onboarding/shared';
import type { EmailEvent } from '@/lib/notifications/types';

export default function EmailPage() {
  const [data, setData] = useState<EmailEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setData(await apiGet<EmailEvent[]>('/notifications/email')); } catch { setData([]); }
      setLoading(false);
    })();
  }, []);

  if (loading) return <PageLoading label="Loading email events..." />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{data.length} email events</h3>
      </div>
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">User</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Subject</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Sent At</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Opened At</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Bounce Reason</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{e.user}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs max-w-[200px] truncate">{e.subject}</td>
                <td className="px-4 py-3 text-center"><StatusBadge status={e.status} /></td>
                <td className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400">{new Date(e.sentAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400">{e.openedAt ? new Date(e.openedAt).toLocaleString() : '-'}</td>
                <td className="px-4 py-3 text-xs text-red-600">{e.bouncedReason || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
