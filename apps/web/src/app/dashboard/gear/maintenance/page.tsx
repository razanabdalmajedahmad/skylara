'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';
import {
  Wrench,
  Clock,
  AlertTriangle,
  Calendar,
  Loader2,
  ChevronRight,
} from 'lucide-react';

interface DueRig {
  id: number;
  rigName: string;
  rigType: string;
  serialNumber: string | null;
  maintenanceStatus: string;
  ownerName: string;
  totalJumps: number;
  worstComponent: string;
  worstReason: string;
}

const TAB_STYLES: Record<string, { active: string; border: string }> = {
  all: { active: 'text-primary-500 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 border-primary-500', border: 'border-primary-500' },
  due_soon: { active: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-500', border: 'border-amber-500' },
  due_now: { active: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-500', border: 'border-orange-500' },
  overdue: { active: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-500', border: 'border-red-500' },
};

function MaintenanceQueueContent() {
  const [dueRigs, setDueRigs] = useState<DueRig[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'due_soon' | 'due_now' | 'overdue'>('all');

  useEffect(() => {
    async function fetchDue() {
      try {
        const res = await apiGet('/rig-maintenance/rigs/due');
        setDueRigs(res?.data?.rigs ?? []);
      } catch {
        setDueRigs([]);
      } finally {
        setLoading(false);
      }
    }
    fetchDue();
  }, []);

  const filtered = tab === 'all' ? dueRigs : dueRigs.filter((r) => {
    if (tab === 'due_soon') return r.maintenanceStatus === 'DUE_SOON';
    if (tab === 'due_now') return r.maintenanceStatus === 'DUE_NOW';
    if (tab === 'overdue') return r.maintenanceStatus === 'OVERDUE';
    return true;
  });

  const counts = {
    all: dueRigs.length,
    due_soon: dueRigs.filter((r) => r.maintenanceStatus === 'DUE_SOON').length,
    due_now: dueRigs.filter((r) => r.maintenanceStatus === 'DUE_NOW').length,
    overdue: dueRigs.filter((r) => r.maintenanceStatus === 'OVERDUE').length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 size={32} className="text-secondary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-[80vh]">
      <h1 className="text-[22px] font-bold text-gray-900 dark:text-white mb-4">
        Maintenance Queue
      </h1>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { key: 'all' as const, label: 'All' },
          { key: 'due_soon' as const, label: 'Due Soon' },
          { key: 'due_now' as const, label: 'Due Now' },
          { key: 'overdue' as const, label: 'Overdue' },
        ].map((t) => {
          const isActive = tab === t.key;
          const styles = TAB_STYLES[t.key];
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium border cursor-pointer transition-colors ${
                isActive
                  ? `${styles.active} ${styles.border}`
                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400'
              }`}
            >
              {t.label} ({counts[t.key]})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400 dark:text-gray-500">
          <Wrench size={40} strokeWidth={1.5} className="mx-auto mb-3" />
          <p>No rigs in this queue.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((rig) => {
            const isOverdue = rig.maintenanceStatus === 'OVERDUE';
            const isDueNow = rig.maintenanceStatus === 'DUE_NOW';
            return (
              <Link key={rig.id} href={`/dashboard/gear/rigs/${rig.id}`} className={`flex items-center gap-3.5 px-4 py-3.5 bg-white dark:bg-slate-800 rounded-xl no-underline border ${
                isOverdue ? 'border-red-300 dark:border-red-800' : isDueNow ? 'border-orange-300 dark:border-orange-800' : 'border-gray-200 dark:border-slate-700'
              } hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors`}>
                <div className={`rounded-xl p-2.5 ${isOverdue ? 'bg-red-50 dark:bg-red-900/20' : isDueNow ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
                  {isOverdue ? <AlertTriangle size={20} className="text-red-500" /> :
                   isDueNow ? <Clock size={20} className="text-orange-500" /> :
                   <Calendar size={20} className="text-amber-500" />}
                </div>
                <div className="flex-1">
                  <div className="text-gray-900 dark:text-white text-[15px] font-semibold">{rig.rigName}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-[13px]">
                    {rig.worstComponent} — {rig.worstReason}
                  </div>
                  <div className="text-gray-400 dark:text-gray-500 text-xs">
                    {rig.rigType} · {rig.totalJumps} jumps · Owner: {rig.ownerName}
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400 dark:text-gray-500" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MaintenancePage() {
  return (
    <RouteGuard allowedRoles={[...ROLE_GROUPS.SAFETY, 'RIGGER', ...ROLE_GROUPS.OPERATIONS]}>
      <MaintenanceQueueContent />
    </RouteGuard>
  );
}
