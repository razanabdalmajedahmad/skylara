'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';
import {
  BarChart3,
  Plane,
  Users,
  DollarSign,
  AlertTriangle,
  Cloud,
  Shield,
  TrendingUp,
  Clock,
  Megaphone,
  Wrench,
  Loader2,
} from 'lucide-react';

interface DashboardStats {
  todayRevenue: number;
  activeLoads: number;
  totalJumpers: number;
  waitlistCount: number;
  utilization: number;
  complianceAlerts: number;
  weatherStatus: string;
  rigsDueSoon: number;
  rigsGrounded: number;
}

function StatCard({
  icon: Icon, label, value, sublabel, iconClass, bgClass, sublabelClass, href,
}: {
  icon: any; label: string; value: string | number; sublabel?: string;
  iconClass: string; bgClass: string; sublabelClass: string; href?: string;
}) {
  const card = (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
      <div className="flex items-center gap-3 mb-3">
        <div className={`${bgClass} rounded-xl p-2.5`}>
          <Icon size={20} className={iconClass} />
        </div>
        <span className="text-gray-400 dark:text-gray-500 text-[13px] font-medium">{label}</span>
      </div>
      <div className="text-[28px] font-bold text-gray-900 dark:text-white">{value}</div>
      {sublabel && <div className={`${sublabelClass} text-xs mt-1`}>{sublabel}</div>}
    </div>
  );
  return href ? <Link href={href} className="no-underline">{card}</Link> : card;
}

function OperatorDashboardContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [loadsRes, rigRes] = await Promise.all([
          apiGet('/manifest/dashboard-stats').catch(() => null),
          apiGet('/rig-maintenance/summary').catch(() => null),
        ]);

        setStats({
          todayRevenue: loadsRes?.data?.todayRevenue ?? 0,
          activeLoads: loadsRes?.data?.activeLoads ?? 0,
          totalJumpers: loadsRes?.data?.totalJumpers ?? 0,
          waitlistCount: loadsRes?.data?.waitlistCount ?? 0,
          utilization: loadsRes?.data?.utilization ?? 0,
          complianceAlerts: loadsRes?.data?.complianceAlerts ?? 0,
          weatherStatus: loadsRes?.data?.weatherStatus ?? 'Clear',
          rigsDueSoon: rigRes?.data?.dueSoonCount ?? 0,
          rigsGrounded: rigRes?.data?.groundedCount ?? 0,
        });
      } catch {
        setStats({
          todayRevenue: 0, activeLoads: 0, totalJumpers: 0, waitlistCount: 0,
          utilization: 0, complianceAlerts: 0, weatherStatus: 'Unknown',
          rigsDueSoon: 0, rigsGrounded: 0,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
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
            Operator Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Welcome back, {user?.firstName ?? 'Operator'}. Here&apos;s today&apos;s overview.
          </p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={DollarSign} label="Today's Revenue" value={`$${(s.todayRevenue / 100).toLocaleString()}`}
            iconClass="text-emerald-500" bgClass="bg-emerald-50 dark:bg-emerald-950" sublabelClass="text-emerald-700 dark:text-emerald-300" href="/dashboard/payments" />
          <StatCard icon={Plane} label="Active Loads" value={s.activeLoads}
            iconClass="text-blue-500" bgClass="bg-blue-50 dark:bg-blue-950" sublabelClass="text-blue-700 dark:text-blue-300" href="/dashboard/manifest" />
          <StatCard icon={Users} label="Jumpers Today" value={s.totalJumpers}
            iconClass="text-purple-500" bgClass="bg-purple-50 dark:bg-purple-950" sublabelClass="text-purple-700 dark:text-purple-300" />
          <StatCard icon={TrendingUp} label="Utilization" value={`${s.utilization}%`}
            iconClass="text-teal-500" bgClass="bg-teal-50 dark:bg-teal-950" sublabelClass="text-teal-700 dark:text-teal-300" />
          <StatCard icon={Clock} label="Waitlist" value={s.waitlistCount}
            iconClass="text-amber-500" bgClass="bg-amber-50 dark:bg-amber-950" sublabelClass="text-amber-700 dark:text-amber-300" href="/dashboard/manifest/waitlist" />
          <StatCard icon={AlertTriangle} label="Compliance Alerts" value={s.complianceAlerts}
            sublabel={s.complianceAlerts > 0 ? 'Action required' : 'All clear'}
            iconClass={s.complianceAlerts > 0 ? 'text-red-500' : 'text-emerald-500'}
            bgClass={s.complianceAlerts > 0 ? 'bg-red-50 dark:bg-red-950' : 'bg-emerald-50 dark:bg-emerald-950'}
            sublabelClass={s.complianceAlerts > 0 ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'} />
          <StatCard icon={Cloud} label="Weather" value={s.weatherStatus}
            iconClass="text-sky-500" bgClass="bg-blue-50 dark:bg-blue-950" sublabelClass="text-blue-700 dark:text-blue-300" href="/dashboard/weather" />
          <StatCard icon={Wrench} label="Rigs Due / Grounded" value={`${s.rigsDueSoon} / ${s.rigsGrounded}`}
            sublabel={s.rigsGrounded > 0 ? 'Grounded rigs need attention' : undefined}
            iconClass={s.rigsGrounded > 0 ? 'text-red-500' : 'text-amber-500'}
            bgClass={s.rigsGrounded > 0 ? 'bg-red-50 dark:bg-red-950' : 'bg-amber-50 dark:bg-amber-950'}
            sublabelClass={s.rigsGrounded > 0 ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}
            href="/dashboard/gear" />
        </div>

        {/* Quick Links */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Quick Access</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Manifest Board', href: '/dashboard/manifest/board', icon: Plane },
              { label: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
              { label: 'Safety', href: '/dashboard/safety', icon: Shield },
              { label: 'Weather', href: '/dashboard/weather', icon: Cloud },
              { label: 'Staff', href: '/dashboard/staff', icon: Users },
              { label: 'Announcements', href: '/dashboard/notifications', icon: Megaphone },
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

export default function OperatorDashboardPage() {
  return (
    <RouteGuard allowedRoles={ROLE_GROUPS.OPERATIONS}>
      <OperatorDashboardContent />
    </RouteGuard>
  );
}
