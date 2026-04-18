'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiGet } from '@/lib/api';
import { StatusBadge, FilterChips, ChannelIcon, PageLoading } from '@/components/onboarding/shared';
import type { NotificationItem, FilterChip, StatusColor } from '@/lib/onboarding/types';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function OnboardingNotificationsPage() {
  const [data, setData] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const filters: FilterChip[] = [{ label: 'All', value: 'all' }, { label: 'Active', value: 'ACTIVE' }, { label: 'Draft', value: 'DRAFT' }, { label: 'Completed', value: 'COMPLETED' }, { label: 'Paused', value: 'PAUSED' }];

  useEffect(() => {
    (async () => {
      try {
        const raw = await apiGet<any[]>('/notifications/campaigns');
        setData(raw.map((c: any) => ({
          id: c.id,
          campaignName: c.name,
          channel: Array.isArray(c.channels) ? c.channels[0] || 'EMAIL' : 'EMAIL',
          segmentName: c.segmentName || 'All',
          status: c.status,
          sentCount: c.sent || 0,
          openRate: c.sent > 0 ? Math.round(((c.opened || 0) / c.sent) * 100) : 0,
          createdAt: c.createdAt,
        })));
      } catch {
        setData([]);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => filter === 'all' ? data : data.filter((n) => n.status === filter), [data, filter]);

  const statusColor = (s: string): StatusColor => {
    switch (s) { case 'ACTIVE': return 'green'; case 'DRAFT': return 'yellow'; case 'COMPLETED': return 'blue'; case 'PAUSED': return 'orange'; case 'SCHEDULED': return 'purple'; default: return 'gray'; }
  };

  if (loading) return <PageLoading label="Loading notifications..." />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <FilterChips chips={filters} active={filter} onToggle={setFilter} />
        <Link href="/dashboard/notifications/campaigns" className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors self-start">
          <Plus className="w-4 h-4" /> Go to Notification Center
        </Link>
      </div>
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Campaign</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Channel</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Segment</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Sent</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Open Rate</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map((n) => (
              <tr key={n.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{n.campaignName}</td>
                <td className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1"><ChannelIcon channel={n.channel} /><span className="text-xs">{n.channel}</span></div></td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">{n.segmentName}</td>
                <td className="px-4 py-3 text-center"><StatusBadge status={statusColor(n.status)} label={n.status} /></td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{n.sentCount}</td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{n.openRate}%</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">No campaigns found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
