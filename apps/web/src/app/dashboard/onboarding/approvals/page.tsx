'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import { StatusBadge, FilterChips, EmptyState, PageLoading } from '@/components/onboarding/shared';
import type { ApprovalItem, FilterChip, StatusColor, Toast } from '@/lib/onboarding/types';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ApprovalsPage() {
  const [data, setData] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const filters: FilterChip[] = [{ label: 'All', value: 'all' }, { label: 'Urgent', value: 'urgent' }, { label: 'High', value: 'high' }, { label: 'Normal', value: 'normal' }];

  useEffect(() => {
    (async () => {
      try {
        const raw = await apiGet<ApprovalItem[]>('/onboarding/approvals');
        setData(Array.isArray(raw) ? raw : []);
      } catch {
        setData([]);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => filter === 'all' ? data : data.filter((a) => a.priority === filter), [data, filter]);

  const priorityColor = (p: string): StatusColor => p === 'urgent' ? 'red' : p === 'high' ? 'orange' : 'blue';

  const handleAction = async (action: string, item: ApprovalItem) => {
    const statusMap: Record<string, string> = { approve: 'APPROVED', reject: 'REJECTED', request_info: 'DOCUMENTS_MISSING' };
    const newStatus = statusMap[action];
    if (!newStatus) return;
    try {
      await apiPatch(`/onboarding/applications/${item.id}/status`, { status: newStatus });
    } catch {
      /* surface via toast in a later pass */
    }
    if (action === 'approve' || action === 'reject') {
      setData((prev) => prev.filter((a) => a.id !== item.id));
    } else {
      setData((prev) => prev.map((a) => a.id === item.id ? { ...a, description: `${a.description} (Info Requested)` } : a));
    }
  };

  if (loading) return <PageLoading label="Loading approvals..." />;

  return (
    <div className="space-y-4">
      <FilterChips chips={filters} active={filter} onToggle={setFilter} />
      {filtered.length === 0 ? (
        <EmptyState message="No pending approvals. All caught up!" icon={<CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />} />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.id} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/dashboard/onboarding/approvals/${item.id}`} className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">{item.description}</Link>
                  <StatusBadge status={priorityColor(item.priority)} label={item.priority} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.personName} &middot; {item.itemType} &middot; {item.submittedAt}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => handleAction('approve', item)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors">Approve</button>
                <button onClick={() => handleAction('request_info', item)} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Request Info</button>
                <button onClick={() => handleAction('reject', item)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
