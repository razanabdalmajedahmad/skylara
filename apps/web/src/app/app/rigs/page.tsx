'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import {
  Shield,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Hash,
  Calendar,
} from 'lucide-react';

const STATUS_MAP: Record<string, { style: string; label: string; icon: any }> = {
  OK: { style: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', label: 'OK', icon: CheckCircle2 },
  DUE_SOON: { style: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', label: 'Due Soon', icon: Clock },
  DUE_NOW: { style: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400', label: 'Due Now', icon: AlertTriangle },
  OVERDUE: { style: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400', label: 'Overdue', icon: AlertTriangle },
  GROUNDED_STATUS: { style: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300', label: 'Grounded', icon: AlertOctagon },
};

interface MyRig {
  id: number;
  rigName: string;
  rigType: string;
  totalJumps: number;
  maintenanceStatus: string;
  reserveRepackDue: string | null;
  aadServiceDue: string | null;
}

export default function AthleteRigsPage() {
  const [rigs, setRigs] = useState<MyRig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRigs() {
      try {
        const res = await apiGet('/rig-maintenance/rigs?mine=true');
        setRigs(res?.data?.rigs ?? []);
      } catch {
        setRigs([]);
      } finally {
        setLoading(false);
      }
    }
    fetchRigs();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 size={32} className="text-secondary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <Shield size={24} className="text-primary-500 dark:text-primary-400" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">My Rigs</h1>
        </div>

        {rigs.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <Shield size={48} strokeWidth={1.5} className="mx-auto mb-4" />
            <p className="text-base">No rigs linked to your account.</p>
            <p className="text-sm">Contact the gear manager to add your rig.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rigs.map((rig) => {
              const st = STATUS_MAP[rig.maintenanceStatus] ?? STATUS_MAP.OK;
              const StIcon = st.icon;
              return (
                <div key={rig.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-2.5">
                    <div className="font-bold text-base text-gray-900 dark:text-white">{rig.rigName}</div>
                    <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md ${st.style}`}>
                      <StIcon size={13} /> {st.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                    <span>{rig.rigType}</span>
                    <span className="flex items-center gap-1">
                      <Hash size={12} /> {rig.totalJumps} jumps
                    </span>
                  </div>
                  {(rig.reserveRepackDue || rig.aadServiceDue) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 dark:text-gray-500 mt-2">
                      {rig.reserveRepackDue && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} /> Reserve repack: {new Date(rig.reserveRepackDue).toLocaleDateString()}
                        </span>
                      )}
                      {rig.aadServiceDue && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} /> AAD service: {new Date(rig.aadServiceDue).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
