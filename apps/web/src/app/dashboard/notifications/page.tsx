'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import { PageLoading } from '@/components/onboarding/shared';
import { EMPTY_NOTIF_OVERVIEW, type NotifOverview, type Recommendation } from '@/lib/notifications/types';
import { Send, CheckCircle2, Eye, XCircle, Target, Zap, Bell, Mail, MessageSquare, Smartphone, AlertTriangle, Lightbulb, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NotificationsOverviewPage() {
  const [overview, setOverview] = useState<NotifOverview | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const recNav: Record<string, string> = {
    'Review Failures': '/dashboard/notifications/failures',
    'View Templates': '/dashboard/notifications/templates',
    'View Campaigns': '/dashboard/notifications/campaigns',
    'View Segments': '/dashboard/notifications/segments',
    'View Automations': '/dashboard/notifications/automations',
    'Create Campaign': '/dashboard/notifications/campaigns',
  };

  useEffect(() => {
    (async () => {
      try {
        const [ov, recs] = await Promise.allSettled([
          apiGet<NotifOverview>('/notifications/overview'),
          apiGet<Recommendation[]>('/notifications/recommendations'),
        ]);
        setOverview(ov.status === 'fulfilled' ? ov.value : EMPTY_NOTIF_OVERVIEW);
        setRecommendations(recs.status === 'fulfilled' ? recs.value : []);
      } catch {
        setOverview(EMPTY_NOTIF_OVERVIEW);
      }
      setLoading(false);
    })();
  }, []);

  if (loading || !overview) return <PageLoading label="Loading notification overview..." />;

  const cards = [
    { label: 'Total Sent', value: overview.totalSent, icon: Send, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Delivered', value: overview.delivered, icon: CheckCircle2, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    { label: 'Opened', value: overview.opened, icon: Eye, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Failed', value: overview.failed, icon: XCircle, color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
    { label: 'Segments', value: overview.activeSegments, icon: Target, color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30' },
    { label: 'Campaigns', value: overview.activeCampaigns, icon: Send, color: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30' },
    { label: 'Automations', value: overview.activeAutomations, icon: Zap, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
  ];

  const cb = overview.channelBreakdown;
  const channelData = [
    { ch: 'Email', icon: Mail, color: 'text-blue-500', n: cb?.email ?? 0 },
    { ch: 'Push', icon: Smartphone, color: 'text-purple-500', n: cb?.push ?? 0 },
    { ch: 'SMS', icon: MessageSquare, color: 'text-green-500', n: cb?.sms ?? 0 },
    { ch: 'In-App', icon: Bell, color: 'text-orange-500', n: cb?.inApp ?? 0 },
  ];

  const recStyle = (type: string) => {
    switch (type) {
      case 'warning': return { bg: 'bg-red-50 dark:bg-red-900/10', icon: AlertTriangle, iconColor: 'text-red-500', btnColor: 'text-red-600 dark:text-red-400' };
      case 'insight': return { bg: 'bg-blue-50 dark:bg-blue-900/10', icon: Lightbulb, iconColor: 'text-blue-500', btnColor: 'text-blue-600 dark:text-blue-400' };
      default: return { bg: 'bg-green-50 dark:bg-green-900/10', icon: Zap, iconColor: 'text-green-500', btnColor: 'text-green-600 dark:text-green-400' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {cards.map((c) => { const I = c.icon; return (
          <div key={c.label} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
            <div className={`p-1.5 rounded-lg ${c.color} w-fit mb-2`}><I className="w-4 h-4" /></div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{c.value.toLocaleString()}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{c.label}</p>
          </div>
        ); })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Channel Breakdown */}
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Channel Breakdown</h3>
          <div className="grid grid-cols-2 gap-4">
            {channelData.map((x) => { const I = x.icon; return (
              <div key={x.ch} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <I className={`w-5 h-5 ${x.color}`} />
                <div><p className="text-lg font-bold text-gray-900 dark:text-white">{x.n.toLocaleString()}</p><p className="text-xs text-gray-500 dark:text-gray-400">{x.ch}</p></div>
              </div>
            ); })}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">AI Recommendations</h3>
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
        </div>
      </div>
    </div>
  );
}
