'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';
import { Fuel, ArrowLeft, Loader2, Clock } from 'lucide-react';

function FuelContent() {
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

  const burnRate = Number(aircraft.fuelBurnRate) || 0;
  const capacity = aircraft.fuelCapacity || 0;
  const endurance = burnRate > 0 ? (capacity / burnRate).toFixed(1) : '—';
  const reserveMin = burnRate > 0 ? Math.round(capacity * 0.15 / burnRate * 60) : 0;

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <Link href={`/dashboard/aircraft/${id}`} className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 no-underline text-sm mb-4 hover:text-gray-700 dark:hover:text-gray-300">
        <ArrowLeft size={16} /> Back to {aircraft.registration}
      </Link>

      <h1 className="text-[22px] font-bold text-gray-900 dark:text-white mb-5">
        Fuel Profiles — {aircraft.registration}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
          <Fuel size={18} className="text-primary-500 dark:text-primary-400" />
          <div className="text-gray-400 dark:text-gray-500 text-[13px] mt-2">Fuel Capacity</div>
          <div className="text-[22px] font-bold text-gray-900 dark:text-white">{capacity ? `${capacity} lbs` : '—'}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
          <Fuel size={18} className="text-amber-500" />
          <div className="text-gray-400 dark:text-gray-500 text-[13px] mt-2">Burn Rate</div>
          <div className="text-[22px] font-bold text-gray-900 dark:text-white">{burnRate ? `${burnRate} gal/hr` : '—'}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
          <Clock size={18} className="text-emerald-500" />
          <div className="text-gray-400 dark:text-gray-500 text-[13px] mt-2">Max Endurance</div>
          <div className="text-[22px] font-bold text-gray-900 dark:text-white">{endurance} hrs</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
          <Clock size={18} className="text-red-500" />
          <div className="text-gray-400 dark:text-gray-500 text-[13px] mt-2">15% Reserve</div>
          <div className="text-[22px] font-bold text-gray-900 dark:text-white">{reserveMin ? `${reserveMin} min` : '—'}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
        <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-2.5">Notes</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Fuel calculations are estimates based on configured burn rate. Actual consumption varies with payload, altitude, and conditions.
          Pilots must verify fuel state before each load.
        </p>
      </div>
    </div>
  );
}

export default function FuelProfilesPage() {
  return <RouteGuard allowedRoles={[...ROLE_GROUPS.OPERATIONS, 'PILOT']}><FuelContent /></RouteGuard>;
}
