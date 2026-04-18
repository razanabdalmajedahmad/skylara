'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import { RouteGuard } from '@/components/RouteGuard';
import {
  Database,
  Upload,
  Download,
  Trash2,
  PlayCircle,
  History,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Package,
  FileJson,
  RotateCcw,
} from 'lucide-react';

interface RecentOp {
  id: number;
  operationType: string;
  status: string;
  scenarioKey: string | null;
  recordsAffected: number;
  createdAt: string;
  user: { firstName: string; lastName: string };
}

const SECTIONS = [
  {
    title: 'Demo Scenarios',
    description: 'Load realistic demo data from pre-built scenario packs',
    href: '/dashboard/admin/data-management/scenarios',
    icon: PlayCircle,
    colorClass: 'text-blue-500 dark:text-blue-400',
    bgClass: 'bg-blue-50 dark:bg-blue-900/30',
    hoverBorder: 'hover:border-blue-500 dark:hover:border-blue-400',
  },
  {
    title: 'Import Data',
    description: 'Import CSV or JSON data into your dropzone',
    href: '/dashboard/admin/data-management/import',
    icon: Upload,
    colorClass: 'text-emerald-500 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/30',
    hoverBorder: 'hover:border-emerald-500 dark:hover:border-emerald-400',
  },
  {
    title: 'Export Data',
    description: 'Export tenant data as JSON or CSV by module',
    href: '/dashboard/admin/data-management/export',
    icon: Download,
    colorClass: 'text-purple-500 dark:text-purple-400',
    bgClass: 'bg-purple-50 dark:bg-purple-900/30',
    hoverBorder: 'hover:border-purple-500 dark:hover:border-purple-400',
  },
  {
    title: 'Reset / Clear',
    description: 'Clear demo data or reset tenant operational data',
    href: '/dashboard/admin/data-management/reset',
    icon: Trash2,
    colorClass: 'text-red-500 dark:text-red-400',
    bgClass: 'bg-red-50 dark:bg-red-900/30',
    hoverBorder: 'hover:border-red-500 dark:hover:border-red-400',
  },
  {
    title: 'Operation History',
    description: 'View all import, export, load, and reset operations',
    href: '/dashboard/admin/data-management/history',
    icon: History,
    colorClass: 'text-amber-500 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-900/30',
    hoverBorder: 'hover:border-amber-500 dark:hover:border-amber-400',
  },
];

function DataManagementContent() {
  const [recentOps, setRecentOps] = useState<RecentOp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/data-management/operations?limit=5')
      .then((res: any) => setRecentOps(res.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      COMPLETED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      FAILED: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      RUNNING: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      ROLLED_BACK: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      PENDING: 'bg-slate-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400',
    };
    const cls = map[status] || map.PENDING;
    return (
      <span className={`${cls} px-2 py-0.5 rounded text-xs font-semibold`}>
        {status}
      </span>
    );
  };

  const opLabel = (type: string) => {
    const labels: Record<string, string> = {
      DEMO_LOAD: 'Scenario Load',
      DEMO_CLEAR: 'Demo Clear',
      EXPORT: 'Data Export',
      IMPORT: 'Data Import',
      TENANT_RESET: 'Tenant Reset',
    };
    return labels[type] || type;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white m-0">Data Management</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Load demo scenarios, import/export data, and manage your dropzone environment
        </p>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="no-underline">
            <div className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 flex items-start gap-4 cursor-pointer transition-all shadow-sm ${s.hoverBorder} hover:shadow-md`}>
              <div className={`${s.bgClass} rounded-[10px] p-2.5 flex-shrink-0`}>
                <s.icon size={24} className={s.colorClass} />
              </div>
              <div className="flex-1">
                <div className="text-base font-semibold text-gray-900 dark:text-white">{s.title}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.description}</div>
              </div>
              <ChevronRight size={18} className="text-gray-400 dark:text-gray-500 mt-1" />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Operations */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white m-0">Recent Operations</h2>
          <Link href="/dashboard/admin/data-management/history" className="text-sm text-secondary-500 dark:text-secondary-400 no-underline">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-10"><Loader2 size={24} className="text-secondary-500 dark:text-secondary-400 animate-spin mx-auto" /></div>
        ) : recentOps.length === 0 ? (
          <div className="text-center py-10 text-gray-400 dark:text-gray-500">
            <Database size={32} className="mb-2 opacity-50 mx-auto" />
            <p>No operations yet. Load a demo scenario to get started.</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700">
                {['Type', 'Scenario', 'Records', 'Status', 'By', 'Date'].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOps.map(op => (
                <tr key={op.id} className="border-b border-gray-200 dark:border-slate-700">
                  <td className="px-3 py-2.5 text-sm text-gray-900 dark:text-white">{opLabel(op.operationType)}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">{op.scenarioKey || '-'}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-900 dark:text-white tabular-nums">{op.recordsAffected.toLocaleString()}</td>
                  <td className="px-3 py-2.5">{statusBadge(op.status)}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">{op.user.firstName} {op.user.lastName}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-400 dark:text-gray-500">{new Date(op.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function DataManagementPage() {
  return (
    <RouteGuard allowedRoles={['PLATFORM_ADMIN', 'DZ_OWNER', 'DZ_MANAGER']}>
      <DataManagementContent />
    </RouteGuard>
  );
}
