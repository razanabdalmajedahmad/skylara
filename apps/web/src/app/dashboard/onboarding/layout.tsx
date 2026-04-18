'use client';

import { ReactNode, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { RefreshCw, LayoutDashboard, Users, GraduationCap, Plane, Shield, Award, UserCog, Building2, ClipboardCheck, FileStack, Bell, Zap, BarChart3 } from 'lucide-react';
import { ToastContainer } from '@/components/onboarding/shared';
import type { Toast } from '@/lib/onboarding/types';

const TABS = [
  { id: 'overview', label: 'Overview', href: '/dashboard/onboarding', icon: LayoutDashboard },
  { id: 'athletes', label: 'Athletes', href: '/dashboard/onboarding/athletes', icon: Users },
  { id: 'students', label: 'Students', href: '/dashboard/onboarding/students', icon: GraduationCap },
  { id: 'tandem', label: 'Tandem', href: '/dashboard/onboarding/tandem', icon: Plane },
  { id: 'coaches', label: 'Coaches', href: '/dashboard/onboarding/coaches', icon: Shield },
  { id: 'instructors', label: 'Instructors', href: '/dashboard/onboarding/instructors', icon: Award },
  { id: 'staff', label: 'Staff', href: '/dashboard/onboarding/staff', icon: UserCog },
  { id: 'managers', label: 'DZ Managers', href: '/dashboard/onboarding/managers', icon: Building2 },
  { id: 'approvals', label: 'Approvals', href: '/dashboard/onboarding/approvals', icon: ClipboardCheck },
  { id: 'templates', label: 'Templates', href: '/dashboard/onboarding/templates', icon: FileStack },
  { id: 'notifications', label: 'Notifications', href: '/dashboard/onboarding/notifications', icon: Bell },
  { id: 'automations', label: 'Automations', href: '/dashboard/onboarding/automations', icon: Zap },
  { id: 'reports', label: 'Reports', href: '/dashboard/onboarding/reports', icon: BarChart3 },
] as const;

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getActiveTab = () => {
    if (pathname === '/dashboard/onboarding') return 'overview';
    for (const tab of TABS) {
      if (tab.id !== 'overview' && pathname.startsWith(tab.href)) return tab.id;
    }
    return 'overview';
  };

  const activeTab = getActiveTab();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 -m-4 lg:-m-6">
      {/* Header with tabs */}
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Onboarding Center</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage all onboarding workflows, approvals, and communications</p>
            </div>
            <button
              onClick={() => router.refresh()}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 dark:bg-gray-700 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
          <div className="-mb-px flex overflow-x-auto gap-0.5 scrollbar-hide">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300 hover:border-gray-300 dark:border-slate-600 dark:hover:border-gray-500'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
