'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { apiGet, apiPut, apiPost } from '@/lib/api';
import {
  AlertCircle,
  Clock,
  Users,
  Zap,
  CheckCircle,
  AlertTriangle,
  Plane,
  Plus,
  Search,
  Fuel,
  X,
  Shield,
  CreditCard,
  FileSignature,
  Weight,
  Loader2,
  Wand2,
  GripVertical,
  PenTool,
  Sparkles,
} from 'lucide-react';
import { OpsAssistantModal } from './OpsAssistantModal';

// ── TYPES ────────────────────────────────────────────
interface AircraftItem {
  id: string;
  tail: string;
  type: string;
  slots: number;
  status: string;
  pilot: string;
  load: string;
}

// Helper to map API load response to internal Load shape
function mapApiLoad(l: any): Load {
  return {
    id: l.loadNumber || String(l.id),
    aircraft: l.aircraftRegistration || l.aircraft || '',
    pilot: l.pilotName || 'Assigned',
    altitude: 14000,
    status: l.status,
    scheduled: l.scheduledAt
      ? new Date(l.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '',
    countdown: null,
    slots: l.maxCapacity || l.slotsCount || 0,
    filled: l.slotsCount ?? (l.slots?.length || 0),
    weight: l.fuelWeight || 0,
    maxWeight: l.maxWeight || 0,
    fuelWeight: l.fuelWeight || 0,
    fuelCapacity: l.fuelCapacity || 0,
    fuelPercent: l.fuelPercent ?? null,
    jumpers: (l.slots || []).map((s: any) => ({
      name: s.userName || 'Unknown',
      type: s.slotType || 'FUN',
      role: s.jumpType || 'funJumper',
      order: s.position || s.exitGroup || 0,
    })),
    flags: [],
  };
}

// ── STATUS STYLE HELPERS ────────────────────────────────────────
const getStatusBarColor = (status: string): string => {
  const map: Record<string, string> = {
    AIRBORNE: 'bg-blue-500', LANDING: 'bg-teal-500', BOARDING: 'bg-red-500',
    FILLING: 'bg-amber-500', LOCKED: 'bg-violet-500', OPEN: 'bg-emerald-500',
    COMPLETE: 'bg-gray-400',
  };
  return map[status] || 'bg-gray-400';
};

const getStatusBadge = (status: string): string => {
  const map: Record<string, string> = {
    AIRBORNE: 'bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    LANDING: 'bg-teal-50 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
    BOARDING: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    FILLING: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    LOCKED: 'bg-violet-50 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
    OPEN: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    COMPLETE: 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400',
  };
  return map[status] || 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400';
};

const getJumperColor = (type: string): string => {
  const map: Record<string, string> = {
    FUN: '#3B82F6', TAN: '#8B5CF6', AFF: '#F59E0B',
    COACH: '#10B981', WS: '#14B8A6', CAM: '#EF4444', HOP: '#06B6D4',
  };
  return map[type] || '#0EA5E9';
};

const getFillBarColor = (pct: number): string => {
  if (pct > 95) return 'bg-red-500';
  if (pct > 80) return 'bg-amber-500';
  return 'bg-emerald-500';
};

const getWeightBarColor = (pct: number): string => {
  if (pct > 95) return 'bg-red-500';
  if (pct > 85) return 'bg-amber-500';
  return 'bg-emerald-500';
};

const getWeightTextColor = (pct: number): string => {
  if (pct > 95) return 'text-red-500';
  if (pct > 85) return 'text-amber-500';
  return 'text-emerald-500';
};

const getFuelBarColor = (pct: number): string => {
  if (pct <= 15) return 'bg-red-500';
  if (pct <= 50) return 'bg-amber-500';
  return 'bg-emerald-500';
};

const getFuelTextColor = (pct: number): string => {
  if (pct <= 15) return 'text-red-500';
  if (pct <= 25) return 'text-amber-500';
  return 'text-emerald-500';
};

interface Load {
  id: string;
  aircraft: string;
  pilot: string;
  altitude: number;
  status: string;
  scheduled: string;
  countdown: string | null;
  slots: number;
  filled: number;
  weight: number;
  maxWeight: number;
  fuelWeight: number;
  fuelCapacity: number;
  fuelPercent: number | null;
  jumpers: Array<{ name: string; type: string; role: string; order: number }>;
  flags: string[];
}

// ── MAIN COMPONENT ────────────────────────────────────────
interface QueueItem {
  id: string;
  name: string;
  type: string;
  license: string;
  weight: number;
  waiver: boolean;
  paid: boolean;
  flags: string[];
}

export default function ManifestPage() {
  const { user } = useAuth();
  const { formatNumber, formatWeight, formatAltitude } = useLocale();
  const [loads, setLoads] = useState<Load[]>([]);
  const [aircraft, setAircraft] = useState<AircraftItem[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [filter, setFilter] = useState('Active');
  const [searchTerm, setSearchTerm] = useState('');
  const [transitioning, setTransitioning] = useState<string | null>(null);
  const [queueTab, setQueueTab] = useState<'ready' | 'flagged'>('ready');
  const [toast, setToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modal states
  const [reviewJumper, setReviewJumper] = useState<QueueItem | null>(null);
  const [showNewLoad, setShowNewLoad] = useState(false);
  const [newLoadForm, setNewLoadForm] = useState({ aircraftId: '', pilotId: '', altitude: 14000, scheduled: '' });
  const [creatingLoad, setCreatingLoad] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [showOpsAssistant, setShowOpsAssistant] = useState(false);

  // Drag-and-drop state
  const [draggedJumper, setDraggedJumper] = useState<QueueItem | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // Pilot sign-off state
  const [signOffLoad, setSignOffLoad] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  /** Transition a load to a new status via API, with optimistic UI update */
  const handleStatusTransition = async (loadId: string, newStatus: string) => {
    setTransitioning(loadId);
    // Optimistic update
    setLoads((prev) =>
      prev.map((l) => (l.id === loadId ? { ...l, status: newStatus } : l))
    );
    try {
      await apiPost(`/loads/${loadId}/transition`, { toStatus: newStatus });
    } catch (error) {
      console.error('Status transition failed:', error);
      // Revert on failure — re-fetch from API
      try {
        const loadsRes = await apiGet<{ success: boolean; data: any[] }>('/loads?status=all&limit=20');
        if (loadsRes?.data && Array.isArray(loadsRes.data) && loadsRes.data.length > 0) {
          setLoads(loadsRes.data.map(mapApiLoad));
        }
      } catch {
        // Keep current state if re-fetch also fails
      }
    } finally {
      setTransitioning(null);
    }
  };

  /** Fetch all manifest data from API */
  const fetchManifestData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [loadsRes, aircraftRes, queueRes] = await Promise.allSettled([
        apiGet<{ success: boolean; data: any[] }>('/loads?status=all&limit=50'),
        apiGet<{ success: boolean; data: any[] }>('/aircraft'),
        apiGet<{ success: boolean; data: any[] }>('/queue?limit=30'),
      ]);

      const loadsData =
        loadsRes.status === 'fulfilled' && Array.isArray(loadsRes.value?.data) ? loadsRes.value.data : [];

      // Process loads
      if (loadsRes.status === 'fulfilled' && loadsRes.value?.data && Array.isArray(loadsRes.value.data)) {
        setLoads(loadsRes.value.data.map(mapApiLoad));
      }

      // Process aircraft
      if (aircraftRes.status === 'fulfilled' && aircraftRes.value?.data && Array.isArray(aircraftRes.value.data)) {
        setAircraft(aircraftRes.value.data.map((a: any) => ({
          id: String(a.id),
          tail: a.registration || '',
          type: a.type || a.model || '',
          slots: a.maxCapacity || 0,
          status: a.status === 'ACTIVE' ? 'Available' : a.status === 'MX_HOLD' ? 'Maintenance' : a.status,
          pilot: '',
          load: '',
        })));
      }

      // Process queue
      if (queueRes.status === 'fulfilled' && queueRes.value?.data && Array.isArray(queueRes.value.data)) {
        setQueue(queueRes.value.data.map((q: any) => ({
          id: String(q.id),
          name: q.userName || q.name || 'Unknown',
          type: q.slotType || q.type || 'Fun',
          license: q.license || '',
          weight: q.weight || 0,
          waiver: q.waiverSigned ?? true,
          paid: q.paid ?? true,
          flags: q.flags || [],
        })));
      }

      // Check if we got no data at all (use API response, not stale React state)
      const noData =
        loadsData.length === 0 &&
        (loadsRes.status !== 'fulfilled' || !loadsRes.value?.data?.length);
      if (noData && aircraftRes.status !== 'fulfilled') {
        setLoadError('Unable to reach manifest API');
      }
    } catch (error: any) {
      setLoadError(error?.message || 'Failed to load manifest data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchManifestData();
  }, [fetchManifestData]);

  const filtered = loads.filter((load) => {
    const matchesFilter =
      filter === 'All' ||
      (filter === 'Active' && ['OPEN', 'AIRBORNE', 'BOARDING', 'FILLING', 'LOCKED'].includes(load.status)) ||
      (filter === 'Ready' && ['FILLING', 'LOCKED'].includes(load.status)) ||
      (filter === 'Airborne' && load.status === 'AIRBORNE') ||
      (filter === 'Complete' && load.status === 'COMPLETE');

    const matchesSearch = searchTerm === '' || load.id.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const queueWithFlags = queue.filter((q) => q.flags.length > 0);
  const queueReady = queue.filter((q) => q.flags.length === 0);

  /** Add a jumper to a specific load */
  const addJumperToLoad = async (jumper: QueueItem, loadId: string) => {
    const targetLoad = loads.find(l => l.id === loadId);
    if (!targetLoad) return;
    if (targetLoad.filled >= targetLoad.slots) {
      showToast(`Load ${loadId} is full`);
      return;
    }
    // Optimistic UI: add jumper to load, remove from queue
    setLoads(prev => prev.map(l => l.id === loadId ? {
      ...l,
      filled: l.filled + 1,
      jumpers: [...l.jumpers, {
        name: jumper.name.split(' ')[0],
        type: jumper.type === 'Tandem' ? 'TAN' : jumper.type.startsWith('AFF') ? 'AFF' : 'FUN',
        role: jumper.type === 'Tandem' ? 'student' : 'funJumper',
        order: l.jumpers.length + 1,
      }],
      status: l.status === 'OPEN' ? 'FILLING' : l.status,
    } : l));
    setQueue(prev => prev.filter(q => q.id !== jumper.id));
    showToast(`${jumper.name} added to ${loadId}`);

    // API call
    try {
      await apiPost(`/loads/${loadId}/slots`, {
        userId: parseInt(jumper.id.replace('q', '')),
        weight: jumper.weight || 200,
        slotType: jumper.type === 'Tandem' ? 'TANDEM_PASSENGER' : jumper.type.startsWith('AFF') ? 'AFF_STUDENT' : 'FUN',
      });
    } catch { /* optimistic UI already updated */ }
  };

  /** Handle Review — resolve a flag and move jumper to ready */
  const handleResolveFlag = (jumper: QueueItem, action: string) => {
    if (action === 'override') {
      // Move to ready queue (clear flags)
      setQueue(prev => prev.map(q => q.id === jumper.id ? { ...q, flags: [], waiver: true, paid: true } : q));
      showToast(`${jumper.name} approved — flags overridden`);
    } else if (action === 'waiver') {
      setQueue(prev => prev.map(q => q.id === jumper.id ? {
        ...q,
        waiver: true,
        flags: q.flags.filter(f => !f.toLowerCase().includes('waiver')),
      } : q));
      showToast(`Waiver marked as signed for ${jumper.name}`);
    } else if (action === 'paid') {
      setQueue(prev => prev.map(q => q.id === jumper.id ? {
        ...q,
        paid: true,
        flags: q.flags.filter(f => !f.toLowerCase().includes('unpaid')),
      } : q));
      showToast(`Payment recorded for ${jumper.name}`);
    }
    setReviewJumper(null);
  };

  /** Create new load */
  const handleCreateLoad = async () => {
    setCreatingLoad(true);
    const ac = aircraft.find(a => a.id === newLoadForm.aircraftId) || aircraft[0];
    const newId = `L-${String(loads.length + 40).padStart(3, '0')}`;
    const newLoad: Load = {
      id: newId,
      aircraft: ac.tail,
      pilot: ac.pilot,
      altitude: newLoadForm.altitude,
      status: 'OPEN',
      scheduled: newLoadForm.scheduled || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      countdown: null,
      slots: ac.slots,
      filled: 0,
      weight: 0,
      maxWeight: ac.slots * 250,
      fuelWeight: Math.round(ac.slots * 50),
      fuelCapacity: Math.round(ac.slots * 60),
      fuelPercent: 85,
      jumpers: [],
      flags: [],
    };
    setLoads(prev => [...prev, newLoad]);
    showToast(`Load ${newId} created on ${ac.tail}`);
    setShowNewLoad(false);
    setNewLoadForm({ aircraftId: '', pilotId: '', altitude: 14000, scheduled: '' });
    setCreatingLoad(false);

    // API call
    try {
      await apiPost('/loads', {
        aircraftId: newLoadForm.aircraftId || '1',
        loadNumber: parseInt(newId.replace('L-', '')),
        scheduledAt: new Date().toISOString(),
      });
    } catch { /* optimistic UI already updated */ }
  };

  /** Auto-build loads from queue */
  const handleAutoLoad = async () => {
    setAutoLoading(true);
    const ready = queue.filter(q => q.flags.length === 0);
    if (ready.length === 0) {
      showToast('No ready jumpers in queue');
      setAutoLoading(false);
      return;
    }

    // Group by type
    const tandems = ready.filter(q => q.type === 'Tandem');
    const students = ready.filter(q => q.type.startsWith('AFF'));
    const fun = ready.filter(q => !['Tandem'].includes(q.type) && !q.type.startsWith('AFF'));

    const availableAircraft = aircraft.filter(ac => ac.status === 'Available');
    if (availableAircraft.length === 0) {
      showToast('No aircraft available');
      setAutoLoading(false);
      return;
    }

    let newLoads: Load[] = [];
    let assignedIds: string[] = [];
    let loadCounter = loads.length + 40;

    // Assign tandems first (pair with next available), then students, then fun jumpers
    for (const ac of availableAircraft) {
      const remaining = ready.filter(q => !assignedIds.includes(q.id));
      if (remaining.length === 0) break;

      const forThisLoad = remaining.slice(0, ac.slots);
      const newId = `L-${String(++loadCounter).padStart(3, '0')}`;

      newLoads.push({
        id: newId,
        aircraft: ac.tail,
        pilot: ac.pilot,
        altitude: 14000,
        status: 'FILLING',
        scheduled: new Date(Date.now() + newLoads.length * 30 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        countdown: `${(newLoads.length + 1) * 30} min`,
        slots: ac.slots,
        filled: forThisLoad.length,
        weight: forThisLoad.reduce((sum, q) => sum + q.weight, 0),
        maxWeight: ac.slots * 250,
        fuelWeight: Math.round(ac.slots * 50),
        fuelCapacity: Math.round(ac.slots * 60),
        fuelPercent: 80,
        jumpers: forThisLoad.map((q, idx) => ({
          name: q.name.split(' ')[0],
          type: q.type === 'Tandem' ? 'TAN' : q.type.startsWith('AFF') ? 'AFF' : 'FUN',
          role: q.type === 'Tandem' ? 'student' : 'funJumper',
          order: idx + 1,
        })),
        flags: [],
      });
      assignedIds.push(...forThisLoad.map(q => q.id));
    }

    if (newLoads.length > 0) {
      setLoads(prev => [...prev, ...newLoads]);
      setQueue(prev => prev.filter(q => !assignedIds.includes(q.id)));
      showToast(`Auto-created ${newLoads.length} load${newLoads.length > 1 ? 's' : ''} with ${assignedIds.length} jumpers`);
    }
    setAutoLoading(false);
  };

  /** Drag handlers */
  const handleDragStart = (jumper: QueueItem) => {
    setDraggedJumper(jumper);
  };

  const handleDragOver = (e: React.DragEvent, loadId: string) => {
    e.preventDefault();
    setDropTarget(loadId);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, loadId: string) => {
    e.preventDefault();
    setDropTarget(null);
    if (draggedJumper) {
      addJumperToLoad(draggedJumper, loadId);
      setDraggedJumper(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-secondary-500" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading manifest board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Error banner */}
      {loadError && (
        <div className="mx-4 mt-4 px-4 py-3 rounded-lg border flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border-amber-400 dark:border-amber-700">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-700 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">{loadError}</span>
          </div>
          <button onClick={fetchManifestData} className="text-xs font-medium px-3 py-1 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* AIRCRAFT STATUS STRIP */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-40 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="px-4 py-3 flex items-center gap-3 overflow-x-auto">
          {aircraft.map((ac) => {
            const acLoad = loads.find((l) => l.aircraft === ac.tail);
            const isAvailable = ac.status === 'Available';
            const isInFlight = ac.status === 'In-Flight';

            return (
              <div
                key={ac.id}
                className={`flex-shrink-0 px-3 py-2 rounded-lg border transition-all hover:shadow-md cursor-pointer ${
                  isAvailable
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-700 dark:border-emerald-600'
                    : isInFlight
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-800 dark:border-blue-600'
                    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-700 dark:border-amber-600'
                }`}
              >
                <div className={`font-bold text-sm ${
                  isAvailable ? 'text-emerald-700 dark:text-emerald-400'
                  : isInFlight ? 'text-blue-800 dark:text-blue-400'
                  : 'text-amber-700 dark:text-amber-400'
                }`}>
                  {ac.tail}
                </div>
                <div className={`text-xs mt-0.5 opacity-80 ${
                  isAvailable ? 'text-emerald-700 dark:text-emerald-400'
                  : isInFlight ? 'text-blue-800 dark:text-blue-400'
                  : 'text-amber-700 dark:text-amber-400'
                }`}>
                  {ac.type} · {ac.slots} slots
                </div>
                <div className={`text-xs font-semibold mt-1 ${
                  isAvailable ? 'text-emerald-700 dark:text-emerald-400'
                  : isInFlight ? 'text-blue-800 dark:text-blue-400'
                  : 'text-amber-700 dark:text-amber-400'
                }`}>
                  {ac.status}
                  {acLoad && ` • ${acLoad.id}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* HEADER & CONTROLS */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-16 z-30 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="px-4 py-4 max-w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Manifest Board
              </h1>
              <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
                {queue.length} in queue • {loads.length} loads • {loads.filter((l) => l.status === 'AIRBORNE').length} airborne
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowOpsAssistant(true)}
                className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg font-bold text-xs sm:text-sm flex items-center gap-2 transition-opacity hover:opacity-90 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                title="Ops Assistant (streaming)"
              >
                <Sparkles size={16} />
                <span className="hidden sm:inline">Ops Assistant</span>
                <span className="sm:hidden">Ops</span>
              </button>
              <button
                onClick={handleAutoLoad}
                disabled={autoLoading}
                className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg font-bold text-xs sm:text-sm flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50 bg-slate-50 dark:bg-slate-700 text-primary-500 dark:text-primary-400 border border-gray-200 dark:border-slate-600"
              >
                <Wand2 size={16} />
                {autoLoading ? 'Building...' : 'Auto-Build'}
              </button>
              <button
                onClick={() => setShowNewLoad(true)}
                className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg font-bold text-xs sm:text-sm flex items-center gap-2 text-white hover:opacity-90 transition-opacity bg-primary-500 dark:bg-primary-600"
              >
                <Plus size={16} />
                New Load
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {['All', 'Active', 'Ready', 'Airborne', 'Complete'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
                  filter === f
                    ? 'bg-primary-500 dark:bg-primary-600 text-white border-none'
                    : 'bg-slate-50 dark:bg-slate-700 text-gray-900 dark:text-gray-200 border border-gray-200 dark:border-slate-600'
                }`}
              >
                {f}
              </button>
            ))}

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border w-full sm:w-auto sm:ml-auto border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700">
              <Search size={16} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search load ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent outline-none text-sm w-full sm:w-40 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
          </div>
        </div>
      </div>

      <OpsAssistantModal
        open={showOpsAssistant}
        onClose={() => setShowOpsAssistant(false)}
        defaultContext={{ currentRoute: '/dashboard/manifest', currentPage: 'Manifest Board' }}
      />

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* LOAD CARDS GRID */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div className="p-4 max-w-full">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl">
            <AlertCircle size={48} className="text-gray-400 dark:text-gray-500 mx-auto" />
            <p className="mt-4 font-semibold text-gray-500 dark:text-gray-400">
              No loads found
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((load) => {
              const fillPct = (load.filled / load.slots) * 100;
              const weightPct = (load.weight / load.maxWeight) * 100;
              const openSlots = load.slots - load.filled;

              return (
                <div
                  key={load.id}
                  className={`rounded-xl border overflow-hidden shadow-sm hover:shadow-lg transition-all bg-white dark:bg-slate-800 ${
                    dropTarget === load.id
                      ? 'ring-2 ring-blue-500 ring-offset-2 border-sky-500 dark:border-sky-400'
                      : 'border-gray-200 dark:border-slate-700'
                  }`}
                  onDragOver={(e) => ['OPEN', 'FILLING'].includes(load.status) ? handleDragOver(e, load.id) : undefined}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => ['OPEN', 'FILLING'].includes(load.status) ? handleDrop(e, load.id) : undefined}
                >
                  {/* Status Bar */}
                  <div className={`h-1.5 ${getStatusBarColor(load.status)}`} />

                  {/* Header */}
                  <div className="p-3 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div>
                        <div className="font-bold text-lg text-gray-900 dark:text-white">
                          {load.id}
                        </div>
                        <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                          {load.aircraft} • {formatAltitude(load.altitude)} • {load.pilot}
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full font-bold text-xs whitespace-nowrap ${getStatusBadge(load.status)}`}>
                        {load.status}
                      </span>
                    </div>

                    {/* Countdown */}
                    {load.countdown && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-500 dark:text-orange-400">
                        <Clock size={14} />
                        {load.countdown}
                      </div>
                    )}

                    <div className="text-xs mt-1 text-gray-400 dark:text-gray-500">
                      Scheduled: {load.scheduled}
                    </div>
                  </div>

                  {/* Slots Progress */}
                  <div className="px-3 py-2.5 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-semibold text-xs text-gray-900 dark:text-white">
                        {load.filled}/{load.slots} slots
                      </span>
                      <span className={`text-xs font-bold ${openSlots === 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {openSlots} open
                      </span>
                    </div>
                    <div className="bg-gray-200 dark:bg-slate-600 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getFillBarColor(fillPct)}`}
                        style={{ width: `${Math.min(fillPct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Weight Progress */}
                  <div className="px-3 py-2.5 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatWeight(load.weight)} / {formatWeight(load.maxWeight)}
                      </span>
                      <span className={`text-xs font-bold ${getWeightTextColor(weightPct)}`}>
                        {Math.round(weightPct)}%
                      </span>
                    </div>
                    <div className="bg-gray-200 dark:bg-slate-600 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getWeightBarColor(weightPct)}`}
                        style={{ width: `${Math.min(weightPct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Fuel Level */}
                  {load.fuelCapacity > 0 && (
                    <div className="px-3 py-2.5 border-b border-gray-200 dark:border-slate-700">
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-1">
                          <Fuel
                            size={13}
                            className={
                              (load.fuelPercent ?? 100) <= 25
                                ? 'text-amber-500 animate-pulse'
                                : 'text-gray-400 dark:text-gray-500'
                            }
                          />
                          <span className="text-xs text-gray-500 dark:text-gray-400">Fuel</span>
                        </div>
                        <span className={`text-xs font-bold ${getFuelTextColor(load.fuelPercent ?? 100)}`}>
                          {load.fuelPercent ?? '--'}%
                        </span>
                      </div>
                      <div className="bg-gray-200 dark:bg-slate-600 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getFuelBarColor(load.fuelPercent ?? 0)}`}
                          style={{ width: `${Math.min(load.fuelPercent ?? 0, 100)}%` }}
                        />
                      </div>
                      {(load.fuelPercent ?? 100) <= 25 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Fuel size={10} className="text-amber-600 dark:text-amber-500" />
                          <span className="text-xs font-semibold text-amber-600 dark:text-amber-500">Refuel needed</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Flags */}
                  {load.flags.length > 0 && (
                    <div className="px-3 py-2 border-b flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border-amber-400 dark:border-amber-700">
                      <AlertTriangle size={14} className="text-amber-700 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-amber-700 dark:text-amber-400">
                        {load.flags.join(' • ')}
                      </div>
                    </div>
                  )}

                  {/* Jumpers */}
                  <div className="px-3 py-2.5 border-b border-gray-200 dark:border-slate-700 max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-xs font-bold mb-2 text-gray-900 dark:text-white">
                      Manifest ({load.jumpers.length})
                    </div>

                    <div className="space-y-1.5">
                      {load.jumpers.map((j, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: getJumperColor(j.type) }}
                          >
                            {j.name[0]}
                          </div>
                          <span className="text-xs font-medium truncate flex-1 text-gray-900 dark:text-white">
                            {j.name}
                          </span>
                          <span
                            className="text-xs font-semibold px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: getJumperColor(j.type) + '20',
                              color: getJumperColor(j.type),
                            }}
                          >
                            {j.type}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            #{j.order}
                          </span>
                        </div>
                      ))}
                    </div>

                    {openSlots > 0 && (
                      <div className="mt-2.5 pt-2.5 border-t border-gray-200 dark:border-slate-700">
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          {openSlots} slot{openSlots !== 1 ? 's' : ''} available
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="p-2.5 flex gap-2 flex-wrap">
                    {load.status === 'OPEN' && (
                      <>
                        <Link
                          href={`/dashboard/manifest/${load.id}`}
                          className="flex-1 px-3 py-2 rounded-lg font-bold text-xs text-white transition-opacity hover:opacity-90 text-center bg-primary-500 dark:bg-primary-600"
                        >
                          Add Jumper
                        </Link>
                        <button
                          onClick={() => handleStatusTransition(load.id, 'LOCKED')}
                          disabled={transitioning === load.id}
                          className="flex-1 px-3 py-2 rounded-lg font-bold text-xs transition-opacity hover:opacity-90 disabled:opacity-50 bg-slate-50 dark:bg-slate-700 text-primary-500 dark:text-primary-400 border border-gray-200 dark:border-slate-600"
                        >
                          {transitioning === load.id ? '...' : 'Lock'}
                        </button>
                      </>
                    )}

                    {load.status === 'FILLING' && (
                      <>
                        <Link
                          href={`/dashboard/manifest/${load.id}`}
                          className="flex-1 px-3 py-2 rounded-lg font-bold text-xs text-white transition-opacity hover:opacity-90 text-center bg-primary-500 dark:bg-primary-600"
                        >
                          Add
                        </Link>
                        <button
                          onClick={() => handleStatusTransition(load.id, 'LOCKED')}
                          disabled={transitioning === load.id}
                          className="flex-1 px-3 py-2 rounded-lg font-bold text-xs text-white transition-opacity hover:opacity-90 disabled:opacity-50 bg-amber-500 dark:bg-amber-600"
                        >
                          {transitioning === load.id ? '...' : 'Lock'}
                        </button>
                      </>
                    )}

                    {load.status === 'LOCKED' && (
                      <>
                        <button
                          onClick={() => handleStatusTransition(load.id, 'FILLING')}
                          disabled={transitioning === load.id}
                          className="flex-1 px-3 py-2 rounded-lg font-bold text-xs text-white transition-opacity hover:opacity-90 disabled:opacity-50 bg-amber-500 dark:bg-amber-600"
                        >
                          {transitioning === load.id ? '...' : 'Unlock'}
                        </button>
                        <button
                          onClick={() => handleStatusTransition(load.id, 'BOARDING')}
                          disabled={transitioning === load.id}
                          className="flex-1 px-3 py-2 rounded-lg font-bold text-xs text-white transition-opacity hover:opacity-90 disabled:opacity-50 bg-red-500 dark:bg-red-600"
                        >
                          {transitioning === load.id ? '...' : 'Board'}
                        </button>
                      </>
                    )}

                    {load.status === 'BOARDING' && (
                      <button
                        onClick={() => handleStatusTransition(load.id, 'AIRBORNE')}
                        disabled={transitioning === load.id}
                        className="w-full px-3 py-2 rounded-lg font-bold text-xs text-white transition-opacity hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 bg-emerald-500 dark:bg-emerald-600"
                      >
                        <Plane size={14} />
                        {transitioning === load.id ? 'Dispatching...' : 'Dispatch'}
                      </button>
                    )}

                    {load.status === 'AIRBORNE' && (
                      <button
                        onClick={() => handleStatusTransition(load.id, 'LANDED')}
                        disabled={transitioning === load.id}
                        className="w-full px-3 py-2 rounded-lg font-bold text-xs text-white transition-opacity hover:opacity-90 disabled:opacity-50 bg-primary-500 dark:bg-primary-600"
                      >
                        {transitioning === load.id ? 'Landing...' : 'Landed'}
                      </button>
                    )}

                    {load.status === 'LANDED' && (
                      <button
                        onClick={() => handleStatusTransition(load.id, 'COMPLETE')}
                        disabled={transitioning === load.id}
                        className="w-full px-3 py-2 rounded-lg font-bold text-xs text-white transition-opacity hover:opacity-90 disabled:opacity-50 bg-emerald-500 dark:bg-emerald-600"
                      >
                        {transitioning === load.id ? 'Completing...' : 'Complete'}
                      </button>
                    )}

                    {load.status === 'COMPLETE' && (
                      <Link
                        href={`/dashboard/manifest/${load.id}`}
                        className="w-full px-3 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-opacity hover:opacity-90 bg-slate-50 dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 border border-gray-200 dark:border-slate-600"
                      >
                        <CheckCircle size={14} />
                        View Summary
                      </Link>
                    )}

                    {/* Pilot Sign-Off */}
                    {['LOCKED', 'BOARDING'].includes(load.status) && (
                      <button
                        onClick={() => {
                          setSignOffLoad(signOffLoad === load.id ? null : load.id);
                          if (signOffLoad !== load.id) showToast(`Pilot ${load.pilot} signed off on ${load.id}`);
                        }}
                        className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          signOffLoad === load.id
                            ? 'ring-1 ring-green-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500 dark:border-emerald-600'
                            : 'bg-slate-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-600'
                        }`}
                      >
                        <PenTool size={12} />
                        {signOffLoad === load.id ? '✓ Pilot Signed' : 'Pilot Sign-Off'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* QUEUE SECTION */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div className="px-4 pb-6 max-w-full">
        <div className="rounded-xl border overflow-hidden bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          {/* Queue Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 font-bold flex items-center justify-between text-gray-900 dark:text-white">
            <div className="flex items-center gap-2">
              <Users size={18} />
              Waiting Queue — {queue.length} jumpers
            </div>
            {queueWithFlags.length > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                {queueWithFlags.length} flags
              </span>
            )}
          </div>

          {/* Queue Tabs */}
          <div className="border-b border-gray-200 dark:border-slate-700 flex">
            <button
              onClick={() => setQueueTab('ready')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                queueTab === 'ready'
                  ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-gray-300 dark:border-slate-600 text-gray-500 dark:text-gray-400 bg-transparent'
              }`}
            >
              Ready ({queueReady.length})
            </button>
            <button
              onClick={() => setQueueTab('flagged')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ml-2 ${
                queueTab === 'flagged'
                  ? 'border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                  : 'border-gray-300 dark:border-slate-600 text-gray-500 dark:text-gray-400 bg-transparent'
              }`}
            >
              Flagged ({queueWithFlags.length})
            </button>
          </div>

          {/* Ready Queue */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                <tr>
                  {['Name', 'Type', 'License', 'Weight', 'Waiver', 'Paid', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {queueReady.map((q, idx) => (
                  <tr
                    key={q.id}
                    draggable
                    onDragStart={() => handleDragStart(q)}
                    onDragEnd={() => { setDraggedJumper(null); setDropTarget(null); }}
                    className={`cursor-grab active:cursor-grabbing border-b border-gray-200 dark:border-slate-700 ${
                      draggedJumper?.id === q.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 opacity-50'
                        : idx % 2 === 0
                        ? 'bg-white dark:bg-slate-800'
                        : 'bg-slate-50 dark:bg-slate-800/50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <GripVertical size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {q.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {q.type}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {q.license}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {q.weight} lb
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        q.waiver
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                        {q.waiver ? '✓' : '✗'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${
                        q.paid ? 'bg-emerald-500' : 'bg-red-500'
                      }`}>
                        {q.paid ? '✓' : '✗'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          const openLoad = loads.find(l => ['OPEN', 'FILLING'].includes(l.status) && l.filled < l.slots);
                          if (openLoad) {
                            addJumperToLoad(q, openLoad.id);
                          } else {
                            showToast('No open loads — create a new load first');
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90 bg-primary-500 dark:bg-primary-600"
                      >
                        + Load
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Flagged Queue */}
          {queueWithFlags.length > 0 && (
            <div className="border-t border-gray-200 dark:border-slate-700 mt-4">
              <div className="px-4 py-3 font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20">
                ⚠ Requires Review
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {queueWithFlags.map((q, idx) => (
                      <tr
                        key={q.id}
                        className={`border-b border-gray-200 dark:border-slate-700 ${
                          idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800/50'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {q.name}
                          </div>
                          <div className="text-xs mt-1 space-y-0.5">
                            {q.flags.map((flag, fidx) => (
                              <div key={fidx} className="text-amber-700 dark:text-amber-400">
                                {flag}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                          {q.type}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                          {q.license}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                          {q.weight} lb
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setReviewJumper(q)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-400 dark:border-amber-700"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* REVIEW MODAL */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {reviewJumper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setReviewJumper(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">Review: {reviewJumper.name}</h3>
                <p className="text-xs mt-0.5 text-gray-500 dark:text-gray-400">{reviewJumper.type} · {reviewJumper.license} · {reviewJumper.weight} lb</p>
              </div>
              <button onClick={() => setReviewJumper(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X size={16} className="text-gray-500 dark:text-gray-400" /></button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="text-xs font-bold uppercase text-amber-700 dark:text-amber-400">Issues to Resolve</div>
              {reviewJumper.flags.map((flag, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-700 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">{flag}</span>
                  </div>
                  {flag.toLowerCase().includes('waiver') && (
                    <button onClick={() => handleResolveFlag(reviewJumper, 'waiver')} className="px-2.5 py-1 text-xs font-bold rounded-md text-white bg-emerald-500 hover:bg-emerald-600 transition-colors">
                      <FileSignature size={12} className="inline mr-1" />Mark Signed
                    </button>
                  )}
                  {flag.toLowerCase().includes('unpaid') && (
                    <button onClick={() => handleResolveFlag(reviewJumper, 'paid')} className="px-2.5 py-1 text-xs font-bold rounded-md text-white bg-emerald-500 hover:bg-emerald-600 transition-colors">
                      <CreditCard size={12} className="inline mr-1" />Mark Paid
                    </button>
                  )}
                  {flag.toLowerCase().includes('weight') && (
                    <button onClick={() => handleResolveFlag(reviewJumper, 'override')} className="px-2.5 py-1 text-xs font-bold rounded-md text-white bg-amber-500 hover:bg-amber-600 transition-colors">
                      <Shield size={12} className="inline mr-1" />Override
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-gray-200 dark:border-slate-700 flex gap-2">
              <button onClick={() => handleResolveFlag(reviewJumper, 'override')} className="flex-1 px-3 py-2 rounded-lg text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors">
                Approve All & Add to Queue
              </button>
              <button onClick={() => setReviewJumper(null)} className="px-3 py-2 rounded-lg text-xs font-bold bg-slate-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-600">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* NEW LOAD MODAL */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {showNewLoad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowNewLoad(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">Create New Load</h3>
              <button onClick={() => setShowNewLoad(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X size={16} className="text-gray-500 dark:text-gray-400" /></button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-gray-900 dark:text-white">Aircraft</label>
                <select
                  value={newLoadForm.aircraftId}
                  onChange={e => setNewLoadForm(prev => ({ ...prev, aircraftId: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700"
                >
                  <option value="">Select aircraft...</option>
                  {aircraft.map(ac => (
                    <option key={ac.id} value={ac.id} disabled={ac.status !== 'Available'}>
                      {ac.tail} — {ac.type} ({ac.slots} slots) {ac.status !== 'Available' ? `[${ac.status}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 text-gray-900 dark:text-white">Pilot</label>
                <select
                  value={newLoadForm.pilotId}
                  onChange={e => setNewLoadForm(prev => ({ ...prev, pilotId: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700"
                >
                  <option value="">Auto-assign pilot</option>
                  {[...new Map(aircraft.filter(ac => ac.pilot).map(ac => [ac.pilot, ac])).values()].map(ac => (
                    <option key={ac.id} value={ac.pilot}>{ac.pilot}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-gray-900 dark:text-white">Altitude (ft)</label>
                  <select
                    value={newLoadForm.altitude}
                    onChange={e => setNewLoadForm(prev => ({ ...prev, altitude: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700"
                  >
                    <option value={14000}>14,000 ft</option>
                    <option value={13000}>13,000 ft</option>
                    <option value={10000}>10,000 ft</option>
                    <option value={7500}>7,500 ft (Hop & Pop)</option>
                    <option value={5000}>5,000 ft</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-gray-900 dark:text-white">Scheduled Time</label>
                  <input
                    type="time"
                    value={newLoadForm.scheduled}
                    onChange={e => setNewLoadForm(prev => ({ ...prev, scheduled: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-gray-200 dark:border-slate-700 flex gap-2">
              <button
                onClick={handleCreateLoad}
                disabled={creatingLoad}
                className="flex-1 px-4 py-2.5 rounded-lg font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50 bg-primary-500 dark:bg-primary-600 hover:opacity-90 transition-opacity"
              >
                {creatingLoad ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : <><Plus size={14} /> Create Load</>}
              </button>
              <button onClick={() => setShowNewLoad(false)} className="px-4 py-2.5 rounded-lg font-bold text-sm bg-slate-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-600">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TOAST */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-semibold text-white flex items-center gap-2 bg-primary-500">
          <CheckCircle size={16} />
          {toast}
        </div>
      )}

      {/* Drag hint */}
      {draggedJumper && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-xs font-bold text-white bg-sky-500">
          Drop {draggedJumper.name} on an Open or Filling load
        </div>
      )}
    </div>
  );
}
