'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { RouteGuard } from '@/components/RouteGuard';
import { Settings, ChevronRight, Loader2, Shield, Plane, Users, Wrench, Wind, DollarSign, Bell, BookOpen, Weight, ShoppingBag } from 'lucide-react';

const CATEGORY_META: Record<string, { icon: any; label: string; description: string }> = {
  MANIFEST: { icon: Users, label: 'Manifest', description: 'Self-manifest, waitlist, load lock timing, no-show policy' },
  COMPLIANCE: { icon: Shield, label: 'Compliance', description: 'Waiver freshness, currency windows, verification rules' },
  PROGRESSION: { icon: BookOpen, label: 'Progression', description: 'Terminology, level criteria, verification requirements' },
  AIRCRAFT: { icon: Plane, label: 'Aircraft', description: 'Pilot confirmation, planning labels, departure rules' },
  NOTIFICATION: { icon: Bell, label: 'Notifications', description: 'Call timing, private messaging, delivery channels' },
  GEAR: { icon: Wrench, label: 'Gear', description: 'Reserve repack, AAD service, gear check staleness' },
  BOOKING: { icon: ShoppingBag, label: 'Booking', description: 'Min age, reschedule window, deposit requirements' },
  WEIGHT: { icon: Weight, label: 'Weight', description: 'Tandem passenger limits, advisory buffers' },
  WIND: { icon: Wind, label: 'Wind', description: 'Per-discipline wind speed limits' },
  PRICING: { icon: DollarSign, label: 'Pricing', description: 'Default jump prices per activity type' },
};

export default function PolicyCenterPage() {
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const res = await apiGet('/policies');
        setDefinitions(res?.data?.definitions ?? []);
      } catch {} finally { setLoading(false); }
    }
    fetch();
  }, []);

  // Count definitions per category
  const categoryCounts: Record<string, number> = {};
  for (const d of definitions) {
    categoryCounts[d.category] = (categoryCounts[d.category] ?? 0) + 1;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 size={32} className="text-secondary-500 animate-spin" />
      </div>
    );
  }

  return (
    <RouteGuard allowedRoles={['DZ_MANAGER', 'DZ_OWNER', 'PLATFORM_ADMIN']}>
      <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Policy Center</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Configure operational rules per organization, dropzone, or branch. No more one-size-fits-all.
            </p>
          </div>

          <div className="flex gap-2.5 mb-5">
            <Link href="/dashboard/settings/policies/history" className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-[13px] no-underline hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
              Audit History
            </Link>
            <Link href="/dashboard/settings/policies/overrides" className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-[13px] no-underline hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
              Day Overrides
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(CATEGORY_META).map(([cat, meta]) => {
              const count = categoryCounts[cat] ?? 0;
              return (
                <Link key={cat} href={`/dashboard/settings/policies/${cat}`} className="no-underline group">
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700 flex items-start gap-3.5 cursor-pointer hover:border-gray-300 dark:hover:border-slate-600 transition-colors">
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-2.5">
                      <meta.icon size={20} className="text-primary-500 dark:text-primary-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-[15px] text-gray-900 dark:text-white">{meta.label}</div>
                      <div className="text-gray-500 dark:text-gray-400 text-[13px] mt-0.5">{meta.description}</div>
                      <div className="text-gray-400 dark:text-gray-500 text-xs mt-1.5">{count} configurable rule{count !== 1 ? 's' : ''}</div>
                    </div>
                    <ChevronRight size={18} className="text-gray-400 dark:text-gray-500 mt-1 shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
