'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  Globe,
  Map,
  Building2,
  LayoutDashboard,
  Monitor,
  Users,
  UserCog,
  Wallet,
  Star,
  TrendingUp,
} from 'lucide-react';

const PLATFORM_TABS = [
  { label: 'Overview', href: '/dashboard/platform', icon: LayoutDashboard },
  { label: 'Command Center', href: '/dashboard/platform/command-center', icon: Monitor },
  { label: 'Regions', href: '/dashboard/platform/regions', icon: Map },
  { label: 'Facilities', href: '/dashboard/platform/facilities', icon: Building2 },
  { label: 'Customers', href: '/dashboard/platform/customers', icon: Users },
  { label: 'Wallets', href: '/dashboard/platform/wallets', icon: Wallet },
  { label: 'Reputation', href: '/dashboard/platform/reputation', icon: Star },
  { label: 'Intelligence', href: '/dashboard/platform/intelligence', icon: TrendingUp },
  { label: 'Impersonation', href: '/dashboard/platform/impersonation', icon: UserCog },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl">
          <Globe className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Global operations, facilities, intelligence, and governance
          </p>
        </div>
      </div>

      {/* Tab Navigation — scrollable for many tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
        <nav className="-mb-px flex gap-1 min-w-max">
          {PLATFORM_TABS.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.href !== '/dashboard/platform' && pathname.startsWith(tab.href));
            const Icon = tab.icon;
            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                className={`flex items-center gap-1.5 py-3 px-3 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
