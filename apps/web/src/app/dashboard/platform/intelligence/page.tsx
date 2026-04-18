'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Inbox,
  DollarSign,
  Users,
  Calendar,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
} from 'lucide-react';

interface OverviewData {
  totalRevenue: number;
  totalUsers: number;
  totalBookings: number;
  avgRating: number;
  facilities: {
    id: number;
    name: string;
    category: string;
    bookings: number;
    revenue: number;
    avgRating: number;
    trend: 'up' | 'down' | 'flat';
  }[];
}

interface TrendData {
  labels: string[];
  values: number[];
  metric: string;
}

const PERIODS = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
];

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
};

export default function IntelligencePage() {
  const router = useRouter();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);

  const fetchOverview = useCallback(async () => {
    try {
      setError(null);
      const res = await apiGet<{ success: boolean; data: OverviewData }>('/platform/intelligence/overview');
      setOverview(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load intelligence data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrends = useCallback(async (p: string) => {
    setTrendLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: any }>(
        `/platform/intelligence/trends?metric=bookings&period=${p}`
      );
      const raw = res.data;
      // Transform API series [{date,value}] into {labels, values, metric}
      const series = raw?.series || raw?.trendData || [];
      setTrends({
        labels: series.map((s: any) => s.date),
        values: series.map((s: any) => Number(s.value)),
        metric: raw?.metric || 'bookings',
      });
    } catch {
      // Non-critical
    } finally {
      setTrendLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    fetchTrends(period);
  }, [fetchOverview]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePeriodChange = (p: string) => {
    setPeriod(p);
    fetchTrends(p);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading intelligence...</span>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button onClick={fetchOverview} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Retry</button>
      </div>
    );
  }

  const kpis = [
    { label: 'Total Revenue', value: `$${(overview?.totalRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    { label: 'Total Users', value: (overview?.totalUsers ?? 0).toLocaleString(), icon: Users, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Total Bookings', value: (overview?.totalBookings ?? 0).toLocaleString(), icon: Calendar, color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30' },
    { label: 'Avg Rating', value: (overview?.avgRating ?? 0).toFixed(1), icon: Star, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
  ];

  const maxBookings = Math.max(...(overview?.facilities?.map((f) => f.bookings) || [1]));
  const trendMax = Math.max(...(trends?.values || [1]));

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
              <div className={`inline-flex p-2.5 rounded-lg ${kpi.color} mb-3`}><Icon className="w-5 h-5" /></div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpi.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Facility Performance Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Facility Performance</h2>
        </div>
        {!overview?.facilities?.length ? (
          <div className="text-center py-12">
            <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No facility data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Facility</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Category</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Bookings</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Revenue</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Avg Rating</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {overview.facilities.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{f.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">{f.category}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{f.bookings.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">${f.revenue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{f.avgRating.toFixed(1)}</td>
                    <td className="px-4 py-3 text-center"><TrendIcon trend={f.trend} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings per Facility (horizontal bars) */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" /> Bookings by Facility
          </h2>
          {!overview?.facilities?.length ? (
            <div className="text-center py-8">
              <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No data</p>
            </div>
          ) : (
            <div className="space-y-3">
              {overview.facilities.sort((a, b) => b.bookings - a.bookings).map((f) => {
                const pct = maxBookings > 0 ? Math.round((f.bookings / maxBookings) * 100) : 0;
                return (
                  <div key={f.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{f.name}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{f.bookings}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Trend Visualization */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" /> Booking Trends
            </h2>
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handlePeriodChange(p.value)}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    period === p.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {trendLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : !trends?.values?.length ? (
            <div className="text-center py-8">
              <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No trend data for this period</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trends.labels.map((label, i) => {
                const pct = trendMax > 0 ? Math.round((trends.values[i] / trendMax) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{trends.values[i]}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
                      <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
