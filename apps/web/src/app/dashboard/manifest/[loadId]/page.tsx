'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  useLoad,
  useUpdateLoadStatus,
  useAddJumperToSlot,
  useTransitionLoad,
  useRunCGCheck,
  useExitOrder,
  useLoadNotes,
  type LoadStatus,
  type CGCheckResult,
  type ExitOrderGroup,
  type LoadNote,
} from '@/hooks/useManifest';
import { SlotChip } from '@/components/SlotChip';
import { CGGauge } from '@/components/CGGauge';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { apiGet } from '@/lib/api';

// ---------------------------------------------------------------------------
// FSM: allowed transitions per status
// ---------------------------------------------------------------------------
const STATUS_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['FILLING', 'CANCELLED'],
  FILLING: ['LOCKED', 'CANCELLED'],
  LOCKED: ['THIRTY_MIN', 'CANCELLED'],
  THIRTY_MIN: ['TWENTY_MIN', 'CANCELLED'],
  TWENTY_MIN: ['TEN_MIN', 'CANCELLED'],
  TEN_MIN: ['BOARDING', 'CANCELLED'],
  BOARDING: ['AIRBORNE', 'CANCELLED'],
  AIRBORNE: ['LANDED'],
  LANDED: ['COMPLETE'],
};

const TRANSITION_LABELS: Record<string, string> = {
  FILLING: 'Mark Filling',
  LOCKED: 'Lock Load',
  THIRTY_MIN: '30-Min Call',
  TWENTY_MIN: '20-Min Call',
  TEN_MIN: '10-Min Call',
  BOARDING: 'Begin Boarding',
  AIRBORNE: 'Launch',
  LANDED: 'Mark Landed',
  COMPLETE: 'Complete',
  CANCELLED: 'Cancel Load',
};

const TRANSITION_STYLES: Record<string, string> = {
  FILLING: 'bg-blue-100 hover:bg-blue-200 text-blue-700',
  LOCKED: 'bg-amber-100 hover:bg-amber-200 text-amber-700',
  THIRTY_MIN: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700',
  TWENTY_MIN: 'bg-orange-100 hover:bg-orange-200 text-orange-700',
  TEN_MIN: 'bg-rose-100 hover:bg-rose-200 text-rose-700',
  BOARDING: 'bg-orange-200 hover:bg-orange-300 text-orange-800',
  AIRBORNE: 'bg-red-100 hover:bg-red-200 text-red-700',
  LANDED: 'bg-purple-100 hover:bg-purple-200 text-purple-700',
  COMPLETE: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
  CANCELLED: 'bg-slate-200 hover:bg-slate-300 text-slate-700',
};

// Statuses at or after LOCKED where exit order is meaningful
const EXIT_ORDER_ELIGIBLE: string[] = [
  'LOCKED', 'THIRTY_MIN', 'TWENTY_MIN', 'TEN_MIN',
  'BOARDING', 'AIRBORNE', 'LANDED', 'COMPLETE',
];

// CG result badge colours
const CG_RESULT_STYLES: Record<string, string> = {
  PASS: 'bg-green-100 text-green-800 border-green-300',
  FAIL: 'bg-red-100 text-red-800 border-red-300',
  MARGINAL: 'bg-amber-100 text-amber-800 border-amber-300',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
interface LoadDetailPageProps {
  params: { loadId: string };
}

interface ManifestUserSearchRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  totalJumps: number;
}

