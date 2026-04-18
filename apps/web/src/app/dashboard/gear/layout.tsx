'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wrench, Shield, AlertOctagon, Package } from 'lucide-react';

const TABS = [
  { label: 'Overview', href: '/dashboard/gear', icon: Package, exact: true },
  { label: 'Rigs', href: '/dashboard/gear/rigs', icon: Shield, exact: false },
  { label: 'Maintenance', href: '/dashboard/gear/maintenance', icon: Wrench, exact: false },
  { label: 'Grounded', href: '/dashboard/gear/grounded', icon: AlertOctagon, exact: false },
];

export default function GearLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  function isActive(tab: typeof TABS[number]) {
    if (tab.exact) return pathname === tab.href;
    return pathname.startsWith(tab.href);
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 sm:px-6 flex gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm no-underline transition-all border-b-2 ${
                active
                  ? 'font-semibold text-primary-500 dark:text-primary-400 border-primary-500 dark:border-primary-400'
                  : 'font-normal text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
