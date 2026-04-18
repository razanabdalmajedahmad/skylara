'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import {
  Map,
  Building2,
  Users,
  Plane,
  Hotel,
  Home,
  Coffee,
  ShoppingBag,
  Layers,
  Loader2,
  AlertCircle,
  ArrowRight,
  Activity,
} from 'lucide-react';

interface PlatformStats {
  totalRegions: number;
  totalFacilities: number;
  activeFacilities: number;
  totalOrganizations: number;
  totalDropzones: number;
  totalUsers: number;
  byCategory: Record<string, number>;
}

const CATEGORY_ICONS: Record<string, typeof Building2> = {
  AVIATION: Plane,
  HOTEL: Hotel,
  APARTMENT: Home,
  BUNKHOUSE: Home,
  CAFE: Coffee,
  SHOP: ShoppingBag,
  MIXED: Layers,
};

const CATEGORY_COLORS: Record<string, string> = {
  AVIATION: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  HOTEL: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  APARTMENT: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
  BUNKHOUSE: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
  CAFE: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30',
  SHOP: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
  MIXED: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30',
};

export default function PlatformOverviewPage() {
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<{ success: boolean; data: PlatformStats }>('/platform/stats');
        setStats(res.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load platform stats');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading platform overview...</span>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button
          onClick={() => router.refresh()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const mainCards = [
    { label: 'Regions', value: stats?.totalRegions ?? 0, icon: Map, color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30', href: '/dashboard/platform/regions' },
    { label: 'Facilities', value: stats?.totalFacilities ?? 0, icon: Building2, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30', href: '/dashboard/platform/facilities' },
    { label: 'Active', value: stats?.activeFacilities ?? 0, icon: Activity, color: 'text-green-600 bg-green-100 dark:bg-green-900/30', href: '/dashboard/platform/facilities' },
    { label: 'Organizations', value: stats?.totalOrganizations ?? 0, icon: Layers, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Dropzones', value: stats?.totalDropzones ?? 0, icon: Plane, color: 'text-sky-600 bg-sky-100 dark:bg-sky-900/30' },
    { label: 'Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
  ];

  const categoryEntries = Object.entries(stats?.byCategory || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {mainCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={() => card.href && router.push(card.href)}
              className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 text-left transition-all ${
                card.href ? 'hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 cursor-pointer' : ''
              }`}
            >
              <div className={`inline-flex p-2.5 rounded-lg ${card.color} mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {card.value.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</p>
            </button>
          );
        })}
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Facilities by Category</h2>
          {categoryEntries.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No facilities registered yet</p>
              <button
                onClick={() => router.push('/dashboard/platform/facilities')}
                className="mt-3 text-sm text-indigo-600 hover:underline flex items-center gap-1 mx-auto"
              >
                Add first facility <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {categoryEntries.map(([category, count]) => {
                const Icon = CATEGORY_ICONS[category] || Building2;
                const colorClass = CATEGORY_COLORS[category] || 'text-gray-600 bg-gray-100';
                const percentage = stats?.totalFacilities
                  ? Math.round((count / stats.totalFacilities) * 100)
                  : 0;
                return (
                  <div key={category} className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {category.charAt(0) + category.slice(1).toLowerCase()}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/dashboard/platform/regions')}
              className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <Map className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Manage Regions</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Create and organize geographic regions</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </button>

            <button
              onClick={() => router.push('/dashboard/platform/facilities')}
              className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Facility Registry</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Register and manage all facility types</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </button>

            <button
              onClick={() => router.push('/dashboard/settings')}
              className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Organization Settings</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Configure organization hierarchy</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
