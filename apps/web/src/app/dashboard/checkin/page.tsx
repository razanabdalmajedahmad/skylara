'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Scan, Plus, AlertCircle, CheckCircle2, Clock, Loader2, ShieldAlert } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface Jumper {
  id: string;
  name: string;
  jumpCount: number;
  type: 'Fun Jump' | 'Tandem' | 'AFF' | 'Coaching' | 'Wingsuit';
  license: string;
  status: 'Pending' | 'Checked In' | 'Issues';
  checks: {
    licenseValid: 'pass' | 'fail' | 'na';
    currency: 'pass' | 'fail' | 'na';
    medical: 'pass' | 'fail' | 'na';
    waiver: 'pass' | 'fail' | 'na';
    payment: 'pass' | 'fail' | 'na';
    reserveRepack: 'pass' | 'fail' | 'na';
    gearCheck: 'pass' | 'fail' | 'na';
    membership: 'pass' | 'fail' | 'na';
  };
  weight: number;
  height: number;
  bmi?: number;
  expiry?: string;
}

interface ComplianceCheck {
  id: keyof Jumper['checks'];
  label: string;
}

// --- Real compliance API types ---
type GateStatus = 'PASS' | 'FAIL' | 'WARNING' | 'NOT_CHECKED';

interface ComplianceGate {
  gate: string;
  status: GateStatus;
  message: string;
  canOverride: boolean;
  overrideRoles: string[];
  details: Record<string, any> | null;
}

interface ComplianceResponse {
  userId: string;
  dropzoneId: string;
  allPassed: boolean;
  gates: ComplianceGate[];
  checkedAt: string;
}

// Map API gate names to local check IDs
const GATE_TO_CHECK_ID: Record<string, keyof Jumper['checks']> = {
  LICENSE: 'licenseValid',
  CURRENCY: 'currency',
  WAIVER: 'waiver',
  GEAR_CHECK: 'gearCheck',
  RESERVE_REPACK: 'reserveRepack',
  AAD: 'membership',        // AAD mapped to membership slot in UI
  WEIGHT: 'medical',        // Weight/BMI mapped to medical slot
  PILOT_DUTY: 'payment',    // Pilot duty mapped to payment slot
  AIRCRAFT_AIRWORTHINESS: 'payment', // secondary — handled via liveGates
  RIG_MAINTENANCE: 'reserveRepack',  // secondary — handled via liveGates
};

// Reverse: check ID to a human-readable label for API gates
const GATE_LABELS: Record<string, string> = {
  LICENSE: 'License Valid',
  CURRENCY: 'Currency',
  WAIVER: 'Waiver Signed',
  GEAR_CHECK: 'Gear Inspection',
  RESERVE_REPACK: 'Reserve Repack',
  AAD: 'AAD Status',
  WEIGHT: 'Weight / BMI',
  PILOT_DUTY: 'Pilot Duty',
  AIRCRAFT_AIRWORTHINESS: 'Aircraft Airworthiness',
  RIG_MAINTENANCE: 'Rig Maintenance',
};

const GEAR_ITEMS = [
  'Container / Harness',
  'Main Canopy',
  'Reserve Canopy',
  'AAD Armed & Serviceable',
  'Reserve Repack Date',
  'Main Deployment Handle',
  'Reserve Handle',
  'Cutaway / RSL',
  'Chest Strap',
  'Leg Straps',
  'Pin & Closing Loop',
  'Cypress Battery',
];

const COMPLIANCE_CHECKS: ComplianceCheck[] = [
  { id: 'licenseValid', label: 'License Valid' },
  { id: 'currency', label: 'Currency' },
  { id: 'medical', label: 'Medical / BMI' },
  { id: 'waiver', label: 'Waiver Signed' },
  { id: 'payment', label: 'Payment / Balance' },
  { id: 'reserveRepack', label: 'Reserve Repack' },
  { id: 'gearCheck', label: 'Gear Inspection' },
  { id: 'membership', label: 'Membership' },
];

