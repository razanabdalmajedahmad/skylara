'use client';

import { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  RefreshCw,
  LayoutDashboard,
  Briefcase,
  FileText,
  Video,
  Users,
  Settings,
} from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Overview', href: '/dashboard/careers', icon: LayoutDashboard },
  { id: 'jobs', label: 'Jobs', href: '/dashboard/careers/jobs', icon: Briefcase },
  { id: 'applications', label: 'Applications', href: '/dashboard/careers/applications', icon: FileText },
  { id: 'interviews', label: 'Interviews', href: '/dashboard/careers/interviews', icon: Video },
  { id: 'talent-pool', label: 'Talent Pool', href: '/dashboard/careers/talent-pool', icon: Users },
  { id: 'settings', label: 'Settings', href: '/dashboard/careers/settings', icon: Settings },
] as const;

export default function CareersLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const getActiveTab = () => {
    if (pathname === '/dashboard/careers') return 'overview';
    for (const tab of TABS) {
      if (tab.id !== 'overview' && pathname.startsWith(tab.href)) return tab.id;
    }
    return 'overview';
  };

  const activeTab = getActiveTab();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 -m-4 lg:-m-6">
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Careers</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Manage job postings, applications, interviews, and talent pipeline
              </p>
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
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
    </div>
  );
}
