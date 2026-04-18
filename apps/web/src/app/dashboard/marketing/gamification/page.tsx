'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import {
  Trophy,
  Award,
  Flame,
  Crown,
  Plus,
  Loader2,
  Inbox,
  RefreshCw,
  X,
  Star,
  Zap,
  Gift,
  RotateCw,
} from 'lucide-react';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedCount: number;
}

interface LeaderboardEntry {
  rank: number;
  userName: string;
  points: number;
  badges: number;
}

interface Leaderboard {
  id: string;
  name: string;
  status: string;
  period: string;
  entries: LeaderboardEntry[];
}

interface PointsStats {
  totalPointsAwarded: number;
  totalPointsRedeemed: number;
  activeStreaks: number;
  totalBadges: number;
}

interface RewardRule {
  id: string;
  action: string;
  points: number;
  description: string;
  isActive: boolean;
}

interface SpinCampaign {
  id: string;
  name: string;
  status: string;
  totalSpins: number;
  prizesAwarded: number;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  INACTIVE: 'bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-300',
  DRAFT: 'bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-300',
  COMPLETED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export default function GamificationPage() {
  const [pointsStats, setPointsStats] = useState<PointsStats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [leaderboards, setLeaderboards] = useState<Leaderboard[]>([]);
  const [rewardRules, setRewardRules] = useState<RewardRule[]>([]);
  const [spinCampaigns, setSpinCampaigns] = useState<SpinCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [ruleForm, setRuleForm] = useState({ action: '', points: 0, description: '' });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [badgesRes, lbRes, rulesRes, spinsRes] = await Promise.allSettled([
        apiGet<{ success: boolean; data: any }>('/marketing/gamification/badges'),
        apiGet<{ success: boolean; data: Leaderboard[] }>('/marketing/leaderboards'),
        apiGet<{ success: boolean; data: RewardRule[] }>('/marketing/rewards/me'),
        apiGet<{ success: boolean; data: SpinCampaign[] }>('/marketing/gamification/spins'),
      ]);

      const badgeData = badgesRes.status === 'fulfilled' ? badgesRes.value.data : null;
      const lbData = lbRes.status === 'fulfilled' ? lbRes.value.data || [] : [];
      const rulesData = rulesRes.status === 'fulfilled' ? rulesRes.value.data || [] : [];
      const spinsData = spinsRes.status === 'fulfilled' ? spinsRes.value.data || [] : [];

      const badgeList = Array.isArray(badgeData) ? badgeData : badgeData?.badges || [];
      setBadges(badgeList);
      setLeaderboards(lbData);
      setRewardRules(Array.isArray(rulesData) ? rulesData : []);
      setSpinCampaigns(Array.isArray(spinsData) ? spinsData : []);

      setPointsStats({
        totalPointsAwarded: badgeData?.totalPoints ?? 0,
        totalPointsRedeemed: badgeData?.redeemedPoints ?? 0,
        activeStreaks: badgeData?.activeStreaks ?? 0,
        totalBadges: badgeList.length,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load gamification data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleForm.action.trim()) return;
    setCreating(true);
    try {
      await apiPost('/marketing/rewards/rules', {
        action: ruleForm.action,
        points: ruleForm.points,
        description: ruleForm.description,
      });
      setRuleForm({ action: '', points: 0, description: '' });
      setShowRuleForm(false);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create reward rule');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading gamification...</span>
      </div>
    );
  }

  if (error && !pointsStats) {
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
    { label: 'Points Awarded', value: pointsStats?.totalPointsAwarded ?? 0, icon: Star, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Points Redeemed', value: pointsStats?.totalPointsRedeemed ?? 0, icon: Gift, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    { label: 'Total Badges', value: pointsStats?.totalBadges ?? 0, icon: Award, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Active Streaks', value: pointsStats?.activeStreaks ?? 0, icon: Flame, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <Trophy className="w-6 h-6 text-amber-600" /> Gamification
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Badges */}
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700">
          <div className="p-6 pb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" /> Badges
            </h2>
          </div>
          <div className="px-6 pb-6">
            {badges.length === 0 ? (
              <div className="text-center py-6">
                <Inbox className="w-8 h-8 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No badges configured</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {badges.slice(0, 6).map((b) => (
                  <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 text-sm font-bold">
                      {b.icon || b.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{b.name}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 dark:text-gray-400">{b.earnedCount ?? 0} earned</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Leaderboards */}
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700">
          <div className="p-6 pb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-600" /> Leaderboards
            </h2>
          </div>
          <div className="px-6 pb-6 space-y-4">
            {leaderboards.length === 0 ? (
              <div className="text-center py-6">
                <Inbox className="w-8 h-8 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No leaderboards active</p>
              </div>
            ) : (
              leaderboards.slice(0, 3).map((lb) => (
                <div key={lb.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{lb.name}</p>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${STATUS_COLORS[lb.status] || 'bg-gray-100 text-gray-600'}`}>
                      {lb.status}
                    </span>
                  </div>
                  {lb.entries && lb.entries.length > 0 ? (
                    <div className="space-y-1">
                      {lb.entries.slice(0, 5).map((e, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">
                            <span className="font-medium text-gray-900 dark:text-white mr-1">#{e.rank}</span>
                            {e.userName}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">{e.points.toLocaleString()} pts</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400">No entries yet</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Reward Rules */}
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700">
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-600" /> Reward Rules
          </h2>
          <button
            onClick={() => setShowRuleForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Rule
          </button>
        </div>
        <div className="px-6 pb-6">
          {rewardRules.length === 0 ? (
            <div className="text-center py-6">
              <Inbox className="w-8 h-8 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No reward rules defined</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rewardRules.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{r.action}</p>
                    {r.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.description}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-amber-600">+{r.points} pts</span>
                    <span className={`w-2 h-2 rounded-full ${r.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Spin Campaigns */}
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700">
        <div className="p-6 pb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <RotateCw className="w-5 h-5 text-indigo-600" /> Spin Campaigns
          </h2>
        </div>
        <div className="px-6 pb-6">
          {spinCampaigns.length === 0 ? (
            <div className="text-center py-6">
              <Inbox className="w-8 h-8 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No spin campaigns</p>
            </div>
          ) : (
            <div className="space-y-2">
              {spinCampaigns.map((sc) => (
                <div key={sc.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{sc.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sc.totalSpins} spins / {sc.prizesAwarded} prizes</p>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${STATUS_COLORS[sc.status] || 'bg-gray-100 text-gray-600'}`}>
                    {sc.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showRuleForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 pb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Reward Rule</h2>
              <button onClick={() => setShowRuleForm(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRule} className="px-6 pb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action</label>
                <input
                  type="text"
                  value={ruleForm.action}
                  onChange={(e) => setRuleForm({ ...ruleForm, action: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., COMPLETE_JUMP, REFER_FRIEND"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Points</label>
                <input
                  type="number"
                  value={ruleForm.points}
                  onChange={(e) => setRuleForm({ ...ruleForm, points: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={0}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <input
                  type="text"
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe when points are awarded"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRuleForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
