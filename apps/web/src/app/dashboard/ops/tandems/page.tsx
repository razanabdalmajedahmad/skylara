'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';
import { Users, Clock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

interface TandemSlot {
  id: number; loadNumber: string; status: string;
  passengerName: string; instructorName: string;
  scheduledAt: string; checkedIn: boolean;
}

function TandemsContent() {
  const [slots, setSlots] = useState<TandemSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const res = await apiGet('/manifest/slots?slotType=TANDEM_PASSENGER&today=true');
        setSlots(res?.data?.slots ?? []);
      } catch { setSlots([]); }
      finally { setLoading(false); }
    }
    fetch();
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-[60vh]">
      <Loader2 size={32} className="text-secondary-500 animate-spin" />
    </div>
  );

  const pending = slots.filter(s => !s.checkedIn);
  const ready = slots.filter(s => s.checkedIn);

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Tandem Operations</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">
          {slots.length} tandem{slots.length !== 1 ? 's' : ''} today · {pending.length} awaiting check-in · {ready.length} ready
        </p>

        {/* Pending check-in */}
        {pending.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-amber-500 dark:text-amber-400 mb-2.5 uppercase tracking-wide">Awaiting Check-In</h2>
            <div className="flex flex-col gap-2">
              {pending.map(s => (
                <div key={s.id} className="bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-gray-200 dark:border-slate-700 flex items-center gap-3">
                  <Clock size={18} className="text-amber-500 dark:text-amber-400 shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-gray-900 dark:text-white">{s.passengerName}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-[13px]">TI: {s.instructorName} · {s.loadNumber} · {new Date(s.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">PENDING</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ready */}
        {ready.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-emerald-500 dark:text-emerald-400 mb-2.5 uppercase tracking-wide">Checked In</h2>
            <div className="flex flex-col gap-2">
              {ready.map(s => (
                <div key={s.id} className="bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-gray-200 dark:border-slate-700 flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-gray-900 dark:text-white">{s.passengerName}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-[13px]">TI: {s.instructorName} · {s.loadNumber}</div>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">READY</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {slots.length === 0 && (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <Users size={48} strokeWidth={1.5} className="mb-4 mx-auto" />
            <p>No tandem operations today.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TandemsPage() {
  return <RouteGuard allowedRoles={ROLE_GROUPS.MANIFEST}><TandemsContent /></RouteGuard>;
}
