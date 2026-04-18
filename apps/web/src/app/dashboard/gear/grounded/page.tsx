'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';
import {
  AlertOctagon,
  Loader2,
  ChevronRight,
  Shield,
  Calendar,
  User,
} from 'lucide-react';

interface GroundedRig {
  id: number;
  rigName: string;
  rigType: string;
  serialNumber: string | null;
  ownerName: string;
  groundingRecords: Array<{
    id: number;
    componentType: string;
    reason: string;
    groundedAt: string;
    groundedByName: string;
  }>;
}

function GroundedContent() {
  const [rigs, setRigs] = useState<GroundedRig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGrounded() {
      try {
        const res = await apiGet('/rig-maintenance/rigs/grounded');
        setRigs(res?.data?.rigs ?? []);
      } catch {
        setRigs([]);
      } finally {
        setLoading(false);
      }
    }
    fetchGrounded();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 size={32} className="text-secondary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-[80vh]">
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-gray-900 dark:text-white m-0">Grounded Rigs</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          {rigs.length} rig{rigs.length !== 1 ? 's' : ''} currently grounded — cannot be used for manifesting
        </p>
      </div>

      {rigs.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <Shield size={48} strokeWidth={1.5} className="mx-auto mb-4" />
          <p className="text-base">No grounded rigs. All clear.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rigs.map((rig) => (
            <Link key={rig.id} href={`/dashboard/gear/rigs/${rig.id}`} className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-red-300/40 dark:border-red-800/40 no-underline block">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertOctagon size={18} className="text-red-500" />
                    <span className="text-base font-bold text-gray-900 dark:text-white">{rig.rigName}</span>
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 text-[13px] mt-1">
                    {rig.rigType} · {rig.serialNumber ?? 'No S/N'} · Owner: {rig.ownerName}
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400 dark:text-gray-500" />
              </div>
              {/* Grounding records */}
              <div className="flex flex-col gap-1.5">
                {rig.groundingRecords.map((gr) => (
                  <div key={gr.id} className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-[13px] text-red-700 dark:text-red-400">
                    <div className="font-semibold">{gr.componentType}: {gr.reason}</div>
                    <div className="flex gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span><Calendar size={11} className="inline align-middle mr-0.5" />
                        {new Date(gr.groundedAt).toLocaleDateString()}
                      </span>
                      <span><User size={11} className="inline align-middle mr-0.5" />
                        {gr.groundedByName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GroundedPage() {
  return (
    <RouteGuard allowedRoles={[...ROLE_GROUPS.SAFETY, 'RIGGER', ...ROLE_GROUPS.OPERATIONS]}>
      <GroundedContent />
    </RouteGuard>
  );
}
