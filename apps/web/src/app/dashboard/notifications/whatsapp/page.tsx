'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import { StatusBadge, PageLoading } from '@/components/onboarding/shared';
import type { WhatsAppEvent } from '@/lib/notifications/types';
import { MessageSquare } from 'lucide-react';

export default function WhatsAppPage() {
  const [data, setData] = useState<WhatsAppEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setData(await apiGet<WhatsAppEvent[]>('/notifications/whatsapp')); } catch { setData([]); }
      setLoading(false);
    })();
  }, []);

  if (loading) return <PageLoading label="Loading WhatsApp events..." />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{data.length} WhatsApp messages</h3>
      </div>
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">User</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Phone</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Template</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Consent</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Sent At</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.map((w) => (
              <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{w.user}</td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{w.phone}</td>
                <td className="px-4 py-3"><span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">{w.templateName}</span></td>
                <td className="px-4 py-3 text-center"><StatusBadge status={w.status} /></td>
                <td className="px-4 py-3 text-center"><StatusBadge status={w.consentStatus === 'OPTED_IN' ? 'green' : 'red'} label={w.consentStatus === 'OPTED_IN' ? 'Opted In' : 'Not Opted In'} /></td>
                <td className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400">{new Date(w.sentAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