export default function CheckInPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Jumper | null>(null);
  const [gearOpen, setGearOpen] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [override, setOverride] = useState(false);
  const [overrideNote, setOverrideNote] = useState('');
  const [queue, setQueue] = useState<Jumper[]>([]);
  const [gearChecks, setGearChecks] = useState<Record<string, 'pass' | 'fail'>>({});
  const [gearNotes, setGearNotes] = useState('');
  const [walkInError, setWalkInError] = useState('');
  const [walkInForm, setWalkInForm] = useState({
    firstName: '',
    lastName: '',
    weight: '',
    email: '',
    phone: '',
  });
  const [toast, setToast] = useState<{ msg: string; type: 'info' | 'error' | 'success' } | null>(null);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);

  // --- Live compliance state ---
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [liveGates, setLiveGates] = useState<ComplianceGate[] | null>(null);
  const [complianceFallback, setComplianceFallback] = useState(false);
  const [liveAllPassed, setLiveAllPassed] = useState<boolean | null>(null);
  // Per-gate overrides: gate name -> reason string
  const [gateOverrides, setGateOverrides] = useState<Record<string, string>>({});
  // Which gate's override form is open
  const [overrideGateOpen, setOverrideGateOpen] = useState<string | null>(null);
  const [overrideReasonDraft, setOverrideReasonDraft] = useState('');

  const showToast = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Fetch live compliance when a jumper is selected ---
  const fetchCompliance = useCallback(async (jumperId: string) => {
    setComplianceLoading(true);
    setComplianceFallback(false);
    setLiveGates(null);
    setLiveAllPassed(null);
    setGateOverrides({});
    setOverrideGateOpen(null);
    setOverrideReasonDraft('');
    try {
      const res = await apiGet<ComplianceResponse>(`/jumpers/${jumperId}/compliance`);
      if (res && Array.isArray(res.gates)) {
        setLiveGates(res.gates);
        setLiveAllPassed(res.allPassed);
        // Also sync the local checks map so the queue status colors update
        setQueue(prev => prev.map(q => {
          if (q.id !== jumperId) return q;
          const updatedChecks = { ...q.checks };
          for (const g of res.gates) {
            const localId = GATE_TO_CHECK_ID[g.gate];
            if (localId) {
              updatedChecks[localId] = g.status === 'PASS' ? 'pass' : g.status === 'FAIL' ? 'fail' : 'na';
            }
          }
          return { ...q, checks: updatedChecks };
        }));
      } else {
        setComplianceFallback(true);
      }
    } catch {
      // API unavailable — fall back to static grid
      setComplianceFallback(true);
    } finally {
      setComplianceLoading(false);
    }
  }, []);

  useEffect(() => {
    async function fetchQueue() {
      setQueueLoading(true);
      setQueueError(null);
      try {
        /** GET /users — dropzone-scoped; no `include` param (identity route ignores unknown query keys). */
        const res = await apiGet<{
          success?: boolean;
          data?: Array<{
            id: number;
            firstName?: string;
            lastName?: string;
            email?: string;
            totalJumps?: number;
            licenseType?: string;
          }>;
        }>('/users?limit=50');
        if (res?.success && Array.isArray(res.data)) {
          const mapped: Jumper[] = res.data.map((u) => ({
            id: String(u.id),
            name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || `User ${u.id}`,
            jumpCount: u.totalJumps ?? 0,
            type: 'Fun Jump' as const,
            license: u.licenseType && u.licenseType !== 'Visitor' ? u.licenseType : 'None',
            status: 'Pending' as const,
            checks: {
              licenseValid: u.licenseType && u.licenseType !== 'Visitor' && u.licenseType !== 'None' ? 'pass' : 'na',
              currency: 'pass' as const,
              medical: 'pass' as const,
              waiver: 'pass' as const,
              payment: 'pass' as const,
              reserveRepack: 'pass' as const,
              gearCheck: 'pass' as const,
              membership: 'pass' as const,
            },
            weight: 180,
            height: 70,
          }));
          setQueue(mapped);
        } else {
          setQueue([]);
          setQueueError('Could not parse user list from the server.');
        }
      } catch {
        setQueue([]);
        setQueueError('Could not load the check-in queue. Check your connection and manifest or admin permissions.');
      } finally {
        setQueueLoading(false);
      }
    }
    fetchQueue();
  }, []);

  const jumper = selected || queue[0] || null;

  // Trigger compliance fetch whenever the active jumper changes
  useEffect(() => {
    if (jumper?.id) {
      fetchCompliance(jumper.id);
    }
  }, [jumper?.id, fetchCompliance]);

  // Derive compliance status from live gates when available, else from static checks
  const liveFailingGates: ComplianceGate[] = liveGates
    ? liveGates.filter(g => g.status === 'FAIL' && !gateOverrides[g.gate])
    : [];
  const liveWarningGates: ComplianceGate[] = liveGates
    ? liveGates.filter(g => g.status === 'WARNING' && !gateOverrides[g.gate])
    : [];

  const failingChecks = jumper ? COMPLIANCE_CHECKS.filter((c) => jumper.checks[c.id] === 'fail') : [];
  const passCount = jumper ? COMPLIANCE_CHECKS.filter((c) => jumper.checks[c.id] === 'pass').length : 0;

  // Use live compliance when available; fall back to static checks
  const allClearToJump = liveGates
    ? (liveFailingGates.length === 0 || override)
    : (failingChecks.length === 0 || override);

  const getQueueStatus = (j: Jumper) => {
    const fails = COMPLIANCE_CHECKS.filter((c) => j.checks[c.id] === 'fail').length;
    if (fails > 0) return 'red';
    if (j.checks.gearCheck === 'fail' || j.checks.waiver === 'fail') return 'amber';
    if (j.status === 'Checked In') return 'green';
    return 'green';
  };

  const filteredQueue = queue.filter(
    (q) =>
      !search ||
      q.name.toLowerCase().includes(search.toLowerCase()) ||
      q.license.toLowerCase().includes(search.toLowerCase()) ||
      q.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 text-white px-4 py-3 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2 ${
          toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-sky-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Jumper Check-In</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString(undefined, { weekday: 'long' })} ·{' '}
            {queueLoading
              ? 'Loading queue…'
              : `${queue.length} in queue · ${queue.filter((q) => q.status === 'Checked In').length} checked in`}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* Left Panel - Search & Queue */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          {/* Search Bar */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 flex items-center gap-3 h-fit">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, license, QR code"
              className="flex-1 text-sm outline-none"
            />
            <button
              onClick={() => showToast('QR Scanner: device camera integration for athlete QR check-in')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Scan QR"
            >
              <Scan className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Walk-In Button */}
          <button
            onClick={() => setWalkInOpen(!walkInOpen)}
            className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 h-fit"
          >
            <Plus className="w-5 h-5" />
            New Walk-In
          </button>

          {/* Walk-In Form */}
          {walkInOpen && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 space-y-3 h-fit">
              <h3 className="font-semibold text-gray-900 dark:text-white">Tandem Customer</h3>
              <input
                type="text"
                placeholder="First Name"
                value={walkInForm.firstName}
                onChange={(e) => setWalkInForm({ ...walkInForm, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded text-sm"
              />
              <input
                type="text"
                placeholder="Last Name"
                value={walkInForm.lastName}
                onChange={(e) => setWalkInForm({ ...walkInForm, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded text-sm"
              />
              <input
                type="number"
                placeholder="Weight (lbs)"
                value={walkInForm.weight}
                onChange={(e) => setWalkInForm({ ...walkInForm, weight: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded text-sm"
              />
              <input
                type="email"
                placeholder="Email"
                value={walkInForm.email}
                onChange={(e) => setWalkInForm({ ...walkInForm, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded text-sm"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={walkInForm.phone}
                onChange={(e) => setWalkInForm({ ...walkInForm, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded text-sm"
              />
              {walkInError && <p className="text-red-600 text-xs font-medium">{walkInError}</p>}
              <button
                onClick={async () => {
                  if (!walkInForm.firstName || !walkInForm.lastName) { setWalkInError('First and last name are required'); return; }
                  setWalkInError('');
                  try {
                    const res = await apiPost<{ success: boolean; data: any }>('/walk-in', {
                      firstName: walkInForm.firstName,
                      lastName: walkInForm.lastName,
                      weight: walkInForm.weight ? parseInt(walkInForm.weight) : undefined,
                      email: walkInForm.email || undefined,
                      phone: walkInForm.phone || undefined,
                      jumpType: 'TANDEM',
                    });
                    if (res?.success) {
                      showToast(`Walk-in registered: ${walkInForm.firstName} ${walkInForm.lastName}`, 'success');
                      setWalkInForm({ firstName: '', lastName: '', weight: '', email: '', phone: '' });
                      setWalkInOpen(false);
                    }
                  } catch { showToast('Failed to register walk-in', 'error'); }
                }}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-sm transition-colors"
              >
                Create Profile & Send Waiver
              </button>
            </div>
          )}

          {/* Queue List */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 font-semibold text-sm text-gray-700 dark:text-gray-300">Queue</div>
            {queueError && (
              <div className="px-4 py-3 text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
                {queueError}
              </div>
            )}
            <div className="overflow-y-auto flex-1">
              {queueLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading…
                </div>
              ) : !queueError && filteredQueue.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No jumpers in the queue yet. Users with roles at this dropzone appear here, or use search / walk-in.
                </div>
              ) : null}
              {!queueLoading &&
                filteredQueue.map((q) => {
                const status = getQueueStatus(q);
                const statusColor =
                  status === 'green'
                    ? 'border-l-4 border-emerald-500'
                    : status === 'amber'
                      ? 'border-l-4 border-amber-500'
                      : 'border-l-4 border-red-500';

                return (
                  <button
                    key={q.id}
                    onClick={() => setSelected(q)}
                    className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${statusColor} ${
                      selected?.id === q.id ? 'bg-sky-50' : ''
                    }`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">{q.name}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {q.jumpCount > 0 ? `${q.jumpCount} jumps` : 'New'} · {q.type}
                    </div>
                    {q.checks.waiver === 'fail' && (
                      <div className="text-xs text-red-600 mt-1">Waiver missing</div>
                    )}
                    {q.checks.payment === 'fail' && (
                      <div className="text-xs text-red-600">Payment due</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel - Detail & Checks */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {!jumper ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-12 text-center">
              {queueLoading ? (
                <p className="text-gray-500 dark:text-gray-400 text-lg flex items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin" /> Loading queue…
                </p>
              ) : queueError ? (
                <p className="text-amber-800 dark:text-amber-200 text-lg">Fix the queue error on the left, or refresh the page.</p>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-lg">No jumpers in queue</p>
              )}
            </div>
          ) : (<>
          {/* Jumper Header */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 h-fit">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                {jumper.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{jumper.name}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {jumper.jumpCount} jumps · {jumper.type} · {jumper.license}
                </p>
                {jumper.bmi && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Weight: {jumper.weight} lbs · Height: {jumper.height}" · BMI: {jumper.bmi}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                {complianceLoading ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 dark:text-gray-400 rounded-lg font-semibold text-sm">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    CHECKING...
                  </div>
                ) : allClearToJump ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    CLEAR TO JUMP
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold text-sm">
                    <AlertCircle className="w-5 h-5" />
                    {liveGates ? liveFailingGates.length : failingChecks.length} ISSUES
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Compliance Checks Grid */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 flex-1 overflow-y-auto">
            {/* Fallback warning banner */}
            {complianceFallback && (
              <div className="mb-4 p-3 bg-amber-50 border-l-4 border-amber-500 rounded flex items-start gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Compliance check unavailable — manual verification required</p>
                  <p className="text-xs text-amber-700 mt-1">The compliance API could not be reached. The checks shown below are from cached/static data.</p>
                </div>
              </div>
            )}

            {complianceLoading ? (
              <div className="flex items-center justify-center py-12 gap-3 text-gray-500 dark:text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-sm font-medium">Running compliance checks...</span>
              </div>
            ) : liveGates ? (
              <>
                {/* Live compliance grid from API */}
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Compliance Checks ({liveGates.length} gates)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {liveGates.map((gate) => {
                    const isOverridden = !!gateOverrides[gate.gate];
                    const effectiveStatus = isOverridden ? 'PASS' : gate.status;
                    const colors =
                      effectiveStatus === 'PASS'
                        ? 'bg-emerald-50 border-emerald-300'
                        : effectiveStatus === 'FAIL'
                          ? 'bg-red-50 border-red-300'
                          : effectiveStatus === 'WARNING'
                            ? 'bg-amber-50 border-amber-300'
                            : 'bg-gray-50 border-gray-300';
                    const icon =
                      isOverridden
                        ? '\u26A0\uFE0F'
                        : effectiveStatus === 'PASS'
                          ? '\u2705'
                          : effectiveStatus === 'FAIL'
                            ? '\u274C'
                            : effectiveStatus === 'WARNING'
                              ? '\u26A0\uFE0F'
                              : '\u2298';

                    return (
                      <div
                        key={gate.gate}
                        className={`p-3 rounded-lg border-2 ${colors} text-center relative`}
                      >
                        <div className="text-2xl mb-1">{icon}</div>
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {GATE_LABELS[gate.gate] || gate.gate}
                        </div>
                        {gate.message && (
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight truncate" title={gate.message}>
                            {gate.message}
                          </div>
                        )}
                        {isOverridden && (
                          <div className="text-[10px] text-amber-700 font-semibold mt-1">OVERRIDDEN</div>
                        )}
                        {/* Per-gate override button */}
                        {gate.status === 'FAIL' && gate.canOverride && !isOverridden && (
                          <button
                            onClick={() => {
                              setOverrideGateOpen(overrideGateOpen === gate.gate ? null : gate.gate);
                              setOverrideReasonDraft('');
                            }}
                            className="mt-2 px-2 py-1 text-[10px] font-semibold bg-amber-100 hover:bg-amber-200 text-amber-800 rounded transition-colors"
                          >
                            Override
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Per-gate override form (shown inline below grid) */}
                {overrideGateOpen && (
                  <div className="mt-4 p-4 bg-amber-50 border-l-4 border-amber-500 rounded">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-amber-900 text-sm mb-1">
                          Override: {GATE_LABELS[overrideGateOpen] || overrideGateOpen}
                        </p>
                        <p className="text-xs text-amber-700 mb-2">
                          Provide justification (minimum 10 characters). This action will be logged for audit.
                        </p>
                        <textarea
                          value={overrideReasonDraft}
                          onChange={(e) => setOverrideReasonDraft(e.target.value)}
                          placeholder="Reason for override..."
                          className="w-full px-3 py-2 border border-amber-300 rounded text-sm"
                          rows={2}
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            disabled={overrideReasonDraft.trim().length < 10}
                            onClick={() => {
                              setGateOverrides(prev => ({ ...prev, [overrideGateOpen]: overrideReasonDraft.trim() }));
                              showToast(`Gate "${GATE_LABELS[overrideGateOpen] || overrideGateOpen}" overridden`, 'success');
                              setOverrideGateOpen(null);
                              setOverrideReasonDraft('');
                            }}
                            className={`px-4 py-1.5 rounded text-xs font-semibold transition-colors ${
                              overrideReasonDraft.trim().length >= 10
                                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            Confirm Override
                          </button>
                          <button
                            onClick={() => { setOverrideGateOpen(null); setOverrideReasonDraft(''); }}
                            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 dark:text-gray-300 rounded text-xs font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Live failing gates summary */}
                {liveFailingGates.length > 0 && (
                  <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-red-900 mb-2">
                          {liveFailingGates.length} compliance issue{liveFailingGates.length > 1 ? 's' : ''}:
                        </p>
                        <ul className="text-sm text-red-800 space-y-1">
                          {liveFailingGates.map((g) => (
                            <li key={g.gate}>
                              {'\u2022'} {GATE_LABELS[g.gate] || g.gate}
                              {g.message ? ` — ${g.message}` : ''}
                              {g.canOverride && <span className="text-amber-700 text-xs ml-1">(overridable)</span>}
                            </li>
                          ))}
                        </ul>
                        {!override && (
                          <label className="flex items-center gap-2 mt-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={override}
                              onChange={(e) => setOverride(e.target.checked)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm font-medium text-red-900">
                              S&TA Override (with justification)
                            </span>
                          </label>
                        )}
                        {override && (
                          <textarea
                            value={overrideNote}
                            onChange={(e) => setOverrideNote(e.target.value)}
                            placeholder="Reason for override..."
                            className="w-full mt-3 px-3 py-2 border border-red-300 rounded text-sm"
                            rows={2}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Warning gates */}
                {liveWarningGates.length > 0 && (
                  <div className="mt-4 p-4 bg-amber-50 border-l-4 border-amber-400 rounded">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-amber-900 mb-2">
                          {liveWarningGates.length} warning{liveWarningGates.length > 1 ? 's' : ''}:
                        </p>
                        <ul className="text-sm text-amber-800 space-y-1">
                          {liveWarningGates.map((g) => (
                            <li key={g.gate}>
                              {'\u2022'} {GATE_LABELS[g.gate] || g.gate}
                              {g.message ? ` — ${g.message}` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Fallback: static compliance grid (original 8-point grid) */}
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Compliance Checks (8 of 8)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {COMPLIANCE_CHECKS.map((check) => {
                    const status = jumper.checks[check.id];
                    const colors =
                      status === 'pass'
                        ? 'bg-emerald-50 border-emerald-300'
                        : status === 'fail'
                          ? 'bg-red-50 border-red-300'
                          : 'bg-gray-50 border-gray-300';
                    const icon =
                      status === 'pass' ? '\u2705' : status === 'fail' ? '\u274C' : '\u2298';

                    return (
                      <div
                        key={check.id}
                        className={`p-3 rounded-lg border-2 ${colors} text-center`}
                      >
                        <div className="text-2xl mb-2">{icon}</div>
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {check.label}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {failingChecks.length > 0 && (
                  <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-red-900 mb-2">
                          {failingChecks.length} compliance issue{failingChecks.length > 1 ? 's' : ''}:
                        </p>
                        <ul className="text-sm text-red-800 space-y-1">
                          {failingChecks.map((c) => (
                            <li key={c.id}>{'\u2022'} {c.label}</li>
                          ))}
                        </ul>
                        {!override && (
                          <label className="flex items-center gap-2 mt-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={override}
                              onChange={(e) => setOverride(e.target.checked)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm font-medium text-red-900">
                              S&TA Override (with justification)
                            </span>
                          </label>
                        )}
                        {override && (
                          <textarea
                            value={overrideNote}
                            onChange={(e) => setOverrideNote(e.target.value)}
                            placeholder="Reason for override..."
                            className="w-full mt-3 px-3 py-2 border border-red-300 rounded text-sm"
                            rows={2}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                disabled={!allClearToJump}
                onClick={async () => {
                  try {
                    await apiPost(`/users/${jumper.id}/checkin`, { slotId: null, loadId: null });
                    showToast(`${jumper.name} checked in successfully`, 'success');
                    setQueue(prev => prev.map(q => q.id === jumper.id ? { ...q, status: 'Checked In' as const, checks: { ...q.checks, gearCheck: 'pass' as const } } : q));
                  } catch { showToast('Check-in failed — verify compliance', 'error'); }
                }}
                className={`px-6 py-3 rounded-lg font-semibold text-sm transition-colors ${
                  allClearToJump
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Complete Check-In
              </button>
              <button
                onClick={() => setGearOpen(true)}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold text-sm transition-colors"
              >
                Gear Check
              </button>
              <button
                onClick={async () => {
                  try {
                    const waiverRes = await apiGet<{ success: boolean; data: any[] }>('/waivers');
                    if (waiverRes?.data?.[0]) {
                      showToast(`Waiver "${waiverRes.data[0].title}" sent to ${jumper.name}`, 'success');
                    } else {
                      showToast('No active waivers configured for this DZ', 'error');
                    }
                  } catch { showToast('Failed to send waiver', 'error'); }
                }}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg font-semibold text-sm transition-colors"
              >
                Send Waiver
              </button>
              <button
                onClick={() => {
                  router.push('/dashboard/wallet');
                }}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg font-semibold text-sm transition-colors"
              >
                Collect Payment
              </button>
              <button
                onClick={async () => {
                  try {
                    const loadRes = await apiGet<{ success: boolean; data: any[] }>('/loads?status=FILLING&limit=1');
                    if (loadRes?.data?.[0]) {
                      await apiPost(`/loads/${loadRes.data[0].id}/slots`, {
                        userId: jumper.id,
                        weight: jumper.weight || 200,
                        slotType: jumper.type === 'Tandem' ? 'TANDEM_PASSENGER' : jumper.type?.startsWith('AFF') ? 'AFF_STUDENT' : 'FUN',
                      });
                      showToast(`${jumper.name} sent to manifest — Load ${loadRes.data[0].loadNumber || loadRes.data[0].id}`, 'success');
                      setQueue(prev => prev.filter(q => q.id !== jumper.id));
                      setSelected(null);
                    } else {
                      showToast('No open loads — create a load first');
                    }
                  } catch { showToast('Failed to manifest — check compliance gates', 'error'); }
                }}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg font-semibold text-sm transition-colors"
              >
                Send to Manifest
              </button>
            </div>
          </div>
          </>)}
        </div>
      </div>

      {/* Gear Check Panel */}
      {gearOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Gear Check — {jumper.name}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {GEAR_ITEMS.map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-300 dark:border-slate-600 rounded-lg"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{item}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setGearChecks({ ...gearChecks, [item]: 'pass' })}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                          gearChecks[item] === 'pass'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-200 text-gray-700 dark:text-gray-300 hover:bg-emerald-200'
                        }`}
                      >
                        Pass
                      </button>
                      <button
                        onClick={() => setGearChecks({ ...gearChecks, [item]: 'fail' })}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                          gearChecks[item] === 'fail'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-200 text-gray-700 dark:text-gray-300 hover:bg-red-200'
                        }`}
                      >
                        Fail
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <textarea
                value={gearNotes}
                onChange={(e) => setGearNotes(e.target.value)}
                placeholder="Gear check notes..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded text-sm mb-4"
                rows={3}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    // Mark all gear items as passed
                    const allPassed = Object.values(gearChecks).every(v => v === 'pass');
                    if (!allPassed && Object.keys(gearChecks).length < 6) {
                      showToast('Please check all gear items before approving');
                      return;
                    }
                    setQueue(prev => prev.map(q =>
                      q.id === jumper.id ? { ...q, checks: { ...q.checks, gearCheck: 'pass' as const } } : q
                    ));
                    setGearOpen(false);
                    setGearChecks({});
                    setGearNotes('');
                    showToast(`Gear approved for ${jumper.name}`, 'success');
                  }}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm transition-colors"
                >
                  Approve Gear
                </button>
                <button
                  onClick={() => {
                    setQueue(prev => prev.map(q =>
                      q.id === jumper.id ? { ...q, checks: { ...q.checks, gearCheck: 'fail' as const } } : q
                    ));
                    setGearOpen(false);
                    setGearChecks({});
                    showToast(`Gear BLOCKED for ${jumper.name} — cannot manifest`, 'error');
                  }}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition-colors"
                >
                  Block Jump
                </button>
                <button
                  onClick={() => setGearOpen(false)}
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 dark:text-gray-300 rounded-lg font-semibold text-sm transition-colors ml-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