export default function LoadDetailPage({ params }: LoadDetailPageProps) {
  const { data: load, isLoading, error } = useLoad(params.loadId);
  const updateLoadStatus = useUpdateLoadStatus(params.loadId);
  const addJumper = useAddJumperToSlot(params.loadId);
  const transitionLoad = useTransitionLoad(params.loadId);
  const runCGCheck = useRunCGCheck(params.loadId);

  // Jumper modal
  const [isAddJumperOpen, setIsAddJumperOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ManifestUserSearchRow[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addSlotError, setAddSlotError] = useState<string | null>(null);

  // CG check
  const [fuelWeightInput, setFuelWeightInput] = useState('');
  const [cgError, setCgError] = useState<string | null>(null);

  // Override dialog (CG gate on LOCKED -> THIRTY_MIN)
  const [overrideTarget, setOverrideTarget] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideError, setOverrideError] = useState<string | null>(null);

  // Transition errors
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Notes
  const {
    data: notes,
    isLoading: notesLoading,
    error: notesError,
    createNote,
    deleteNote,
  } = useLoadNotes(params.loadId);
  const [noteContent, setNoteContent] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);

  // Exit order
  const [showExitOrder, setShowExitOrder] = useState(false);
  const isExitOrderEligible = load ? EXIT_ORDER_ELIGIBLE.includes(load.status) : false;
  const { data: exitOrderData, isLoading: exitOrderLoading, error: exitOrderError } =
    useExitOrder(params.loadId, showExitOrder && isExitOrderEligible);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const latestCgCheck: CGCheckResult | undefined =
    load?.cgChecks && load.cgChecks.length > 0
      ? load.cgChecks[load.cgChecks.length - 1]
      : undefined;

  const hasCgPass = latestCgCheck?.result === 'PASS';

  const needsCgGate = useCallback(
    (toStatus: string) => {
      // CG blocking gate: LOCKED -> THIRTY_MIN is blocked unless CG check is PASS
      return load?.status === 'LOCKED' && toStatus === 'THIRTY_MIN' && !hasCgPass;
    },
    [load?.status, hasCgPass],
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleTransition = useCallback(
    (toStatus: string) => {
      setTransitionError(null);

      if (needsCgGate(toStatus)) {
        // Open override dialog
        setOverrideTarget(toStatus);
        setOverrideReason('');
        setOverrideError(null);
        return;
      }

      transitionLoad.mutate(
        { toStatus },
        {
          onError: (err: Error) => {
            setTransitionError(err.message || 'Transition failed');
          },
        },
      );
    },
    [needsCgGate, transitionLoad],
  );

  const handleOverrideConfirm = useCallback(() => {
    if (!overrideTarget) return;
    if (overrideReason.trim().length < 10) {
      setOverrideError('Override reason must be at least 10 characters.');
      return;
    }
    setOverrideError(null);
    transitionLoad.mutate(
      {
        toStatus: overrideTarget,
        overrideGate: 'CG_CHECK',
        overrideReason: overrideReason.trim(),
      },
      {
        onSuccess: () => {
          setOverrideTarget(null);
          setOverrideReason('');
        },
        onError: (err: Error) => {
          setOverrideError(err.message || 'Override failed');
        },
      },
    );
  }, [overrideTarget, overrideReason, transitionLoad]);

  const handleRunCGCheck = useCallback(() => {
    setCgError(null);
    const payload = fuelWeightInput
      ? { fuelWeight: parseFloat(fuelWeightInput) }
      : undefined;
    runCGCheck.mutate(payload, {
      onError: (err: Error) => {
        setCgError(err.message || 'CG check failed');
      },
    });
  }, [fuelWeightInput, runCGCheck]);

  const handleStatusChange = (newStatus: string) => {
    updateLoadStatus.mutate(newStatus);
  };

  const handleAddJumper = (userId: string) => {
    if (!selectedSlotId) {
      setAddSlotError('Select a slot on the load first.');
      return;
    }
    const target = load?.slots.find((s) => s.id === selectedSlotId);
    if (target?.jumper) {
      setAddSlotError('This slot already has a jumper. Remove them first or choose another slot.');
      return;
    }
    setAddSlotError(null);
    addJumper.mutate(
      { userId, weight: 180 },
      {
        onSuccess: () => {
          setIsAddJumperOpen(false);
          setSearchQuery('');
          setSelectedSlotId(null);
        },
        onError: (err: Error) => {
          setAddSlotError(err.message || 'Failed to add jumper to load');
        },
      }
    );
  };

  useEffect(() => {
    if (!isAddJumperOpen) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const q = searchQuery.trim();
        const path = q
          ? `/users?limit=30&search=${encodeURIComponent(q)}`
          : '/users?limit=30';
        const res = await apiGet<{ success?: boolean; data?: ManifestUserSearchRow[] }>(path);
        if (cancelled) return;
        if (res && Array.isArray(res.data)) {
          setSearchResults(res.data);
        } else {
          setSearchResults([]);
        }
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isAddJumperOpen, searchQuery]);

  const handleCreateNote = useCallback(() => {
    const trimmed = noteContent.trim();
    if (!trimmed) return;
    setNoteError(null);
    createNote.mutate(
      { content: trimmed },
      {
        onSuccess: () => {
          setNoteContent('');
        },
        onError: (err: Error) => {
          setNoteError(err.message || 'Failed to add note');
        },
      },
    );
  }, [noteContent, createNote]);

  const handleDeleteNote = useCallback(
    (noteId: number) => {
      setNoteError(null);
      deleteNote.mutate(noteId, {
        onError: (err: Error) => {
          setNoteError(err.message || 'Failed to delete note');
        },
      });
    },
    [deleteNote],
  );

  // ---------------------------------------------------------------------------
  // Loading / Error states
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Loading load details...</p>
        </div>
      </div>
    );
  }

  if (error || !load) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto bg-red-100 border border-red-400 text-red-700 p-4 rounded-lg">
          Failed to load details: {error?.message}
        </div>
      </div>
    );
  }

  const availableTransitions = STATUS_TRANSITIONS[load.status] || [];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{load.aircraftReg}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Load ID: {load.id}</p>
          </div>
          <StatusBadge status={load.status} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* ============================================================= */}
          {/* Main Content (2 cols)                                         */}
          {/* ============================================================= */}
          <div className="lg:col-span-2 space-y-6">
            {/* Load Info */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Load Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Exit Altitude</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {load.exitAltitude.toLocaleString()} ft
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Call Time</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {new Date(load.callTime).toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Slots Filled</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {load.currentSlots}/{load.totalSlots}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{load.status}</p>
                </div>
              </div>
            </div>

            {/* CG Gauge */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm p-6">
              <CGGauge
                position={load.cg.position}
                minSafe={load.cg.min}
                maxSafe={load.cg.max}
              />
            </div>

            {/* --------------------------------------------------------- */}
            {/* B. CG Check Panel                                         */}
            {/* --------------------------------------------------------- */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">CG Check</h2>

              {load.slots.length > 0 ? (
                <>
                  {/* Run CG check controls */}
                  <div className="flex items-end gap-3 mb-4">
                    <div className="flex-1">
                      <label htmlFor="fuelWeight" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Fuel Weight Override (lbs)
                      </label>
                      <input
                        id="fuelWeight"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Optional"
                        value={fuelWeightInput}
                        onChange={(e) => setFuelWeightInput(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <button
                      onClick={handleRunCGCheck}
                      disabled={runCGCheck.isPending}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {runCGCheck.isPending && (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                      )}
                      Run CG Check
                    </button>
                  </div>

                  {/* CG error */}
                  {cgError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                      {cgError}
                    </div>
                  )}

                  {/* Latest result */}
                  {latestCgCheck && (
                    <div className={`mb-4 p-4 border rounded-lg ${CG_RESULT_STYLES[latestCgCheck.result] || ''}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-lg">{latestCgCheck.result}</span>
                        <span className="text-xs opacity-70">
                          {new Date(latestCgCheck.checkedAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="font-medium">Total Weight:</span>{' '}
                          {latestCgCheck.totalWeight.toLocaleString()} lbs
                        </div>
                        <div>
                          <span className="font-medium">Weight Margin:</span>{' '}
                          {latestCgCheck.weightMargin > 0 ? '+' : ''}
                          {latestCgCheck.weightMargin.toLocaleString()} lbs
                        </div>
                        <div>
                          <span className="font-medium">CG Position:</span>{' '}
                          {latestCgCheck.cgPosition.toFixed(1)}%
                        </div>
                        <div>
                          <span className="font-medium">Limits:</span>{' '}
                          {latestCgCheck.forwardLimit.toFixed(1)}% &ndash; {latestCgCheck.aftLimit.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CG check history */}
                  {load.cgChecks && load.cgChecks.length > 1 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800">
                        CG Check History ({load.cgChecks.length} checks)
                      </summary>
                      <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                        {[...load.cgChecks].reverse().map((check) => (
                          <div
                            key={check.id}
                            className={`p-2 border rounded text-xs ${CG_RESULT_STYLES[check.result] || ''}`}
                          >
                            <span className="font-semibold">{check.result}</span>
                            {' | '}
                            Total: {check.totalWeight.toLocaleString()} lbs
                            {' | '}
                            CG: {check.cgPosition.toFixed(1)}%
                            {' | '}
                            {new Date(check.checkedAt).toLocaleString()}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Add jumpers to slots before running a CG check.
                </p>
              )}
            </div>

            {/* --------------------------------------------------------- */}
            {/* C. Exit Order Display                                      */}
            {/* --------------------------------------------------------- */}
            {isExitOrderEligible && (
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Exit Order</h2>
                  <button
                    onClick={() => setShowExitOrder((v) => !v)}
                    className="px-4 py-2 border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-lg font-semibold text-sm transition-colors"
                  >
                    {showExitOrder ? 'Hide Exit Order' : 'View Exit Order'}
                  </button>
                </div>

                {showExitOrder && (
                  <>
                    {exitOrderLoading && (
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm py-4">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        Loading exit order...
                      </div>
                    )}

                    {exitOrderError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                        Failed to load exit order: {(exitOrderError as Error).message}
                      </div>
                    )}

                    {exitOrderData && (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {exitOrderData.totalSlots} total slot{exitOrderData.totalSlots !== 1 ? 's' : ''}
                        </p>
                        {exitOrderData.groups.map((group: ExitOrderGroup) => (
                          <div key={group.group} className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 dark:border-slate-700">
                              <span className="font-semibold text-gray-900 dark:text-white">
                                Group {group.group}: {group.label}
                              </span>
                            </div>
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                                  <th className="px-4 py-2">Pos</th>
                                  <th className="px-4 py-2">Jumper</th>
                                  <th className="px-4 py-2 text-right">Weight</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.slots.map((slot) => (
                                  <tr key={slot.slotId} className="border-t border-gray-100">
                                    <td className="px-4 py-2 font-mono text-gray-700 dark:text-gray-300">{slot.position}</td>
                                    <td className="px-4 py-2 text-gray-900 dark:text-white">{slot.jumperName}</td>
                                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{slot.weight} lbs</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Slots Grid */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Jump Slots</h2>
              </div>
              <div className="slot-grid">
                {load.slots.map((slot) => (
                  <div
                    key={slot.id}
                    onClick={() => {
                      setSelectedSlotId(slot.id);
                      setIsAddJumperOpen(true);
                    }}
                  >
                    <SlotChip slot={slot} />
                  </div>
                ))}
              </div>
            </div>

            {/* --------------------------------------------------------- */}
            {/* D. Load Notes Panel                                        */}
            {/* --------------------------------------------------------- */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Load Notes</h2>

              {/* Add note form */}
              <div className="mb-4">
                <textarea
                  rows={3}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Add a note for this load..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  maxLength={2000}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">
                    {noteContent.length}/2000
                  </span>
                  <button
                    onClick={handleCreateNote}
                    disabled={createNote.isPending || noteContent.trim().length === 0}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {createNote.isPending && (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    )}
                    Add Note
                  </button>
                </div>
              </div>

              {/* Note error */}
              {noteError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                  {noteError}
                </div>
              )}

              {/* Notes list */}
              {notesLoading && (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm py-4">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Loading notes...
                </div>
              )}

              {notesError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                  Failed to load notes: {(notesError as Error).message}
                </div>
              )}

              {notes && notes.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-2">No notes yet.</p>
              )}

              {notes && notes.length > 0 && (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {notes.map((note: LoadNote) => (
                    <div
                      key={note.id}
                      className="p-3 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {note.userName || 'Unknown User'}
                            </span>
                            <span className="text-xs text-gray-400 shrink-0">
                              {new Date(note.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                            {note.content}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          disabled={deleteNote.isPending}
                          className="shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Delete note"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ============================================================= */}
          {/* Sidebar                                                       */}
          {/* ============================================================= */}
          <div className="space-y-4">
            {/* --------------------------------------------------------- */}
            {/* A. Load Status Transition Panel                            */}
            {/* --------------------------------------------------------- */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status Actions</h2>

              {/* Inline transition error */}
              {transitionError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start gap-2">
                  <svg className="h-4 w-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{transitionError}</span>
                </div>
              )}

              {/* CG warning for LOCKED->THIRTY_MIN */}
              {load.status === 'LOCKED' && !hasCgPass && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg">
                  <span className="font-semibold">CG Gate:</span> No passing CG check on record.
                  Advancing to 30-Min Call will require an override with reason.
                </div>
              )}

              <div className="space-y-2">
                {availableTransitions.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No transitions available.</p>
                ) : (
                  availableTransitions.map((target) => (
                    <button
                      key={target}
                      onClick={() => handleTransition(target)}
                      disabled={transitionLoad.isPending}
                      className={`w-full px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${TRANSITION_STYLES[target] || 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                    >
                      {transitionLoad.isPending && (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                      )}
                      {TRANSITION_LABELS[target] || target}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Manifest Summary */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Manifest</h2>
              <div className="space-y-2">
                <button
                  onClick={() => window.print()}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Generate Manifest
                </button>
                <button
                  onClick={() => window.print()}
                  className="w-full px-4 py-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg font-semibold transition-colors"
                >
                  Print Manifest
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                {load.currentSlots} jumpers confirmed for this load
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* Add Jumper Modal                                                  */}
      {/* ================================================================= */}
      <Modal
        isOpen={isAddJumperOpen}
        onClose={() => {
          setIsAddJumperOpen(false);
          setSearchQuery('');
          setSearchResults([]);
          setAddSlotError(null);
        }}
        title="Add Jumper to Slot"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Search people at this dropzone, then select one to add a manifest slot (weight defaults to 180 lbs until profile
            weight is wired).
          </p>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          {addSlotError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{addSlotError}</div>
          )}

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {searchLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Searching…</p>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
                No users found. Try another search, or confirm the person has a role at this dropzone.
              </p>
            ) : (
              searchResults.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleAddJumper(String(u.id))}
                  disabled={addJumper.isPending}
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    ID {u.id} · {u.totalJumps ?? 0} jumps · {u.email}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* ================================================================= */}
      {/* CG Override Dialog Modal                                          */}
      {/* ================================================================= */}
      <Modal
        isOpen={overrideTarget !== null}
        onClose={() => {
          setOverrideTarget(null);
          setOverrideReason('');
          setOverrideError(null);
        }}
        title="CG Gate Override Required"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg">
            The last CG check did not pass. You may override this gate, but you
            must provide a reason (minimum 10 characters).
          </div>

          <div>
            <label htmlFor="overrideReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Override Reason
            </label>
            <textarea
              id="overrideReason"
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Explain why this CG gate is being overridden..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {overrideReason.trim().length}/10 characters minimum
            </p>
          </div>

          {overrideError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {overrideError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setOverrideTarget(null);
                setOverrideReason('');
                setOverrideError(null);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 rounded-lg font-semibold text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleOverrideConfirm}
              disabled={transitionLoad.isPending || overrideReason.trim().length < 10}
              className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {transitionLoad.isPending && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              Override &amp; Continue
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
