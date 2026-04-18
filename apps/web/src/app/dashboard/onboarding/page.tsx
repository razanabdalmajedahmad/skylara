'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api';
import { Activity, TrendingUp, Clock, CalendarDays, FileStack, Users, Target, AlertTriangle, CheckCircle2, CircleDot, XCircle, BadgeCheck, Zap, Lightbulb, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SectionCard, PageLoading } from '@/components/onboarding/shared';
import type { OverviewStats, RecentActivity } from '@/lib/onboarding/types';
import type { Recommendation } from '@/lib/notifications/types';

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

export default function OnboardingOverviewPage() {
  const [stats, setStats] = useState<OverviewStats>(EMPTY_STATS);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const router = useRouter();

  const recNav: Record<string, string> = {
    'Review Applications': '/dashboard/onboarding/approvals',
    'View Documents': '/dashboard/documents',
    'View Applications': '/dashboard/onboarding/athletes',
    'Create Template': '/dashboard/onboarding/templates',
    'Review Templates': '/dashboard/onboarding/templates',
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setOverviewError(null);
    try {
      const r = await Promise.allSettled([
        apiGet<OverviewStats>('/onboarding/overview/stats'),
        apiGet<RecentActivity[]>('/onboarding/overview/activity'),
        apiGet<Recommendation[]>('/onboarding/recommendations'),
      ]);
      const issues: string[] = [];
      if (r[0].status === 'fulfilled' && r[0].value) {
        setStats(r[0].value);
      } else {
        setStats(EMPTY_STATS);
        issues.push('overview stats');
      }
      if (r[1].status === 'fulfilled' && Array.isArray(r[1].value)) {
        setActivity(r[1].value);
      } else {
        setActivity([]);
        issues.push('activity feed');
      }
      if (r[2].status === 'fulfilled' && Array.isArray(r[2].value)) {
        setRecommendations(r[2].value);
      } else {
        setRecommendations([]);
        issues.push('recommendations');
      }
      setOverviewError(issues.length ? `Some sections failed to load: ${issues.join(', ')}.` : null);
    } catch {
      setStats(EMPTY_STATS);
      setActivity([]);
      setRecommendations([]);
      setOverviewError('Could not load onboarding overview. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <PageLoading label="Loading overview..." />;

  const cards = [
    { label: 'In Progress', value: stats.inProgress, icon: Activity, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' },
    { label: 'Completed This Month', value: stats.completedThisMonth, icon: TrendingUp, color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' },
    { label: 'Pending Approvals', value: stats.pendingApprovals, icon: Clock, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400' },
    { label: 'Expiring Documents', value: stats.expiringDocuments, icon: CalendarDays, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400' },
    { label: 'Active Templates', value: stats.activeTemplates, icon: FileStack, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400' },
    { label: 'Total Applications', value: stats.totalApplications, icon: Users, color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400' },
    { label: 'Conversion Rate', value: `${stats.conversionRate}%`, icon: Target, color: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400' },
    { label: 'Incomplete Profiles', value: stats.incompleteProfiles, icon: AlertTriangle, color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400' },
  ];

  const activityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'started': return <CircleDot className="w-4 h-4 text-blue-500" />;
      case 'action_needed': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'expired': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'approved': return <BadgeCheck className="w-4 h-4 text-green-600" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const recStyle = (type: string) => {
    switch (type) {
      case 'warning': return { bg: 'bg-red-50 dark:bg-red-900/10', icon: AlertTriangle, iconColor: 'text-red-500', btnColor: 'text-red-600 dark:text-red-400' };
      case 'insight': return { bg: 'bg-blue-50 dark:bg-blue-900/10', icon: Lightbulb, iconColor: 'text-blue-500', btnColor: 'text-blue-600 dark:text-blue-400' };
      case 'action': return { bg: 'bg-sky-50 dark:bg-sky-900/10', icon: Zap, iconColor: 'text-sky-500', btnColor: 'text-sky-600 dark:text-sky-400' };
      default: return { bg: 'bg-green-50 dark:bg-green-900/10', icon: Zap, iconColor: 'text-green-500', btnColor: 'text-green-600 dark:text-green-400' };
    }
  };

  return (
    <div className="space-y-6">
      {overviewError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          {overviewError}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
              <div className={`p-1.5 rounded-lg ${c.color} w-fit mb-2`}><Icon className="w-4 h-4" /></div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{c.value}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{c.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard title="Recent Activity">
          <ul className="space-y-2">
            {activity.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-1.5">
                {activityIcon(a.type)}
                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{a.text}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {a.timestamp ? new Date(a.timestamp).toLocaleString() : ''}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="AI Recommendations">
          {recommendations.length === 0 ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              <p className="text-sm text-gray-700 dark:text-gray-300">Everything looks good! No recommendations at this time.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {recommendations.map((rec) => {
                const s = recStyle(rec.type);
                const Icon = s.icon;
                return (
                  <li key={rec.id} className={`flex items-start gap-3 p-3 ${s.bg} rounded-lg`}>
                    <Icon className={`w-4 h-4 ${s.iconColor} mt-0.5 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{rec.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{rec.description}</p>
                      <button onClick={() => recNav[rec.action] && router.push(recNav[rec.action])} className={`mt-2 flex items-center gap-1 text-xs font-medium ${s.btnColor} hover:underline`}>
                        {rec.action} <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    {rec.priority === 'high' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 rounded">HIGH</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
