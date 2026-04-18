'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Inbox,
  Plane,
  Calendar,
  AlertTriangle,
  Activity,
  Users,
  Building2,
  RefreshCw,
  Clock,
} from 'lucide-react';

interface CommandCenterData {
  stats: {
    activeLoads: number;
    todaysBookings: number;
    openIncidents: number;
    activeAircraft: number;
    onlineUsers: number;
    activeFacilities: number;
  };
  recentActivity: {
    id: string;
    action: string;
    entityType: string;
    timestamp: string;
    actorName?: string;
  }[];
  facilityHealth: {
    id: number;
    name: string;
    status: string;
    activeLoads: number;
    onlineStaff: number;
  }[];
}

const STAT_CARDS = [
  { key: 'activeLoads', label: 'Active Loads', icon: Plane, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
  { key: 'todaysBookings', label: "Today's Bookings", icon: Calendar, color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30' },
  { key: 'openIncidents', label: 'Open Incidents', icon: AlertTriangle, color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
  { key: 'activeAircraft', label: 'Active Aircraft', icon: Activity, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
  { key: 'onlineUsers', label: 'Online Users', icon: Users, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
  { key: 'activeFacilities', label: 'Active Facilities', icon: Building2, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
] as const;

const HEALTH_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  DEGRADED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  OFFLINE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  INACTIVE: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
};

export default function CommandCenterPage() {
  const router = useRouter();
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await apiGet<{ success: boolean; data: CommandCenterData }>('/platform/command-center');
      setData(res.data);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to load command center data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading command center...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
          Retry
        </button>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span>Auto-refreshes every 30s</span>
        </div>
        <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const value = stats?.[card.key] ?? 0;
          return (
            <div key={card.key} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
              <div className={`inline-flex p-2.5 rounded-lg ${card.color} mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Feed */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
          {!data?.recentActivity?.length ? (
            <div className="text-center py-8">
              <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {data.recentActivity.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg mt-0.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">{entry.action}</span>
                      <span className="text-gray-500 dark:text-gray-400"> on </span>
                      <span className="font-medium">{entry.entityType}</span>
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {entry.actorName && `${entry.actorName} · `}
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Facility Health */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Facility Health</h2>
          {!data?.facilityHealth?.length ? (
            <div className="text-center py-8">
              <Building2 className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No facility health data available</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {data.facilityHealth.map((facility) => (
                <div key={facility.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{facility.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {facility.activeLoads} loads · {facility.onlineStaff} staff online
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${HEALTH_COLORS[facility.status] || HEALTH_COLORS.INACTIVE}`}>
                    {facility.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
