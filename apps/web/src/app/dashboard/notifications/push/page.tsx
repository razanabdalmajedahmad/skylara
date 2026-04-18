'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import { StatusBadge, PageLoading } from '@/components/onboarding/shared';
import type { PushEvent } from '@/lib/notifications/types';
import { Smartphone } from 'lucide-react';

export default function PushPage() {
  const [data, setData] = useState<PushEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setData(await apiGet<PushEvent[]>('/notifications/push')); } catch { setData([]); }
      setLoading(false);
    })();
  }, []);

  if (loading) return <PageLoading label="Loading push devices..." />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{data.length} registered push devices</h3>
      </div>
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">User</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Platform</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Token</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">App Version</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Last Sent</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.user}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${p.platform === 'iOS' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'}`}>
                    <Smartphone className="w-3 h-3" /> {p.platform}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-mono">{p.token}</td>
                <td className="px-4 py-3 text-center"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-center text-xs text-gray-500 dark:text-gray-400">{p.appVersion}</td>
                <td className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400">{new Date(p.lastSent).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
