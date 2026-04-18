'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import {
  Users,
  Link2,
  Plus,
  Loader2,
  Inbox,
  RefreshCw,
  MousePointer,
  UserPlus,
  TrendingUp,
  Copy,
  CheckCircle,
} from 'lucide-react';

interface ReferralStats {
  totalLinks: number;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
}

interface TopReferrer {
  id: string;
  userName: string;
  referralCode: string;
  clicks: number;
  conversions: number;
  earnedPoints: number;
}

export default function ReferralsPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrers, setReferrers] = useState<TopReferrer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingLink, setCreatingLink] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, referrersRes] = await Promise.allSettled([
        apiGet<{ success: boolean; data: ReferralStats }>('/marketing/referrals/stats'),
        apiGet<{ success: boolean; data: TopReferrer[] }>('/marketing/referrals/top'),
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data || { totalLinks: 0, totalClicks: 0, totalConversions: 0, conversionRate: 0 });
      }
      if (referrersRes.status === 'fulfilled') {
        setReferrers(referrersRes.value.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateLink = async () => {
    setCreatingLink(true);
    try {
      await apiPost('/marketing/referrals/links', {});
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create referral link');
    } finally {
      setCreatingLink(false);
    }
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading referrals...</span>
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
    { label: 'Total Links', value: stats?.totalLinks ?? 0, icon: Link2, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Total Clicks', value: stats?.totalClicks ?? 0, icon: MousePointer, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Conversions', value: stats?.totalConversions ?? 0, icon: UserPlus, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    { label: 'Conversion Rate', value: `${(stats?.conversionRate ?? 0).toFixed(1)}%`, icon: TrendingUp, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-green-600" /> Referrals
        </h1>
        <button
          onClick={handleCreateLink}
          disabled={creatingLink}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {creatingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create Referral Link
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                    {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700">
        <div className="p-6 pb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Top Referrers</h2>
        </div>
        <div className="px-6 pb-6">
          {referrers.length === 0 ? (
            <div className="text-center py-8">
              <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No referrers yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-1">Share referral links to start tracking conversions</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
                    <th className="text-left py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Referrer</th>
                    <th className="text-left py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Code</th>
                    <th className="text-right py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Clicks</th>
                    <th className="text-right py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Conversions</th>
                    <th className="text-right py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {referrers.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                      <td className="py-3 text-gray-900 dark:text-white font-medium">{r.userName}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400 dark:text-gray-300">{r.referralCode}</code>
                          <button
                            onClick={() => handleCopy(r.referralCode, r.id)}
                            className="p-0.5 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
                          >
                            {copiedId === r.id ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 text-right text-gray-600 dark:text-gray-400">{r.clicks}</td>
                      <td className="py-3 text-right text-gray-600 dark:text-gray-400">{r.conversions}</td>
                      <td className="py-3 text-right text-gray-600 dark:text-gray-400">{r.earnedPoints.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
