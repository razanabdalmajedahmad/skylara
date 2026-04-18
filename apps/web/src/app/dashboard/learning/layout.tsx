'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { LayoutDashboard, BookOpen, Award, CreditCard, BarChart3 } from 'lucide-react';

const TABS = [
  { label: 'Overview', href: '/dashboard/learning', icon: LayoutDashboard, exact: true },
  { label: 'Courses', href: '/dashboard/learning/courses', icon: BookOpen, exact: false },
  { label: 'Certificates', href: '/dashboard/learning/certificates', icon: Award, exact: false },
  { label: 'Subscriptions', href: '/dashboard/learning/subscriptions', icon: CreditCard, exact: false },
  { label: 'Analytics', href: '/dashboard/learning/analytics', icon: BarChart3, exact: false },
];

export default function LearningLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  function isActive(tab: typeof TABS[number]) {
    if (tab.exact) return pathname === tab.href;
    return pathname.startsWith(tab.href);
  }

  return (
    <div className="min-h-screen bg-gray-50 -m-4 lg:-m-6">
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Learning Center</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Manage courses, certificates, subscriptions, and learning analytics
            </p>
          </div>
          <div className="-mb-px flex overflow-x-auto gap-0.5 scrollbar-hide">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = isActive(tab);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    active
                      ? 'border-[#1B4F72] text-[#1B4F72]'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
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
