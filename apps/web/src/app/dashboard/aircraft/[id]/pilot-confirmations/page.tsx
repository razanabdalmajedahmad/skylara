'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';
import { UserCheck, ArrowLeft, Loader2, CheckCircle2, Clock } from 'lucide-react';

interface Confirmation {
  loadId: number; loadNumber: string; pilotName: string;
  status: string; confirmedAt: string | null; scheduledAt: string;
}

function ConfirmationsContent() {
  const params = useParams();
  const id = params?.id;
  const [confirmations, setConfirmations] = useState<Confirmation[]>([]);
  const [aircraft, setAircraft] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function fetch() {
      try {
        const [acRes, loadsRes] = await Promise.all([
          apiGet(`/aircraft/${id}`),
          apiGet(`/manifest/loads?aircraftId=${id}&limit=20`),
        ]);
        setAircraft(acRes?.data);
        const loads = loadsRes?.data?.loads ?? loadsRes?.data ?? [];
        setConfirmations(Array.isArray(loads) ? loads.map((l: any) => ({
          loadId: l.id, loadNumber: l.loadNumber, pilotName: l.pilotName ?? '—',
          status: l.status, confirmedAt: l.actualDepartureAt ?? null, scheduledAt: l.scheduledAt,
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

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <Link href={`/dashboard/aircraft/${id}`} className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 no-underline text-sm mb-4 hover:text-gray-700 dark:hover:text-gray-300">
        <ArrowLeft size={16} /> Back to {aircraft?.registration ?? 'Aircraft'}
      </Link>

      <h1 className="text-[22px] font-bold text-gray-900 dark:text-white mb-5">
        Pilot Confirmations — {aircraft?.registration ?? ''}
      </h1>

      {confirmations.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <UserCheck size={48} strokeWidth={1.5} className="mx-auto mb-4" />
          <p>No loads assigned to this aircraft yet.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                  {['Load', 'Pilot', 'Scheduled', 'Status', 'Departed'].map(h => (
                    <th key={h} className="px-3.5 py-2.5 text-left text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {confirmations.map(c => (
                  <tr key={c.loadId} className="border-b border-gray-200 dark:border-slate-700 last:border-b-0">
                    <td className="px-3.5 py-2.5">
                      <Link href={`/dashboard/manifest/${c.loadId}`} className="text-primary-500 dark:text-primary-400 font-semibold no-underline hover:underline">{c.loadNumber}</Link>
                    </td>
                    <td className="px-3.5 py-2.5 text-gray-900 dark:text-white">{c.pilotName}</td>
                    <td className="px-3.5 py-2.5 text-gray-500 dark:text-gray-400">{new Date(c.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-3.5 py-2.5">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                        ['COMPLETE', 'LANDED'].includes(c.status)
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                          : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                      }`}>{c.status}</span>
                    </td>
                    <td className="px-3.5 py-2.5 text-gray-500 dark:text-gray-400">
                      {c.confirmedAt ? new Date(c.confirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PilotConfirmationsPage() {
  return <RouteGuard allowedRoles={[...ROLE_GROUPS.OPERATIONS, 'PILOT']}><ConfirmationsContent /></RouteGuard>;
}
