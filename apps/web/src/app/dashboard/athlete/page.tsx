'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import {
  Plane,
  Wallet,
  BookOpen,
  Shield,
  Clock,
  Award,
  ChevronRight,
  Loader2,
  Wrench,
} from 'lucide-react';

interface AthleteStats {
  walletBalance: number;
  totalJumps: number;
  licenseLevel: string;
  lastJumpDate: string | null;
  upcomingLoads: number;
  rigCount: number;
  rigAlerts: number;
}

function AthleteDashboardContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AthleteStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [walletRes, athleteRes, rigsRes] = await Promise.all([
          apiGet('/payments/wallet').catch(() => null),
          apiGet('/jumpers/me').catch(() => null),
          apiGet('/rig-maintenance/rigs?mine=true').catch(() => null),
        ]);

        const rigs = rigsRes?.data?.rigs ?? [];
        const rigAlerts = rigs.filter((r: any) =>
          ['DUE_SOON', 'DUE_NOW', 'OVERDUE', 'GROUNDED_STATUS'].includes(r.maintenanceStatus)
        ).length;

        setStats({
          walletBalance: walletRes?.data?.balance ?? 0,
          totalJumps: athleteRes?.data?.athlete?.totalJumps ?? 0,
          licenseLevel: athleteRes?.data?.athlete?.licenseLevel ?? 'NONE',
          lastJumpDate: athleteRes?.data?.athlete?.lastJumpDate ?? null,
          upcomingLoads: 0,
          rigCount: rigs.length,
          rigAlerts,
        });
      } catch {
        setStats({
          walletBalance: 0, totalJumps: 0, licenseLevel: 'NONE',
          lastJumpDate: null, upcomingLoads: 0, rigCount: 0, rigAlerts: 0,
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

  const quickLinks = [
    { label: 'Load Board', href: '/dashboard/manifest/board', icon: Plane, desc: 'View & join available loads' },
    { label: 'Wallet', href: '/dashboard/wallet', icon: Wallet, desc: `Balance: $${(s.walletBalance / 100).toFixed(2)}` },
    { label: 'Logbook', href: '/dashboard/logbook', icon: BookOpen, desc: `${s.totalJumps} total jumps` },
    { label: 'My Rigs', href: '/dashboard/gear', icon: Wrench, desc: `${s.rigCount} rigs${s.rigAlerts > 0 ? ` · ${s.rigAlerts} alert${s.rigAlerts > 1 ? 's' : ''}` : ''}` },
    { label: 'Bookings', href: '/dashboard/bookings', icon: Clock, desc: 'Upcoming reservations' },
    { label: 'Profile', href: '/dashboard/profile', icon: Award, desc: `License: ${s.licenseLevel}` },
  ];

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome, {user?.firstName ?? 'Athlete'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {s.licenseLevel !== 'NONE' ? `${s.licenseLevel} License · ` : ''}{s.totalJumps} jumps
            {s.lastJumpDate ? ` · Last jump: ${new Date(s.lastJumpDate).toLocaleDateString()}` : ''}
          </p>
        </div>

        {/* Rig alert banner */}
        {s.rigAlerts > 0 && (
          <Link href="/dashboard/gear" className="no-underline">
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-400 dark:border-amber-600 rounded-xl px-4 py-3 mb-4 flex items-center gap-2.5">
              <Shield size={18} className="text-amber-500" />
              <span className="text-amber-700 dark:text-amber-300 text-sm font-medium">
                {s.rigAlerts} rig{s.rigAlerts > 1 ? 's' : ''} need{s.rigAlerts === 1 ? 's' : ''} attention — tap to review
              </span>
            </div>
          </Link>
        )}

        {/* Quick Links */}
        <div className="flex flex-col gap-2.5">
          {quickLinks.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3.5 p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 no-underline hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
              <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-2.5">
                <item.icon size={20} className="text-primary-500 dark:text-primary-400" />
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-semibold text-gray-900 dark:text-white">{item.label}</div>
                <div className="text-[13px] text-gray-500 dark:text-gray-400">{item.desc}</div>
              </div>
              <ChevronRight size={18} className="text-gray-400 dark:text-gray-500" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AthleteDashboardPage() {
  return <AthleteDashboardContent />;
}
