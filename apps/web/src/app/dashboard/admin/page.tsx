'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import { RouteGuard } from '@/components/RouteGuard';
import {
  Building2,
  Users,
  CreditCard,
  Activity,
  FileText,
  Database,
  Settings,
  Shield,
  BarChart3,
  Loader2,
  GraduationCap,
  Plane,
} from 'lucide-react';

interface AdminStats {
  totalDropzones: number;
  totalUsers: number;
  activeSubscriptions: number;
  openIncidents: number;
}

function AdminDashboardContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await apiGet('/admin/stats').catch(() => null);
        setStats({
          totalDropzones: res?.data?.totalDropzones ?? 0,
          totalUsers: res?.data?.totalUsers ?? 0,
          activeSubscriptions: res?.data?.activeSubscriptions ?? 0,
          openIncidents: res?.data?.openIncidents ?? 0,
        });
      } catch {
        setStats({ totalDropzones: 0, totalUsers: 0, activeSubscriptions: 0, openIncidents: 0 });
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

  const kpiItems = [
    { icon: Building2, label: 'Dropzones', value: s.totalDropzones, iconClass: 'text-blue-500', bgClass: 'bg-blue-50 dark:bg-blue-950' },
    { icon: Users, label: 'Total Users', value: s.totalUsers, iconClass: 'text-purple-500', bgClass: 'bg-purple-50 dark:bg-purple-950' },
    { icon: CreditCard, label: 'Active Subscriptions', value: s.activeSubscriptions, iconClass: 'text-emerald-500', bgClass: 'bg-emerald-50 dark:bg-emerald-950' },
    {
      icon: Shield, label: 'Open Incidents', value: s.openIncidents,
      iconClass: s.openIncidents > 0 ? 'text-red-500' : 'text-emerald-500',
      bgClass: s.openIncidents > 0 ? 'bg-red-50 dark:bg-red-950' : 'bg-emerald-50 dark:bg-emerald-950',
    },
  ];

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Platform Admin
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            System overview, DZ management, and audit access
          </p>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpiItems.map((item) => (
            <div key={item.label} className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className={`${item.bgClass} rounded-lg p-2`}>
                  <item.icon size={18} className={item.iconClass} />
                </div>
                <span className="text-gray-400 dark:text-gray-500 text-[13px]">{item.label}</span>
              </div>
              <div className="text-[28px] font-bold text-gray-900 dark:text-white">{item.value}</div>
            </div>
          ))}
        </div>

        {/* Admin sections */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Administration</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: 'DZ Onboarding', href: '/dashboard/admin/onboarding/dropzones', icon: Building2, desc: 'New dropzone applications (platform)' },
              { label: 'Coach applications', href: '/dashboard/admin/onboarding/coaches', icon: GraduationCap, desc: 'Review & assign dropzone (platform)' },
              { label: 'Instructor applications', href: '/dashboard/admin/onboarding/instructors', icon: Plane, desc: 'TI / AFFI / instructor pipeline (platform)' },
              { label: 'Onboarding center (DZ)', href: '/dashboard/onboarding', icon: Users, desc: 'Templates, segments, approvals for your DZ' },
              { label: 'Roles & Permissions', href: '/dashboard/roles', icon: Shield, desc: 'Role grants and assignment' },
              { label: 'Reports', href: '/dashboard/reports', icon: BarChart3, desc: 'Revenue, utilization, ops' },
              { label: 'Report Builder', href: '/dashboard/report-builder', icon: Database, desc: 'Custom report dashboards' },
              { label: 'Audit Logs', href: '/dashboard/settings', icon: FileText, desc: 'System audit trail' },
              { label: 'System Health', href: '/dashboard/settings', icon: Activity, desc: 'Monitoring and status' },
              { label: 'Settings', href: '/dashboard/settings', icon: Settings, desc: 'Platform configuration' },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="flex items-start gap-3 p-3.5 rounded-lg border border-gray-200 dark:border-slate-700 no-underline hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                <item.icon size={20} className="text-primary-500 dark:text-primary-400 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <RouteGuard allowedRoles={['PLATFORM_ADMIN']}>
      <AdminDashboardContent />
    </RouteGuard>
  );
}
