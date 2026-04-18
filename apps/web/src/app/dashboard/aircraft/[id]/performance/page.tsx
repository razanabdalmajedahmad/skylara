'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';
import { Plane, ArrowLeft, Loader2, Gauge, Weight, Ruler } from 'lucide-react';

function PerformanceContent() {
  const params = useParams();
  const id = params?.id;
  const [aircraft, setAircraft] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function fetch() {
      try {
        const res = await apiGet(`/aircraft/${id}`);
        setAircraft(res?.data);
      } catch {}
      finally { setLoading(false); }
    }
    fetch();
  }, [id]);

  if (loading) return (
    <div className="flex justify-center items-center h-[60vh]">
      <Loader2 size={32} className="text-secondary-500 animate-spin" />
    </div>
  );
  if (!aircraft) return <div className="p-4 sm:p-6 text-gray-400 dark:text-gray-500">Aircraft not found.</div>;

  const weightPct = aircraft.maxWeight ? Math.round((aircraft.emptyWeight / aircraft.maxWeight) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <Link href={`/dashboard/aircraft/${id}`} className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 no-underline text-sm mb-4 hover:text-gray-700 dark:hover:text-gray-300">
        <ArrowLeft size={16} /> Back to {aircraft.registration}
      </Link>

      <h1 className="text-[22px] font-bold text-gray-900 dark:text-white mb-5">
        Performance — {aircraft.registration}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Max Capacity', value: `${aircraft.maxCapacity} pax`, icon: Plane },
          { label: 'Max Weight', value: `${aircraft.maxWeight?.toLocaleString()} lbs`, icon: Weight },
          { label: 'Empty Weight', value: `${aircraft.emptyWeight?.toLocaleString()} lbs`, icon: Weight },
          { label: 'Useful Load', value: `${((aircraft.maxWeight ?? 0) - (aircraft.emptyWeight ?? 0)).toLocaleString()} lbs`, icon: Gauge },
          { label: 'CG Forward Limit', value: aircraft.cgForwardLimit ? `${aircraft.cgForwardLimit}"` : '—', icon: Ruler },
          { label: 'CG Aft Limit', value: aircraft.cgAftLimit ? `${aircraft.cgAftLimit}"` : '—', icon: Ruler },
          { label: 'Hobbs Hours', value: aircraft.hobbsHours ? `${aircraft.hobbsHours} hrs` : '—', icon: Gauge },
          { label: 'Next 100hr Due', value: aircraft.next100hrDue ? `${aircraft.next100hrDue} hrs` : '—', icon: Gauge },
        ].map(item => (
          <div key={item.label} className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <item.icon size={16} className="text-primary-500 dark:text-primary-400" />
              <span className="text-gray-400 dark:text-gray-500 text-[13px]">{item.label}</span>
            </div>
            <div className="text-[22px] font-bold text-gray-900 dark:text-white">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Weight bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
        <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2.5">Weight Utilization (empty)</div>
        <div className="h-2.5 rounded-full bg-gray-200 dark:bg-slate-700">
          <div className="h-full rounded-full bg-primary-500 dark:bg-primary-400" style={{ width: `${weightPct}%` }} />
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{weightPct}% of max gross weight is aircraft empty weight</div>
      </div>
    </div>
  );
}

export default function AircraftPerformancePage() {
  return <RouteGuard allowedRoles={[...ROLE_GROUPS.OPERATIONS, 'PILOT']}><PerformanceContent /></RouteGuard>;
}
