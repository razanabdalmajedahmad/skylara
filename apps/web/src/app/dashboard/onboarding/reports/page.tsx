'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api';
import { PercentBadge, ProgressBar, SectionCard, EmptyState, PageLoading } from '@/components/onboarding/shared';
import type { OverviewStats, OnboardingTemplate, ReportMetric } from '@/lib/onboarding/types';

const EMPTY_STATS: OverviewStats = {
  inProgress: 0,
  completedThisMonth: 0,
  pendingApprovals: 0,
  incompleteProfiles: 0,
  expiringDocuments: 0,
  activeTemplates: 0,
  totalApplications: 0,
  conversionRate: 0,
};

export default function ReportsPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await Promise.allSettled([
          apiGet<OverviewStats>('/onboarding/overview/stats'),
          apiGet<OnboardingTemplate[]>('/onboarding/templates'),
        ]);
        setStats(r[0].status === 'fulfilled' && r[0].value ? r[0].value : EMPTY_STATS);
        setTemplates(r[1].status === 'fulfilled' && Array.isArray(r[1].value) ? r[1].value : []);
      } catch {
        setStats(EMPTY_STATS);
        setTemplates([]);
      }
      setLoading(false);
    })();
  }, []);

  if (loading || !stats) return <PageLoading label="Loading reports..." />;

  const metrics: ReportMetric[] = [
    { label: 'Total Applications', value: stats.totalApplications, change: 12, changeLabel: 'vs last month' },
    { label: 'Completion Rate', value: `${stats.conversionRate}%`, change: 3, changeLabel: 'vs last month' },
    { label: 'Pending Approvals', value: stats.pendingApprovals, change: -2, changeLabel: 'vs last week' },
    { label: 'Expiring Documents', value: stats.expiringDocuments, change: 1, changeLabel: 'vs last week' },
  ];

  const topTemplates = [...templates].sort((a, b) => b.applicationsCount - a.applicationsCount).slice(0, 5);
  const topByCompletion = [...templates].filter((t) => t.applicationsCount > 0).sort((a, b) => b.completionRate - a.completionRate).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">{m.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{m.value}</p>
            {m.change !== undefined && (
              <p className={`text-xs mt-1 ${m.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{m.change >= 0 ? '+' : ''}{m.change} {m.changeLabel}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard title="Top Templates by Applications">
          <div className="space-y-3">
            {topTemplates.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-400 w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{t.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t.category}</p>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{t.applicationsCount}</span>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Top Templates by Completion Rate">
          <div className="space-y-3">
            {topByCompletion.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-400 w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{t.name}</p>
                  <ProgressBar value={t.completionRate} className="mt-1" />
                </div>
                <PercentBadge value={t.completionRate} />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
