'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import {
  Megaphone,
  ClipboardList,
  Users,
  Trophy,
  Newspaper,
  Gift,
  Plus,
  ArrowRight,
  Loader2,
  Inbox,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: string;
  sentCount: number;
  openCount: number;
  clickCount: number;
  createdAt: string;
}

interface OverviewStats {
  activeCampaigns: number;
  surveysSent: number;
  referralConversions: number;
  totalPointsAwarded: number;
  activeLeaderboards: number;
  newsItems: number;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-300',
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PAUSED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  COMPLETED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 1) return 'Today';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export default function MarketingOverviewPage() {
  const router = useRouter();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [campaignsRes, surveysRes, referralsRes, leaderboardsRes, newsRes, gamificationRes] =
        await Promise.allSettled([
          apiGet<{ success: boolean; data: Campaign[] }>('/marketing/campaigns'),
          apiGet<{ success: boolean; data: any[] }>('/marketing/surveys'),
          apiGet<{ success: boolean; data: { conversions?: number } }>('/marketing/referrals/stats'),
          apiGet<{ success: boolean; data: any[] }>('/marketing/leaderboards'),
          apiGet<{ success: boolean; data: any[] }>('/marketing/news'),
          apiGet<{ success: boolean; data: { totalPoints?: number } }>('/marketing/gamification/badges'),
        ]);

      const campData = campaignsRes.status === 'fulfilled' ? campaignsRes.value.data || [] : [];
      const survData = surveysRes.status === 'fulfilled' ? surveysRes.value.data || [] : [];
      const refData = referralsRes.status === 'fulfilled' ? referralsRes.value.data : null;
      const lbData = leaderboardsRes.status === 'fulfilled' ? leaderboardsRes.value.data || [] : [];
      const newsData = newsRes.status === 'fulfilled' ? newsRes.value.data || [] : [];
      const gamData = gamificationRes.status === 'fulfilled' ? gamificationRes.value.data : null;

      setCampaigns(campData.slice(0, 5));
      setStats({
        activeCampaigns: campData.filter((c: Campaign) => c.status === 'ACTIVE' || c.status === 'PUBLISHED').length,
        surveysSent: survData.length,
        referralConversions: refData?.conversions ?? 0,
        totalPointsAwarded: (gamData as any)?.totalPoints ?? 0,
        activeLeaderboards: lbData.filter((l: any) => l.status === 'ACTIVE').length,
        newsItems: newsData.length,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load marketing overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading marketing overview...</span>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const statCards = [
    { label: 'Active Campaigns', value: stats?.activeCampaigns ?? 0, icon: Megaphone, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Surveys Sent', value: stats?.surveysSent ?? 0, icon: ClipboardList, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Referral Conversions', value: stats?.referralConversions ?? 0, icon: Users, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    { label: 'Points Awarded', value: stats?.totalPointsAwarded ?? 0, icon: Trophy, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Active Leaderboards', value: stats?.activeLeaderboards ?? 0, icon: TrendingUp, color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30' },
    { label: 'News Items', value: stats?.newsItems ?? 0, icon: Newspaper, color: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30' },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{card.value.toLocaleString()}</p>
                </div>
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => router.push('/dashboard/marketing/campaigns')}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Campaign
        </button>
        <button
          onClick={() => router.push('/dashboard/marketing/surveys')}
          className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ClipboardList className="w-4 h-4" /> Create Survey
        </button>
        <button
          onClick={() => router.push('/dashboard/marketing/news')}
          className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Newspaper className="w-4 h-4" /> Post News
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700">
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Campaigns</h2>
          <button
            onClick={() => router.push('/dashboard/marketing/campaigns')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="px-6 pb-6">
          {campaigns.length === 0 ? (
            <div className="text-center py-8">
              <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No campaigns yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-1">Create your first campaign to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{c.channel}</span>
                      <span className="text-gray-300 dark:text-gray-600 dark:text-gray-400">|</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400">{formatDate(c.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    <div className="text-right text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                      <span>{c.sentCount ?? 0} sent</span>
                      <span className="mx-1">/</span>
                      <span>{c.openCount ?? 0} opened</span>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-600'}`}>
                      {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
