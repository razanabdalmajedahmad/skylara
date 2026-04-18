'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { PageEmpty, PageError } from '@repo/ui';
import {
  Zap,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Award,
  Wind,
  Filter,
  Download,
  ChevronDown,
} from 'lucide-react';

interface JumpEntry {
  id: string;
  jumpNumber: number;
  date: string;
  dz: string;
  aircraft: string;
  altitude: number;
  type: 'fun' | 'tandem' | 'aff';
  /** Freefall duration in minutes (for display) */
  freefallMinutes: number;
  exitType: string;
  notes?: string;
}

interface LogbookStatsPayload {
  totalJumps: number;
  totalFreefallTime: number;
  jumpTypeBreakdown: Record<string, number>;
  disciplinesBreakdown: Record<string, number>;
}

type TypeFilterType = 'all' | 'fun' | 'tandem' | 'aff';

function mapApiEntryToJump(e: Record<string, unknown>): JumpEntry {
  const jumpType = String(e.jumpType ?? 'FUN_JUMP');
  const type: JumpEntry['type'] =
    jumpType === 'TANDEM' ? 'tandem' : jumpType === 'AFF' ? 'aff' : 'fun';
  const load = e.load as { loadNumber?: number } | null | undefined;
  const dz = e.dropzone as { name?: string } | null | undefined;
  const ffSec = typeof e.freefallTime === 'number' ? e.freefallTime : 0;
  return {
    id: String(e.id),
    jumpNumber: Number(e.jumpNumber) || 0,
    date: e.createdAt ? new Date(String(e.createdAt)).toLocaleDateString() : '',
    dz: dz?.name ?? '—',
    aircraft: load?.loadNumber != null ? `Load ${load.loadNumber}` : '—',
    altitude: typeof e.altitude === 'number' ? e.altitude : 0,
    type,
    freefallMinutes: ffSec / 60,
    exitType: jumpType,
    notes: e.notes ? String(e.notes) : undefined,
  };
}

