'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';
import {
  Shield,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Wrench,
  Calendar,
  Hash,
  Clock,
} from 'lucide-react';

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: any }> = {
  OK: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', icon: CheckCircle2 },
  DUE_SOON: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', icon: Clock },
  DUE_NOW: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', icon: AlertTriangle },
  OVERDUE: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', icon: AlertTriangle },
  GROUNDED: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', icon: AlertOctagon },
};

function RigDetailContent() {
  const params = useParams();
  const rigId = params?.id;
  const [rig, setRig] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rigId) return;
    async function fetchRig() {
      try {
        const [rigRes, statusRes, eventsRes] = await Promise.all([
          apiGet(`/rig-maintenance/rigs/${rigId}`),
          apiGet(`/rig-maintenance/rigs/${rigId}/status`),
          apiGet(`/rig-maintenance/rigs/${rigId}/maintenance-events`),
        ]);
        setRig(rigRes?.data);
        setStatus(statusRes?.data);
        setEvents(eventsRes?.data?.events ?? []);
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    fetchRig();
  }, [rigId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 size={32} className="text-secondary-500 animate-spin" />
      </div>
    );
  }

  if (!rig) {
    return (
      <div className="p-4 sm:p-6 text-center text-gray-400 dark:text-gray-500">
        Rig not found.
      </div>
    );
  }

  const overallStyle = STATUS_STYLES[status?.overallStatus] ?? STATUS_STYLES.OK;
  const OverallIcon = overallStyle.icon;

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-[80vh]">
      {/* Back link */}
      <Link href="/dashboard/gear/rigs" className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 no-underline text-sm mb-4 hover:text-gray-700 dark:hover:text-gray-300">
        <ArrowLeft size={16} /> Back to Rigs
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700 mb-5">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900 dark:text-white m-0">{rig.rigName}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {rig.rigType} · {rig.serialNumber ?? 'No serial'} · {rig.totalJumps} total jumps
            </p>
          </div>
          <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold text-[13px] ${overallStyle.bg} ${overallStyle.text}`}>
            <OverallIcon size={16} />
            {status?.overallStatus ?? 'Unknown'}
          </div>
        </div>
      </div>

      {/* Component status grid */}
      {status?.components && (
        <div className="mb-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Component Status</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {status.components.map((c: any) => {
              const cs = STATUS_STYLES[c.status] ?? STATUS_STYLES.OK;
              const CIcon = cs.icon;
              return (
                <div key={c.componentType} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">{c.componentType}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${cs.bg} ${cs.text}`}>
                      <CIcon size={12} /> {c.status}
                    </span>
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 text-[13px]">{c.reason}</div>
                  {c.triggerType !== 'NONE' && c.triggerType !== 'GROUNDING' && (
                    <div className="text-gray-400 dark:text-gray-500 text-xs mt-1.5">
                      {c.triggerType === 'JUMPS' || c.triggerType === 'COMBINED'
                        ? <><Hash size={11} className="inline align-middle" /> {c.jumpsSinceService} jumps since service</>
                        : <><Calendar size={11} className="inline align-middle" /> {c.daysSinceService} days since service</>
                      }
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Components info */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700 mb-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3.5">Components</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
          {rig.container && (
            <div>
              <div className="font-semibold text-gray-900 dark:text-white mb-1">Container</div>
              <div className="text-gray-500 dark:text-gray-400">{rig.container.manufacturer ?? '—'} {rig.container.model ?? ''}</div>
              <div className="text-gray-400 dark:text-gray-500">S/N: {rig.container.serialNumber ?? '—'}</div>
            </div>
          )}
          {rig.mainCanopy && (
            <div>
              <div className="font-semibold text-gray-900 dark:text-white mb-1">Main Canopy</div>
              <div className="text-gray-500 dark:text-gray-400">{rig.mainCanopy.manufacturer ?? '—'} {rig.mainCanopy.model ?? ''} {rig.mainCanopy.size ?? ''}</div>
              <div className="text-gray-400 dark:text-gray-500">{rig.mainCanopy.totalJumps} jumps · {rig.mainCanopy.jumpsSinceInspection} since inspection</div>
            </div>
          )}
          {rig.reserve && (
            <div>
              <div className="font-semibold text-gray-900 dark:text-white mb-1">Reserve</div>
              <div className="text-gray-500 dark:text-gray-400">{rig.reserve.manufacturer ?? '—'} {rig.reserve.model ?? ''}</div>
              <div className="text-gray-400 dark:text-gray-500">
                Repack due: {rig.reserve.repackDueDate ? new Date(rig.reserve.repackDueDate).toLocaleDateString() : '—'}
              </div>
            </div>
          )}
          {rig.aad && (
            <div>
              <div className="font-semibold text-gray-900 dark:text-white mb-1">AAD</div>
              <div className="text-gray-500 dark:text-gray-400">{rig.aad.manufacturer ?? '—'} {rig.aad.model ?? ''}</div>
              <div className="text-gray-400 dark:text-gray-500">
                Service due: {rig.aad.nextServiceDueDate ? new Date(rig.aad.nextServiceDueDate).toLocaleDateString() : '—'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Maintenance history */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3.5">
          <Wrench size={16} className="inline align-middle mr-1.5" />
          Maintenance History
        </h2>
        {events.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-sm">No maintenance events recorded.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {events.slice(0, 10).map((evt: any) => (
              <div key={evt.id} className="px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 text-[13px]">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {evt.maintenanceType} — {evt.componentType}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500 text-xs">
                    {new Date(evt.eventDate).toLocaleDateString()}
                  </span>
                </div>
                {evt.findings && <div className="text-gray-500 dark:text-gray-400 mt-1">{evt.findings}</div>}
                {evt.performedByName && (
                  <div className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                    By: {evt.performedByName}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RigDetailPage() {
  return (
    <RouteGuard allowedRoles={[...ROLE_GROUPS.OPERATIONS, ...ROLE_GROUPS.SAFETY, 'RIGGER', 'ATHLETE']}>
      <RigDetailContent />
    </RouteGuard>
  );
}
