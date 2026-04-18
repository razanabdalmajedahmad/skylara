'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';
import {
  Shield,
  Search,
  Plus,
  ChevronRight,
  Loader2,
  AlertTriangle,
  AlertOctagon,
} from 'lucide-react';

const STATUS_CHIP: Record<string, { bg: string; text: string; label: string }> = {
  OK: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', label: 'OK' },
  DUE_SOON: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', label: 'Due Soon' },
  DUE_NOW: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', label: 'Due Now' },
  OVERDUE: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', label: 'Overdue' },
  GROUNDED_STATUS: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', label: 'Grounded' },
};

interface RigListItem {
  id: number;
  rigName: string;
  rigType: string;
  serialNumber: string | null;
  activeStatus: string;
  maintenanceStatus: string;
  totalJumps: number;
  ownerName: string;
}

function RigsListContent() {
  const [rigs, setRigs] = useState<RigListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    async function fetchRigs() {
      try {
        const res = await apiGet('/rig-maintenance/rigs');
        setRigs(res?.data?.rigs ?? []);
      } catch {
        setRigs([]);
      } finally {
        setLoading(false);
      }
    }
    fetchRigs();
  }, []);

  const filtered = rigs.filter((r) => {
    if (search && !r.rigName.toLowerCase().includes(search.toLowerCase()) &&
        !(r.serialNumber ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filter !== 'ALL' && r.maintenanceStatus !== filter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 size={32} className="text-secondary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-[80vh]">
      {/* Controls */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-2.5 top-2.5 text-gray-400 dark:text-gray-500" />
          <input
            placeholder="Search rigs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-2 pl-8 pr-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
        >
          <option value="ALL">All Statuses</option>
          <option value="OK">OK</option>
          <option value="DUE_SOON">Due Soon</option>
          <option value="DUE_NOW">Due Now</option>
          <option value="OVERDUE">Overdue</option>
          <option value="GROUNDED_STATUS">Grounded</option>
        </select>
      </div>

      {/* Rig list */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400 dark:text-gray-500">
          No rigs found{search ? ` matching "${search}"` : ''}.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((rig) => {
            const chip = STATUS_CHIP[rig.maintenanceStatus] ?? STATUS_CHIP.OK;
            return (
              <Link key={rig.id} href={`/dashboard/gear/rigs/${rig.id}`} className="flex items-center gap-3.5 px-4 py-3.5 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 no-underline hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-2.5">
                  <Shield size={20} className="text-primary-500 dark:text-primary-400" />
                </div>
                <div className="flex-1">
                  <div className="text-gray-900 dark:text-white text-[15px] font-semibold">
                    {rig.rigName}
                    {rig.serialNumber && <span className="text-gray-400 dark:text-gray-500 font-normal text-[13px]"> · {rig.serialNumber}</span>}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 text-[13px]">
                    {rig.rigType} · {rig.totalJumps} jumps · {rig.ownerName}
                  </div>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${chip.bg} ${chip.text}`}>
                  {chip.label}
                </span>
                <ChevronRight size={18} className="text-gray-400 dark:text-gray-500" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RigsPage() {
  return (
    <RouteGuard allowedRoles={[...ROLE_GROUPS.OPERATIONS, ...ROLE_GROUPS.SAFETY, 'RIGGER']}>
      <RigsListContent />
    </RouteGuard>
  );
}