export default function LogbookPage() {
  const [typeFilter, setTypeFilter] = useState<TypeFilterType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [jumps, setJumps] = useState<JumpEntry[]>([]);
  const [statsSummary, setStatsSummary] = useState<LogbookStatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showAddJumpModal, setShowAddJumpModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [listRes, statsRes] = await Promise.all([
        apiGet<{ success: boolean; data: unknown[] }>('/logbook?limit=100'),
        apiGet<{ success: boolean; data: LogbookStatsPayload }>('/logbook/stats'),
      ]);

      if (statsRes?.success && statsRes.data) {
        setStatsSummary(statsRes.data);
      } else {
        setStatsSummary(null);
      }

      if (listRes?.success && Array.isArray(listRes.data)) {
        setJumps(listRes.data.map((e) => mapApiEntryToJump(e as Record<string, unknown>)));
      } else {
        setJumps([]);
      }
    } catch {
      setFetchError('Could not load logbook. Check your connection and try again.');
      setJumps([]);
      setStatsSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter jumps
  const filteredJumps = useMemo(() => {
    let result = jumps;

    // Filter by type
    if (typeFilter !== 'all') {
      result = result.filter((j) => j.type === typeFilter);
    }

    // Filter by date range if specified
    if (dateRange.start) {
      result = result.filter((j) => j.date >= dateRange.start);
    }
    if (dateRange.end) {
      result = result.filter((j) => j.date <= dateRange.end);
    }

    return result;
  }, [typeFilter, dateRange, jumps]);

  // Calculate stats for filtered jumps (freefall in minutes)
  const displayStats = useMemo(() => {
    const totalJumps = filteredJumps.length;
    const totalFreefallMin = filteredJumps.reduce((sum, jump) => sum + jump.freefallMinutes, 0);

    return {
      totalJumps,
      totalFreefall: totalFreefallMin.toFixed(1),
    };
  }, [filteredJumps]);

  const allTimeFreefallMinutes = statsSummary
    ? (statsSummary.totalFreefallTime || 0) / 60
    : 0;
  const licenseChips = useMemo(() => {
    if (!statsSummary) return [];
    const jt = statsSummary.jumpTypeBreakdown || {};
    const dc = statsSummary.disciplinesBreakdown || {};
    const fromJt = Object.entries(jt).map(([k, v]) => `${k.replace(/_/g, ' ')} (${v})`);
    const fromDc = Object.entries(dc).slice(0, 6).map(([k, v]) => `${k} (${v})`);
    return [...fromJt, ...fromDc];
  }, [statsSummary]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'fun':
        return 'bg-purple-100 text-purple-800';
      case 'tandem':
        return 'bg-blue-100 text-blue-800';
      case 'aff':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'fun':
        return '🎉';
      case 'tandem':
        return '👥';
      case 'aff':
        return '📚';
      default:
        return '🪂';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1B4F72] border-t-transparent" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading logbook…</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-4 lg:p-8">
        <PageError title="Logbook unavailable" message={fetchError} onRetry={() => fetchData()} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 dark:from-transparent to-gray-100 p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Digital Logbook</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">Your complete jump history and progression</p>
          </div>
          <button
            onClick={() => setShowAddJumpModal(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add Jump
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 lg:grid-cols-4">
        <div className="rounded-lg bg-white dark:bg-slate-800 p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Jumps</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {statsSummary?.totalJumps ?? jumps.length}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white dark:bg-slate-800 p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Freefall Time</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {allTimeFreefallMinutes.toFixed(1)}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">minutes freefall (all jumps)</p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white dark:bg-slate-800 p-6 shadow lg:col-span-2">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Jump types & disciplines</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {licenseChips.length > 0 ? (
              licenseChips.map((label, i) => (
                <div
                  key={`${label}-${i}`}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                >
                  <Award className="h-4 w-4 shrink-0" />
                  {label}
                </div>
              ))
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400">No type breakdown yet</span>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg bg-white dark:bg-slate-800 p-4 shadow">
        <div className="space-y-4 lg:flex lg:gap-6 lg:space-y-0">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Jump Type</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All', emoji: '🪂' },
                { value: 'fun', label: 'Fun Jump', emoji: '🎉' },
                { value: 'tandem', label: 'Tandem', emoji: '👥' },
                { value: 'aff', label: 'AFF', emoji: '📚' },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setTypeFilter(filter.value as TypeFilterType)}
                  className={`flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    typeFilter === filter.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {filter.emoji} {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:flex lg:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="mt-2 rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="mt-2 rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filtered Stats */}
      {(typeFilter !== 'all' || dateRange.start || dateRange.end) && (
        <div className="mb-6 rounded-lg bg-blue-50 p-4 border border-blue-200">
          <p className="text-sm text-blue-900">
            Showing {displayStats.totalJumps} jump{displayStats.totalJumps !== 1 ? 's' : ''} with {displayStats.totalFreefall} minutes freefall time
          </p>
        </div>
      )}

      {/* Jump Log Entries */}
      <div className="space-y-3">
        {filteredJumps.length > 0 ? (
          filteredJumps.map((jump) => (
            <div key={jump.id} className="rounded-lg bg-white dark:bg-slate-800 shadow hover:shadow-lg transition-shadow">
              <button
                onClick={() =>
                  setExpandedId(expandedId === jump.id ? null : jump.id)
                }
                className="w-full text-left p-4 lg:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{getTypeIcon(jump.type)}</div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          Jump #{jump.jumpNumber}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{jump.date}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${getTypeColor(jump.type)}`}>
                      {jump.type}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 text-gray-400 transition-transform ${
                        expandedId === jump.id ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Summary Row */}
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 lg:mt-0">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    {jump.dz}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    {jump.freefallMinutes.toFixed(1)} min FF
                  </div>
                  <div className="flex items-center gap-1">
                    <Wind className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    {jump.altitude.toLocaleString()} ft
                  </div>
                </div>
              </button>

              {/* Expanded Details */}
              {expandedId === jump.id && (
                <div className="border-t border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 p-4 lg:p-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Aircraft</p>
                      <p className="mt-1 font-semibold text-gray-900 dark:text-white">{jump.aircraft}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Altitude</p>
                      <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                        {jump.altitude.toLocaleString()} ft
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Exit Type</p>
                      <p className="mt-1 font-semibold text-gray-900 dark:text-white">{jump.exitType}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Freefall Time</p>
                      <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                        {jump.freefallMinutes.toFixed(1)} minutes
                      </p>
                    </div>
                  </div>
                  {jump.notes && (
                    <div className="mt-4 border-t border-gray-300 dark:border-slate-600 pt-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Notes</p>
                      <p className="mt-1 text-gray-900 dark:text-white">{jump.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <PageEmpty
            title={jumps.length === 0 ? 'No logbook entries yet' : 'No jumps match filters'}
            description={
              jumps.length === 0
                ? 'Add a jump or complete loads to build your logbook.'
                : 'Adjust filters or date range to see more entries.'
            }
            className="shadow"
          />
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-green-600 px-5 py-3 text-white shadow-lg transition-opacity">
          {toast}
        </div>
      )}

      {/* Add Jump Modal */}
      {showAddJumpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddJumpModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Log Jump</h2>
              <button onClick={() => setShowAddJumpModal(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 text-xl">&times;</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const jumpNumber = parseInt((form.elements.namedItem('jumpNumber') as HTMLInputElement).value);
              const altitude = parseInt((form.elements.namedItem('altitude') as HTMLInputElement).value);
              const jumpType = (form.elements.namedItem('jumpType') as HTMLSelectElement).value;
              const freefallTime = parseInt((form.elements.namedItem('freefallTime') as HTMLInputElement).value);
              try {
                await apiPost('/logbook', { jumpNumber, altitude, jumpType, freefallTime });
                setToast('Jump logged successfully');
                setTimeout(() => setToast(null), 3000);
                await fetchData();
              } catch { /* API may not be available */ }
              setShowAddJumpModal(false);
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jump Number</label>
                <input name="jumpNumber" type="number" required min={1} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Altitude (ft)</label>
                <input name="altitude" type="number" required defaultValue={13000} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jump Type</label>
                <select name="jumpType" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-blue-500">
                  <option value="FUN_JUMP">Fun Jump</option>
                  <option value="AFF">AFF</option>
                  <option value="TANDEM">Tandem</option>
                  <option value="COACH">Coach Jump</option>
                  <option value="HOP_N_POP">Hop &apos;n&apos; Pop</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Freefall Time (seconds)</label>
                <input name="freefallTime" type="number" defaultValue={60} min={0} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddJumpModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 font-medium text-sm">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">Log Jump</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
