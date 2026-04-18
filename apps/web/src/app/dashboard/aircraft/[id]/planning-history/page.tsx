'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';
import { History, ArrowLeft, Loader2, Plane } from 'lucide-react';

interface HistoryEntry {
  loadId: number; loadNumber: string; status: string;
  slotCount: number; scheduledAt: string; pilotName: string;
}

function PlanningHistoryContent() {
  const params = useParams();
  const id = params?.id;
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [aircraft, setAircraft] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function fetch() {
      try {
        const [acRes, loadsRes] = await Promise.all([
          apiGet(`/aircraft/${id}`),
          apiGet(`/manifest/loads?aircraftId=${id}&status=COMPLETE,CANCELLED&limit=50`),
        ]);
        setAircraft(acRes?.data);
        const loads = loadsRes?.data?.loads ?? loadsRes?.data ?? [];
        setEntries(Array.isArray(loads) ? loads.map((l: any) => ({
          loadId: l.id, loadNumber: l.loadNumber, status: l.status,
          slotCount: l.slotCount ?? 0, scheduledAt: l.scheduledAt, pilotName: l.pilotName ?? '—',
        })) : []);
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

  const totalJumpers = entries.reduce((s, e) => s + e.slotCount, 0);
  const completedLoads = entries.filter(e => e.status === 'COMPLETE').length;

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <Link href={`/dashboard/aircraft/${id}`} className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 no-underline text-sm mb-4 hover:text-gray-700 dark:hover:text-gray-300">
        <ArrowLeft size={16} /> Back to {aircraft?.registration ?? 'Aircraft'}
      </Link>

      <h1 className="text-[22px] font-bold text-gray-900 dark:text-white mb-1.5">
        Planning History — {aircraft?.registration ?? ''}
      </h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">
        {completedLoads} completed loads · {totalJumpers} total jumpers
      </p>

      {entries.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <History size={48} strokeWidth={1.5} className="mx-auto mb-4" />
          <p>No historical loads for this aircraft.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {entries.map(e => (
            <Link key={e.loadId} href={`/dashboard/manifest/${e.loadId}`} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 no-underline hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
              <Plane size={16} className={e.status === 'COMPLETE' ? 'text-emerald-500' : 'text-red-500'} />
              <div className="flex-1">
                <span className="font-semibold text-sm text-gray-900 dark:text-white">{e.loadNumber}</span>
                <span className="text-gray-500 dark:text-gray-400 text-[13px] ml-2">
                  {e.slotCount} jumpers · {e.pilotName}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(e.scheduledAt).toLocaleDateString()}
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                e.status === 'COMPLETE'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}>{e.status}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlanningHistoryPage() {
  return <RouteGuard allowedRoles={[...ROLE_GROUPS.OPERATIONS, 'PILOT']}><PlanningHistoryContent /></RouteGuard>;
}
