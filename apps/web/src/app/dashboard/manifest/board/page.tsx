'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';
import {
  Plane,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Plus,
  RefreshCw,
  Loader2,
} from 'lucide-react';

const STATUS_STYLES: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  OPEN:       { bg: 'bg-blue-50',    text: 'text-blue-500',    darkBg: 'dark:bg-blue-900/30',    darkText: 'dark:text-blue-400' },
  FILLING:    { bg: 'bg-blue-50',    text: 'text-blue-500',    darkBg: 'dark:bg-blue-900/30',    darkText: 'dark:text-blue-400' },
  LOCKED:     { bg: 'bg-amber-50',   text: 'text-amber-700',   darkBg: 'dark:bg-amber-900/30',   darkText: 'dark:text-amber-400' },
  THIRTY_MIN: { bg: 'bg-amber-50',   text: 'text-amber-700',   darkBg: 'dark:bg-amber-900/30',   darkText: 'dark:text-amber-400' },
  TWENTY_MIN: { bg: 'bg-amber-50',   text: 'text-amber-700',   darkBg: 'dark:bg-amber-900/30',   darkText: 'dark:text-amber-400' },
  TEN_MIN:    { bg: 'bg-orange-50',  text: 'text-orange-700',  darkBg: 'dark:bg-orange-900/30',  darkText: 'dark:text-orange-400' },
  BOARDING:   { bg: 'bg-violet-50',  text: 'text-violet-500',  darkBg: 'dark:bg-violet-900/30',  darkText: 'dark:text-violet-400' },
  AIRBORNE:   { bg: 'bg-emerald-50', text: 'text-emerald-700', darkBg: 'dark:bg-emerald-900/30', darkText: 'dark:text-emerald-400' },
  LANDED:     { bg: 'bg-teal-50',    text: 'text-teal-700',    darkBg: 'dark:bg-teal-900/30',    darkText: 'dark:text-teal-400' },
  COMPLETE:   { bg: 'bg-slate-100',  text: 'text-slate-500',   darkBg: 'dark:bg-slate-700/50',   darkText: 'dark:text-slate-400' },
  CANCELLED:  { bg: 'bg-red-50',     text: 'text-red-700',     darkBg: 'dark:bg-red-900/30',     darkText: 'dark:text-red-400' },
};

interface LoadCard {
  id: number;
  uuid: string;
  loadNumber: string;
  status: string;
  aircraftRegistration: string;
  aircraftType: string;
  pilotName: string;
  slotCount: number;
  maxCapacity: number;
  scheduledAt: string;
  currentWeight: number;
}

function ManifestBoardContent() {
  const [loads, setLoads] = useState<LoadCard[]>([]);
  const [loading, setLoading] = useState(true);

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
    const interval = setInterval(fetchLoads, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [fetchLoads]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 size={32} className="text-secondary-500 animate-spin" />
      </div>
    );
  }

  // Group loads by status category
  const active = loads.filter((l) => !['COMPLETE', 'CANCELLED'].includes(l.status));
  const completed = loads.filter((l) => l.status === 'COMPLETE');

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Manifest Board
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              {active.length} active load{active.length !== 1 ? 's' : ''} · Real-time updates every 15s
            </p>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={fetchLoads}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <Link
              href="/dashboard/manifest"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary-500 dark:bg-primary-600 text-white cursor-pointer text-sm no-underline font-medium hover:opacity-90 transition-opacity"
            >
              <Plus size={14} /> New Load
            </Link>
          </div>
        </div>

        {active.length === 0 && (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <Plane size={48} strokeWidth={1.5} className="mx-auto mb-4" />
            <p className="text-base">No active loads. Create one to get started.</p>
          </div>
        )}

        {/* Load cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {active.map((load) => {
            const ss = STATUS_STYLES[load.status] ?? STATUS_STYLES.OPEN;
            const fillPct = load.maxCapacity > 0 ? Math.round((load.slotCount / load.maxCapacity) * 100) : 0;
            return (
              <Link key={load.id} href={`/dashboard/manifest/${load.id}`} className="no-underline group">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700 transition-shadow hover:shadow-lg cursor-pointer">
                  {/* Header */}
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <Plane size={18} className="text-primary-500 dark:text-primary-400" />
                      <span className="font-bold text-base text-gray-900 dark:text-white">
                        {load.loadNumber}
                      </span>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${ss.bg} ${ss.text} ${ss.darkBg} ${ss.darkText}`}>
                      {load.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-400 dark:text-gray-500">Aircraft</span>
                      <div className="text-gray-900 dark:text-white font-medium">{load.aircraftRegistration}</div>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-gray-500">Pilot</span>
                      <div className="text-gray-900 dark:text-white font-medium">{load.pilotName ?? '—'}</div>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-gray-500">Scheduled</span>
                      <div className="text-gray-900 dark:text-white font-medium">
                        {new Date(load.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-gray-500">Weight</span>
                      <div className="text-gray-900 dark:text-white font-medium">{load.currentWeight} lbs</div>
                    </div>
                  </div>

                  {/* Fill bar */}
                  <div className="mt-3.5">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        <Users size={12} className="inline align-middle mr-1" />
                        {load.slotCount} / {load.maxCapacity}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{fillPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-200 dark:bg-slate-600">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          fillPct >= 90 ? 'bg-emerald-500' : fillPct >= 60 ? 'bg-sky-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(fillPct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Completed today */}
        {completed.length > 0 && (
          <div className="mt-8">
            <h2 className="text-base font-semibold text-gray-500 dark:text-gray-400 mb-3">
              <CheckCircle2 size={16} className="inline align-middle mr-1.5" />
              Completed Today ({completed.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {completed.map((load) => (
                <Link
                  key={load.id}
                  href={`/dashboard/manifest/${load.id}`}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 text-sm no-underline hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  {load.loadNumber} · {load.slotCount} jumpers
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ManifestBoardPage() {
  return (
    <RouteGuard allowedRoles={[...ROLE_GROUPS.MANIFEST, ...ROLE_GROUPS.INSTRUCTORS, 'ATHLETE', 'PILOT']}>
      <ManifestBoardContent />
    </RouteGuard>
  );
}
