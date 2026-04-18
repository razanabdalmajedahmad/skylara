'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';
import {
  Shield,
  Wrench,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Calendar,
  FileText,
  Loader2,
} from 'lucide-react';

interface SafetyStats {
  dueSoonCount: number;
  dueNowCount: number;
  overdueCount: number;
  groundedCount: number;
  openIncidents: number;
  reserveRepacksDueThisMonth: number;
  aadServicesDueThisMonth: number;
}

function StatusBadge({ count, label, dotClass }: { count: number; label: string; dotClass: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
        <span className="text-gray-400 dark:text-gray-500 text-[13px]">{label}</span>
      </div>
      <div className={`text-[32px] font-bold ${count > 0 ? dotClass.replace('bg-', 'text-') : 'text-gray-900 dark:text-white'}`}>{count}</div>
    </div>
  );
}

function SafetyDashboardContent() {
  const [stats, setStats] = useState<SafetyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [rigRes, incidentRes] = await Promise.all([
          apiGet('/rig-maintenance/summary').catch(() => null),
          apiGet('/safety/incidents?status=REPORTED,INVESTIGATING').catch(() => null),
        ]);

        setStats({
          dueSoonCount: rigRes?.data?.dueSoonCount ?? 0,
          dueNowCount: rigRes?.data?.dueNowCount ?? 0,
          overdueCount: rigRes?.data?.overdueCount ?? 0,
          groundedCount: rigRes?.data?.groundedCount ?? 0,
          openIncidents: incidentRes?.data?.total ?? 0,
          reserveRepacksDueThisMonth: rigRes?.data?.reserveRepacksDue ?? 0,
          aadServicesDueThisMonth: rigRes?.data?.aadServicesDue ?? 0,
        });
      } catch {
        setStats({
          dueSoonCount: 0, dueNowCount: 0, overdueCount: 0, groundedCount: 0,
          openIncidents: 0, reserveRepacksDueThisMonth: 0, aadServicesDueThisMonth: 0,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 size={32} className="text-secondary-500 animate-spin" />
      </div>
    );
  }

  const s = stats!;

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Rigger / Safety Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gear maintenance queue, compliance, and incident management
          </p>
        </div>

        {/* Critical alert banner */}
        {(s.groundedCount > 0 || s.overdueCount > 0) && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-500 dark:border-red-700 rounded-xl px-4 py-3 mb-4 flex items-center gap-2.5">
            <AlertOctagon size={18} className="text-red-500" />
            <span className="text-red-700 dark:text-red-300 text-sm font-medium">
              {s.groundedCount} grounded rig{s.groundedCount !== 1 ? 's' : ''} · {s.overdueCount} overdue — immediate action required
            </span>
          </div>
        )}

        {/* Rig status grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-gray-400 dark:text-gray-500 text-[13px]">Due Soon</span>
            </div>
            <div className={`text-[32px] font-bold ${s.dueSoonCount > 0 ? 'text-amber-500' : 'text-gray-900 dark:text-white'}`}>{s.dueSoonCount}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span className="text-gray-400 dark:text-gray-500 text-[13px]">Due Now</span>
            </div>
            <div className={`text-[32px] font-bold ${s.dueNowCount > 0 ? 'text-orange-500' : 'text-gray-900 dark:text-white'}`}>{s.dueNowCount}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-gray-400 dark:text-gray-500 text-[13px]">Overdue</span>
            </div>
            <div className={`text-[32px] font-bold ${s.overdueCount > 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>{s.overdueCount}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-800" />
              <span className="text-gray-400 dark:text-gray-500 text-[13px]">Grounded</span>
            </div>
            <div className={`text-[32px] font-bold ${s.groundedCount > 0 ? 'text-red-800 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{s.groundedCount}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-gray-400 dark:text-gray-500 text-[13px]">Open Incidents</span>
            </div>
            <div className={`text-[32px] font-bold ${s.openIncidents > 0 ? 'text-blue-500' : 'text-gray-900 dark:text-white'}`}>{s.openIncidents}</div>
          </div>
        </div>

        {/* Upcoming service calendars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={18} className="text-primary-500 dark:text-primary-400" />
              <span className="text-[15px] font-semibold text-gray-900 dark:text-white">Reserve Repacks This Month</span>
            </div>
            <div className="text-[28px] font-bold text-gray-900 dark:text-white">{s.reserveRepacksDueThisMonth}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={18} className="text-primary-500 dark:text-primary-400" />
              <span className="text-[15px] font-semibold text-gray-900 dark:text-white">AAD Services This Month</span>
            </div>
            <div className="text-[28px] font-bold text-gray-900 dark:text-white">{s.aadServicesDueThisMonth}</div>
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: 'Maintenance Queue', href: '/dashboard/gear/maintenance', icon: Wrench },
              { label: 'Grounded Rigs', href: '/dashboard/gear/grounded', icon: AlertOctagon },
              { label: 'All Rigs', href: '/dashboard/gear/rigs', icon: Shield },
              { label: 'Incidents', href: '/dashboard/incidents', icon: AlertTriangle },
              { label: 'Compliance', href: '/dashboard/gear', icon: FileText },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center gap-2.5 px-4 py-3 rounded-lg border border-gray-200 dark:border-slate-700 no-underline text-gray-900 dark:text-white text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                <item.icon size={18} className="text-primary-500 dark:text-primary-400" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SafetyDashboardPage() {
  return (
    <RouteGuard allowedRoles={[...ROLE_GROUPS.SAFETY, 'RIGGER', 'DZ_OPERATOR']}>
      <SafetyDashboardContent />
    </RouteGuard>
  );
}
