'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';
import { Users, Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface StaffMember {
  id: number; name: string; role: string;
  status: 'ON_DUTY' | 'OFF_DUTY' | 'ON_BREAK';
  assignedLoads: number;
}

function StaffingContent() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const res = await apiGet('/admin/staff-schedule/today');
        setStaff(res?.data?.staff ?? []);
      } catch { setStaff([]); }
      finally { setLoading(false); }
    }
    fetch();
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-[60vh]">
      <Loader2 size={32} className="text-secondary-500 animate-spin" />
    </div>
  );

  const onDuty = staff.filter(s => s.status === 'ON_DUTY');
  const offDuty = staff.filter(s => s.status !== 'ON_DUTY');

  const statusIcon = (s: string) => {
    if (s === 'ON_DUTY') return <CheckCircle2 size={14} className="text-emerald-500" />;
    if (s === 'ON_BREAK') return <Clock size={14} className="text-amber-500" />;
    return <XCircle size={14} className="text-gray-400 dark:text-gray-500" />;
  };

  const statusChipClass = (s: string) => {
    const map: Record<string, string> = {
      ON_DUTY: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
      ON_BREAK: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
      OFF_DUTY: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300',
    };
    return map[s] ?? map.OFF_DUTY;
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Staffing</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">
          {onDuty.length} on duty · {offDuty.length} off
        </p>

        {staff.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <Users size={48} strokeWidth={1.5} className="mb-4 mx-auto" />
            <p>No staff schedule data available.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {[...onDuty, ...offDuty].map(s => (
              <div key={s.id} className="bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-gray-200 dark:border-slate-700 flex items-center gap-3">
                {statusIcon(s.status)}
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-900 dark:text-white">{s.name}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-[13px]">{s.role}{s.assignedLoads > 0 ? ` · ${s.assignedLoads} load${s.assignedLoads > 1 ? 's' : ''}` : ''}</div>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${statusChipClass(s.status)}`}>
                  {s.status.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StaffingPage() {
  return <RouteGuard allowedRoles={ROLE_GROUPS.OPERATIONS}><StaffingContent /></RouteGuard>;
}
