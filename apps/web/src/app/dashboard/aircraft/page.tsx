'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import {
  Plane,
  AlertCircle,
  Wrench,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';

// ── TYPES ────────────────────────────────────────────
interface Aircraft {
  id: number | string;
  tailNumber: string;
  type: string;
  manufacturer: string;
  status: string;
  currentLoad: string | null;
  seats: number;
  currentHours: number;
  nextMaintenance: Date | null;
  lastMaintenance: Date | null;
}

interface MaintenanceRecord {
  id: string;
  aircraft: string;
  date: Date;
  type: string;
  description: string;
  technician: string;
  hoursLogged: number;
}

// ── UTILITIES ────────────────────────────────────────
const formatDate = (date: Date | null): string =>
  date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const getStatusClasses = (status: string): string => {
  const map: Record<string, string> = {
    available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'in-flight': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    grounded: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return map[status] || 'bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-300';
};

const getStatusBorder = (status: string): string => {
  const map: Record<string, string> = {
    available: 'border-l-emerald-500',
    active: 'border-l-emerald-500',
    'in-flight': 'border-l-sky-500',
    maintenance: 'border-l-amber-500',
    grounded: 'border-l-red-500',
  };
  return map[status] || 'border-l-gray-400';
};

const getMaintenanceStatus = (date: Date | null): { label: string; cls: string } => {
  if (!date) return { label: 'Unknown', cls: 'text-gray-500' };
  const now = new Date();
  if (date < now) return { label: 'Overdue for Service', cls: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' };
  const days = Math.floor((date.getTime() - now.getTime()) / 86400000);
  if (days <= 3) return { label: 'Urgent Service Needed', cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' };
  if (days <= 14) return { label: 'Service Due Soon', cls: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400' };
  return { label: 'Service OK', cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' };
};

const getStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    available: 'Available', active: 'Available', 'in-flight': 'In Flight',
    maintenance: 'Maintenance', grounded: 'Grounded',
  };
  return map[status] || status;
};

// ── MAIN COMPONENT ────────────────────────────────────────
export default function AircraftPage() {
  const { user } = useAuth();
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMxLoading, setIsMxLoading] = useState(false);
  const [selectedAc, setSelectedAc] = useState<Aircraft | null>(null);
  const [selectedAcDetail, setSelectedAcDetail] = useState<any>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAddSubmitting, setIsAddSubmitting] = useState(false);
  const [showConfirmInspect, setShowConfirmInspect] = useState<Aircraft | null>(null);
  const [isInspectSubmitting, setIsInspectSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map backend status strings to UI status strings
  const mapApiStatus = (status: string): string => {
    switch (status) {
      case 'ACTIVE': return 'available';
      case 'MX_HOLD': return 'maintenance';
      case 'RETIRED': return 'grounded';
      default: return status.toLowerCase();
    }
  };

  // Map API aircraft response to frontend Aircraft interface
  const mapAircraftFromApi = useCallback(
    (ac: any): Aircraft => ({
      id: ac.id,
      tailNumber: ac.registration || ac.tailNumber || `AC-${ac.id}`,
      type: ac.type || ac.model || 'Unknown',
      manufacturer: ac.manufacturer || '',
      status: mapApiStatus(ac.status || ''),
      currentLoad: null,
      seats: ac.maxCapacity || 0,
      currentHours: Number(ac.hobbsHours) || 0,
      nextMaintenance: ac.annualDue ? new Date(ac.annualDue) : null,
      lastMaintenance: null,
    }),
    []
  );

  const fetchAircraft = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ success: boolean; data: any[] }>('/aircraft');
      if (res.success && res.data) {
        setAircraft(res.data.map(mapAircraftFromApi));
      } else {
        setAircraft([]);
      }
    } catch {
      setError('Failed to load aircraft. The API may be unavailable.');
      setAircraft([]);
    } finally {
      setIsLoading(false);
    }
  }, [mapAircraftFromApi]);

  // Fetch maintenance audit logs filtered to Aircraft entity type
  const fetchMaintenanceLogs = useCallback(async () => {
    setIsMxLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: any[] }>(
        '/audit-logs?resourceType=Aircraft&limit=50'
      );
      if (res.success && res.data && res.data.length > 0) {
        // Map audit log entries to MaintenanceRecord shape for display
        const mapped: MaintenanceRecord[] = res.data
          .filter((log: any) => log.action === 'UPDATE' || log.action === 'CREATE')
          .map((log: any) => {
            const after = log.afterState || {};
            const before = log.beforeState || {};
            // Determine aircraft registration from the audit state
            const acReg = after.registration || before.registration || `Aircraft #${log.entityId}`;
            // Determine maintenance type from audit context
            let mxType = 'Status Update';
            if (log.action === 'CREATE') mxType = 'Aircraft Added';
            else if (after.status === 'ACTIVE' && before.status === 'MX_HOLD') mxType = 'Returned to Service';
            else if (after.status === 'MX_HOLD') mxType = 'Placed on MX Hold';
            else if (after.hobbsHours) mxType = 'Hobbs Update';

            const desc = log.action === 'CREATE'
              ? `Registered ${acReg}`
              : after.status
                ? `Status changed${before.status ? ` from ${before.status}` : ''} to ${after.status}`
                : after.hobbsHours
                  ? `Hobbs updated to ${after.hobbsHours}h`
                  : 'Aircraft record updated';

            return {
              id: String(log.id),
              aircraft: acReg,
              date: new Date(log.createdAt),
              type: mxType,
              description: desc,
              technician: log.userId ? `User #${log.userId}` : 'System',
              hoursLogged: Number(after.hobbsHours) || Number(before.hobbsHours) || 0,
            };
          });
        setMaintenance(mapped);
      } else {
        setMaintenance([]);
      }
    } catch {
      // Audit logs endpoint may require admin role — degrade gracefully
      setMaintenance([]);
    } finally {
      setIsMxLoading(false);
    }
  }, []);

  // Fetch detail for a single aircraft (airworthiness, active loads)
  const fetchAircraftDetail = useCallback(async (acId: number | string) => {
    setIsDetailLoading(true);
    setSelectedAcDetail(null);
    try {
      const res = await apiGet<{ success: boolean; data: any }>(`/aircraft/${acId}`);
      if (res.success && res.data) {
        setSelectedAcDetail(res.data);
      }
    } catch {
      // Detail fetch failed — modal will show basic info from list data
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  useEffect(() => { fetchAircraft(); fetchMaintenanceLogs(); }, [fetchAircraft, fetchMaintenanceLogs]);

  const totalFleetHours = aircraft.reduce((sum, ac) => sum + ac.currentHours, 0);

  return (
    <div className="p-4 lg:p-6 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Aircraft Fleet</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {aircraft.length} aircraft
              {totalFleetHours > 0 && ` \u2022 ${totalFleetHours.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} total fleet hours`}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
          >
            <Plus size={18} />
            Add Aircraft
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => { setError(null); fetchAircraft(); fetchMaintenanceLogs(); }} className="ml-auto text-xs font-semibold underline hover:no-underline">
              Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Loading aircraft...</p>
          </div>
        ) : aircraft.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700">
            <Plane size={48} className="text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">No aircraft found</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Add aircraft to your fleet to get started</p>
          </div>
        ) : (
          <>
            {/* Aircraft Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {aircraft.map((ac) => {
                const maint = getMaintenanceStatus(ac.nextMaintenance);
                return (
                  <div key={ac.id} className={`bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 overflow-hidden border-l-4 ${getStatusBorder(ac.status)}`}>
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{ac.tailNumber}</h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {ac.manufacturer ? `${ac.manufacturer} ` : ''}{ac.type}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full font-semibold text-xs ${getStatusClasses(ac.status)}`}>
                          {getStatusLabel(ac.status)}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-4">
                      {ac.currentLoad && (
                        <div className="p-2 rounded bg-sky-50 dark:bg-sky-900/20">
                          <div className="font-semibold text-sky-700 dark:text-sky-400 text-sm">Load: {ac.currentLoad}</div>
                        </div>
                      )}

                      {/* Seats */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Capacity</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{ac.seats} seats</span>
                      </div>

                      {/* Flight Hours */}
                      {ac.currentHours > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Total Hours</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {ac.currentHours.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} hrs
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Maintenance Status */}
                      <div className={`p-2 rounded ${maint.cls}`}>
                        <div className="flex items-center gap-2">
                          <Wrench size={14} className="flex-shrink-0" />
                          <div>
                            <div className="text-xs font-bold">{maint.label}</div>
                            <div className="text-xs mt-0.5 opacity-80">Next: {formatDate(ac.nextMaintenance)}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-slate-700/30 flex gap-2">
                      <button
                        onClick={() => { setSelectedAc(ac); fetchAircraftDetail(ac.id); }}
                        className="flex-1 px-2 py-1.5 text-xs font-semibold rounded bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => setShowConfirmInspect(ac)}
                        className="flex-1 px-2 py-1.5 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Maintenance Log */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Maintenance Log</h2>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Recent maintenance history for all aircraft</p>
              </div>

              {isMxLoading ? (
                <div className="text-center py-8">
                  <Loader2 size={24} className="animate-spin text-blue-500 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Loading maintenance history...</p>
                </div>
              ) : maintenance.length === 0 ? (
                <div className="text-center py-8">
                  <Wrench size={32} className="text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No maintenance records yet</p>
                  <p className="text-gray-400 dark:text-gray-500 dark:text-gray-400 text-xs mt-1">Records will appear as aircraft are updated</p>
                </div>
              ) : (
                <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">Aircraft</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">Technician</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenance.map((record, i) => (
                      <tr key={record.id} className={`border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 ${i % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50 dark:bg-slate-800/50'}`}>
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{record.aircraft}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{formatDate(record.date)}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                            {record.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{record.description}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{record.technician}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{record.hoursLogged > 0 ? `${record.hoursLogged}h` : '\u2014'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden p-4 space-y-4">
                {maintenance.map((record) => (
                  <div key={record.id} className="border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-900 dark:text-white">{record.aircraft}</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{formatDate(record.date)}</span>
                    </div>
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 inline-block mb-2">
                      {record.type}
                    </span>
                    <div className="text-xs text-gray-700 dark:text-gray-300 mb-2">{record.description}</div>
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>{record.technician}</span>
                      <span className="font-semibold">{record.hoursLogged > 0 ? `${record.hoursLogged}h` : '\u2014'}</span>
                    </div>
                  </div>
                ))}
              </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Detail Modal */}
        {selectedAc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setSelectedAc(null); setSelectedAcDetail(null); }}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{selectedAc.tailNumber}</h2>
              <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex justify-between"><span>Type</span><span className="font-semibold">{selectedAc.manufacturer ? `${selectedAc.manufacturer} ` : ''}{selectedAc.type}</span></div>
                <div className="flex justify-between"><span>Status</span><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusClasses(selectedAc.status)}`}>{getStatusLabel(selectedAc.status)}</span></div>
                <div className="flex justify-between"><span>Capacity</span><span className="font-semibold">{selectedAc.seats} seats</span></div>
                {selectedAc.currentHours > 0 && <div className="flex justify-between"><span>Total Hours</span><span className="font-semibold">{selectedAc.currentHours.toLocaleString()} hrs</span></div>}
                <div className="flex justify-between"><span>Next Maintenance</span><span className="font-semibold">{formatDate(selectedAc.nextMaintenance)}</span></div>
                <div className="flex justify-between"><span>Last Maintenance</span><span className="font-semibold">{formatDate(selectedAc.lastMaintenance)}</span></div>

                {/* Extended detail from GET /aircraft/:id */}
                {isDetailLoading && (
                  <div className="flex items-center gap-2 pt-2 text-xs text-gray-500 dark:text-gray-400">
                    <Loader2 size={14} className="animate-spin" />
                    Loading airworthiness data...
                  </div>
                )}
                {selectedAcDetail && !isDetailLoading && (
                  <>
                    {selectedAcDetail.activeLoads !== undefined && (
                      <div className="flex justify-between"><span>Active Loads</span><span className="font-semibold">{selectedAcDetail.activeLoads}</span></div>
                    )}
                    {selectedAcDetail.maxWeight && (
                      <div className="flex justify-between"><span>Max Weight</span><span className="font-semibold">{selectedAcDetail.maxWeight.toLocaleString()} lbs</span></div>
                    )}
                    {selectedAcDetail.emptyWeight && (
                      <div className="flex justify-between"><span>Empty Weight</span><span className="font-semibold">{selectedAcDetail.emptyWeight.toLocaleString()} lbs</span></div>
                    )}
                    {selectedAcDetail.next100hrDue && (
                      <div className="flex justify-between"><span>100hr Insp Due</span><span className="font-semibold">{Number(selectedAcDetail.next100hrDue).toLocaleString()} hrs</span></div>
                    )}
                    {selectedAcDetail.airworthiness && (
                      <div className={`mt-2 p-2 rounded text-xs font-bold ${selectedAcDetail.airworthiness.airworthy ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                        <div className="flex items-center gap-1.5">
                          {selectedAcDetail.airworthiness.airworthy ? <CheckCircle size={14} /> : <XCircle size={14} />}
                          {selectedAcDetail.airworthiness.airworthy ? 'Airworthy' : 'Not Airworthy'}
                        </div>
                        {selectedAcDetail.airworthiness.reasons && selectedAcDetail.airworthiness.reasons.length > 0 && (
                          <ul className="mt-1 ml-5 list-disc text-xs font-normal opacity-80">
                            {selectedAcDetail.airworthiness.reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}
                          </ul>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              <button onClick={() => { setSelectedAc(null); setSelectedAcDetail(null); }} className="w-full mt-6 px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 font-medium text-sm transition-colors">
                Close
              </button>
            </div>
          </div>
        )}
      {/* Add Aircraft Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Aircraft</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 text-xl">&times;</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsAddSubmitting(true);
              const form = e.target as HTMLFormElement;
              const tailNum = (form.elements.namedItem('tailNumber') as HTMLInputElement).value;
              const acType = (form.elements.namedItem('acType') as HTMLSelectElement).value;
              const capacity = parseInt((form.elements.namedItem('capacity') as HTMLInputElement).value);
              try {
                await apiPost('/aircraft', { registration: tailNum, type: acType, maxCapacity: capacity, maxWeight: 5500, emptyWeight: 3600 });
                setShowAddModal(false);
                fetchAircraft();
                fetchMaintenanceLogs();
              } catch (err: any) {
                const msg = err?.message || 'Failed to add aircraft';
                setError(msg);
                setShowAddModal(false);
              } finally {
                setIsAddSubmitting(false);
              }
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tail Number</label>
                <input name="tailNumber" required placeholder="N12345" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aircraft Type</label>
                <select name="acType" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-blue-500">
                  <option value="Cessna 208B">Cessna 208B Caravan</option>
                  <option value="King Air">King Air</option>
                  <option value="Twin Otter">Twin Otter</option>
                  <option value="Cessna 182">Cessna 182</option>
                  <option value="PAC 750XL">PAC 750XL</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Capacity</label>
                <input name="capacity" type="number" required defaultValue={15} min={1} max={50} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} disabled={isAddSubmitting} className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 font-medium text-sm disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isAddSubmitting} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {isAddSubmitting && <Loader2 size={14} className="animate-spin" />}
                  {isAddSubmitting ? 'Adding...' : 'Add Aircraft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Inspect Modal */}
      {showConfirmInspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowConfirmInspect(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Confirm Inspection</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Mark <strong>{showConfirmInspect.tailNumber}</strong> ({showConfirmInspect.type}) as inspected and ready for flight?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmInspect(null)} disabled={isInspectSubmitting} className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 font-medium text-sm disabled:opacity-50">Cancel</button>
              <button
                disabled={isInspectSubmitting}
                onClick={async () => {
                  const ac = showConfirmInspect;
                  setIsInspectSubmitting(true);
                  try {
                    await apiPatch(`/aircraft/${ac.id}`, { status: 'ACTIVE' });
                    // Optimistic update with server-confirmed status
                    setAircraft(prev => prev.map(a => a.id === ac.id ? { ...a, status: 'available' } : a));
                    setShowConfirmInspect(null);
                    // Refresh maintenance log to show the status change audit entry
                    fetchMaintenanceLogs();
                  } catch (err: any) {
                    const msg = err?.message || 'Failed to update aircraft status';
                    setError(msg);
                    setShowConfirmInspect(null);
                  } finally {
                    setIsInspectSubmitting(false);
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isInspectSubmitting && <Loader2 size={14} className="animate-spin" />}
                {isInspectSubmitting ? 'Confirming...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
