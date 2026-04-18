'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api';
import {
  Plane,
  Users,
  Clock,
  RefreshCw,
  Loader2,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-500', FILLING: 'bg-sky-500', LOCKED: 'bg-amber-500',
  THIRTY_MIN: 'bg-amber-500', TWENTY_MIN: 'bg-orange-500', TEN_MIN: 'bg-orange-500',
  BOARDING: 'bg-violet-500', AIRBORNE: 'bg-emerald-500',
};

interface PublicLoad {
  id: number;
  loadNumber: string;
  status: string;
  aircraftType: string;
  scheduledAt: string;
  slotCount: number;
  maxCapacity: number;
  spotsAvailable: number;
}

export default function AthleteLoadBoardPage() {
  const { user } = useAuth();
  const [loads, setLoads] = useState<PublicLoad[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<number | null>(null);
  const [joinMsg, setJoinMsg] = useState<string | null>(null);

  const fetchLoads = useCallback(async () => {
    try {
      const res = await apiGet('/manifest/loads?active=true');
      const data = res?.data?.loads ?? res?.data ?? [];
      setLoads(Array.isArray(data) ? data : []);
    } catch {
      setLoads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoads();
    const interval = setInterval(fetchLoads, 20000);
    return () => clearInterval(interval);
  }, [fetchLoads]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 size={32} className="text-secondary-500 animate-spin" />
      </div>
    );
  }

  const joinable = loads.filter((l) => ['OPEN', 'FILLING'].includes(l.status));
  const inProgress = loads.filter((l) => !['OPEN', 'FILLING', 'COMPLETE', 'CANCELLED'].includes(l.status));

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-5">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Load Board</h1>
          <button
            onClick={fetchLoads}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {joinMsg && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
            {joinMsg}
          </div>
        )}

        {/* Joinable loads */}
        {joinable.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-3">
              Available to Join
            </h2>
            <div className="flex flex-col gap-3">
              {joinable.map((load) => (
                <div key={load.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <Plane size={18} className="text-primary-500 dark:text-primary-400" />
                      <span className="font-bold text-base text-gray-900 dark:text-white">{load.loadNumber}</span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(load.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1">
                      <Users size={14} />
                      {load.slotCount}/{load.maxCapacity} · {load.aircraftType ?? 'Aircraft'}
                    </div>
                    <button
                      disabled={joining === load.id || load.spotsAvailable === 0}
                      onClick={async () => {
                        setJoining(load.id);
                        setJoinMsg(null);
                        try {
                          await apiPost(`/manifest/loads/${load.id}/join`, {});
                          setJoinMsg('Joined load ' + load.loadNumber);
                          fetchLoads();
                        } catch (err: any) {
                          setJoinMsg(err.message || 'Failed to join load');
                        } finally {
                          setJoining(null);
                          setTimeout(() => setJoinMsg(null), 3000);
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
                    >
                      {joining === load.id ? 'Joining...' : load.spotsAvailable === 0 ? 'Full' : 'Join'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* In-progress loads */}
        {inProgress.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              In Progress
            </h2>
            <div className="flex flex-col gap-2">
              {inProgress.map((load) => (
                <div key={load.id} className="bg-white dark:bg-slate-800 rounded-lg p-3.5 border border-gray-200 dark:border-slate-700 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[load.status] ?? 'bg-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900 dark:text-white">{load.loadNumber}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">
                      {load.status.replace(/_/g, ' ')} · {load.slotCount} jumpers
                    </div>
                  </div>
                  <Clock size={14} className="text-gray-400 dark:text-gray-500 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {joinable.length === 0 && inProgress.length === 0 && (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <Plane size={48} strokeWidth={1.5} className="mx-auto mb-4" />
            <p className="text-base">No active loads right now.</p>
            <p className="text-sm">Check back soon or pull to refresh.</p>
          </div>
        )}
      </div>
    </div>
  );
}
