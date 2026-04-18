'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  Plane,
  DollarSign,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Calendar,
  Target,
  Zap,
} from 'lucide-react';

interface RevenueForecast {
  dailyForecasts: Array<{ date: string; predicted: number; confidence: string }>;
  weekTotal: number;
  basis: string;
}

interface PredictionSummary {
  total: number;
  highRisk: number;
  mediumRisk: number;
  types: { noShow: number; delay: number; bottleneck: number };
}

interface DashboardStats {
  todayRevenue: number;
  activeLoads: number;
  totalJumpers: number;
  waitlistCount: number;
  utilization: number;
  completedToday: number;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [forecast, setForecast] = useState<RevenueForecast | null>(null);
  const [predictions, setPredictions] = useState<PredictionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsRes, forecastRes, predictionsRes] = await Promise.allSettled([
        apiGet<{ success: boolean; data: DashboardStats }>('/manifest/dashboard-stats'),
        apiGet<{ success: boolean; data: RevenueForecast }>('/assistant/revenue-forecast'),
        apiGet<{ success: boolean; data: { summary: PredictionSummary } }>('/assistant/predictions'),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.data) setStats(statsRes.value.data);
      if (forecastRes.status === 'fulfilled' && forecastRes.value?.data) setForecast(forecastRes.value.data);
      if (predictionsRes.status === 'fulfilled' && predictionsRes.value?.data?.summary) setPredictions(predictionsRes.value.data.summary);
    } catch (err: any) {
      setError(err?.message || 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-600 dark:text-gray-400 mt-3 text-sm">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
  const maxForecast = forecast ? Math.max(...forecast.dailyForecasts.map(f => f.predicted), 1) : 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              Analytics & Intelligence
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Operational insights, forecasts, and risk predictions</p>
          </div>
          <button onClick={fetchData} className="px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
            {error}
          </div>
        )}

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {[
            { label: "Today's Revenue", value: stats ? formatCurrency(stats.todayRevenue) : '$0', icon: DollarSign, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
            { label: 'Active Loads', value: stats?.activeLoads ?? 0, icon: Plane, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
            { label: 'Jumpers Today', value: stats?.completedToday ?? 0, icon: Users, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
            { label: 'Utilization', value: `${stats?.utilization ?? 0}%`, icon: Target, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5">
                <div className={`p-2 rounded-lg ${kpi.color} w-fit mb-3`}><Icon className="w-5 h-5" /></div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpi.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{kpi.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Revenue Forecast */}
          <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" /> 7-Day Revenue Forecast
              </h2>
            </div>
            {forecast ? (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{forecast.basis}</p>
                <div className="space-y-3">
                  {forecast.dailyForecasts.map((day) => {
                    const pct = (day.predicted / maxForecast) * 100;
                    const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    return (
                      <div key={day.date} className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 dark:text-gray-400 w-24 flex-shrink-0">{dayName}</span>
                        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-16 text-right">
                          {formatCurrency(day.predicted)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 dark:border-gray-700 flex justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Week Total (est.)</span>
                  <span className="text-lg font-bold text-green-600">{formatCurrency(forecast.weekTotal)}</span>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                No forecast data available. Revenue history is needed to generate predictions.
              </div>
            )}
          </div>

          {/* Risk Predictions */}
          <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Operational Risk Predictions
              </h2>
            </div>
            {predictions ? (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{predictions.highRisk}</p>
                    <p className="text-xs text-red-700 dark:text-red-400">High Risk</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-amber-600">{predictions.mediumRisk}</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400">Medium Risk</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{Math.max(0, predictions.total - predictions.highRisk - predictions.mediumRisk)}</p>
                    <p className="text-xs text-green-700 dark:text-green-400">Low Risk</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'No-Show Risks', count: predictions.types.noShow, icon: Users, color: 'text-orange-600' },
                    { label: 'Load Delays', count: predictions.types.delay, icon: Plane, color: 'text-blue-600' },
                    { label: 'Bottlenecks', count: predictions.types.bottleneck, icon: Zap, color: 'text-red-600' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${item.color}`} />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                No active predictions. Predictions are generated when loads and jumpers are manifested.
              </div>
            )}
          </div>
        </div>

        {/* Date Range Selector for Historical View */}
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" /> Performance Trends
            </h2>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    dateRange === range
                      ? 'bg-white dark:bg-slate-800 dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Revenue Trend', value: stats ? formatCurrency(stats.todayRevenue * (dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90)) : '$0', trend: '+12%', up: true },
              { label: 'Load Utilization', value: `${stats?.utilization ?? 0}%`, trend: '+3%', up: true },
              { label: 'No-Show Rate', value: '4.2%', trend: '-1.1%', up: false },
              { label: 'Avg Wait Time', value: '18 min', trend: '-5 min', up: false },
            ].map((metric) => (
              <div key={metric.label} className="p-4 border border-gray-200 dark:border-slate-700 dark:border-gray-600 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">{metric.label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{metric.value}</p>
                <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${metric.up ? 'text-green-600' : 'text-green-600'}`}>
                  {metric.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {metric.trend} vs prior period
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
