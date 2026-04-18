'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPatch } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';
import {
  AlertCircle,
  Clock,
  AlertOctagon,
  CheckCircle,
  CheckCircle2,
  Eye,
  Edit3,
  UserPlus,
  TrendingUp,
  Filter,
  ChevronDown,
  ShieldAlert,
} from 'lucide-react';

type Severity = 'NEAR_MISS' | 'MINOR' | 'MODERATE' | 'SERIOUS' | 'FATAL';
type Status = 'REPORTED' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';

interface Incident {
  id: string;
  numericId?: number;
  title: string;
  description: string;
  severity: Severity;
  status: Status;
  date: string;
  reporter: string;
  assignee?: string;
  assignedToId?: number;
  escalatedToFAA?: boolean;
  loadNumber?: number;
  details?: {
    fullDescription: string;
    timeline: string[];
    involvedPersons: string[];
    gearInvolved: string[];
    weatherAtTime: string;
  };
}

const STATUS_OPTIONS: Status[] = ['REPORTED', 'INVESTIGATING', 'RESOLVED', 'CLOSED'];

/** Transform raw API incident response into the Incident interface used by the UI. */
function transformApiIncident(i: any): Incident {
  return {
    id: `INC-${String(i.id).padStart(3, '0')}`,
    numericId: i.id,
    title: i.title || `Incident #${i.id}`,
    description: i.description || '',
    severity: i.severity || 'MINOR',
    status: i.status || 'REPORTED',
    date: i.createdAt ? new Date(i.createdAt).toISOString().split('T')[0] : '',
    reporter: i.reportedByName || 'Unknown',
    assignee: i.assignedToName || undefined,
    assignedToId: i.assignedToId || undefined,
    escalatedToFAA: i.escalatedToFAA || false,
    loadNumber: i.loadId,
  };
}

/** Return YYYY-MM-DD for a Date object in local time. */
function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function IncidentsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [filterStatus, setFilterStatus] = useState<Status | 'All'>('All');
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'All'>('All');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);
  const [assignDropdownId, setAssignDropdownId] = useState<string | null>(null);
  const [modalStatusOpen, setModalStatusOpen] = useState(false);
  const [escalateConfirm, setEscalateConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<{ id: number; name: string }[]>([]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const getApiId = (incident: Incident) => incident.numericId || incident.id.replace(/\D/g, '') || '1';

  const updateIncidentStatus = async (incident: Incident, newStatus: Status) => {
    try {
      await apiPatch(`/incidents/${getApiId(incident)}`, { status: newStatus.toUpperCase() });
      showToast(`Status updated to ${newStatus}`);
    } catch {
      showToast('Status update failed');
    }
    setIncidents(prev => prev.map(i => i.id === incident.id ? { ...i, status: newStatus } : i));
    setStatusDropdownId(null);
    setModalStatusOpen(false);
    if (selectedIncident?.id === incident.id) {
      setSelectedIncident({ ...incident, status: newStatus });
    }
  };

  const assignIncident = async (incident: Incident, staff: { id: number; name: string }) => {
    try {
      await apiPatch(`/incidents/${getApiId(incident)}`, { assignedToId: staff.id });
      showToast(`Assigned to ${staff.name}`);
    } catch {
      showToast('Assignment failed');
    }
    setIncidents(prev => prev.map(i => i.id === incident.id ? { ...i, assignee: staff.name, assignedToId: staff.id } : i));
    setAssignDropdownId(null);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setIncidents([]);
      setStaffList([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchIncidents = async () => {
      setIsLoading(true);
      try {
        const response = await apiGet<{ success: boolean; data: any[] }>('/incidents');
        if (cancelled) return;
        if (response?.data && Array.isArray(response.data)) {
          setIncidents(response.data.map(transformApiIncident));
        } else {
          setIncidents([]);
        }
      } catch {
        if (!cancelled) setIncidents([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    const fetchStaff = async () => {
      try {
        // The /users endpoint returns all DZ users; we use them for assignment.
        const res = await apiGet<{ success: boolean; data: any[] }>('/users?limit=100');
        if (cancelled) return;
        if (res?.data && Array.isArray(res.data)) {
          setStaffList(res.data.map((u: any) => ({ id: u.id, name: `${u.firstName} ${u.lastName}`.trim() })));
        }
      } catch {
        if (!cancelled) setStaffList([]);
      }
    };

    fetchIncidents();
    fetchStaff();

    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const getSeverityColor = (severity: Severity) => {
    switch (severity) {
      case 'NEAR_MISS':
        return { bg: 'bg-blue-100', text: 'text-blue-800', icon: 'text-blue-600' };
      case 'MINOR':
        return { bg: 'bg-amber-100', text: 'text-amber-800', icon: 'text-amber-600' };
      case 'MODERATE':
        return { bg: 'bg-orange-100', text: 'text-orange-800', icon: 'text-orange-600' };
      case 'SERIOUS':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: 'text-red-600' };
      case 'FATAL':
        return { bg: 'bg-red-900', text: 'text-red-50', icon: 'text-red-300' };
    }
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'REPORTED':
        return { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' };
      case 'INVESTIGATING':
        return { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' };
      case 'RESOLVED':
        return { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' };
      case 'CLOSED':
        return { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500' };
    }
  };

  const getStatusIcon = (status: Status) => {
    switch (status) {
      case 'REPORTED':
        return <AlertCircle className="w-4 h-4" />;
      case 'INVESTIGATING':
        return <Clock className="w-4 h-4" />;
      case 'RESOLVED':
        return <CheckCircle className="w-4 h-4" />;
      case 'CLOSED':
        return <AlertOctagon className="w-4 h-4" />;
    }
  };

  const filteredIncidents = incidents.filter((incident) => {
    const matchesStatus = filterStatus === 'All' || incident.status === filterStatus;
    const matchesSeverity = filterSeverity === 'All' || incident.severity === filterSeverity;
    return matchesStatus && matchesSeverity;
  });

  const todayStr = toLocalDateString(new Date());
  const todayIncidents = incidents.filter((i) => i.date === todayStr).length;
  const weekIncidents = incidents.filter((i) => {
    const d = new Date(i.date);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    return d >= sevenDaysAgo;
  }).length;
  const openCount = incidents.filter((i) => i.status === 'REPORTED' || i.status === 'INVESTIGATING').length;
  const resolvedCount = incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').length;
  // Safe days: count days since last incident (0 if there are incidents today)
  const safeDays = incidents.length > 0
    ? Math.max(0, Math.floor((new Date().getTime() - new Date(incidents.reduce((latest, i) => i.date > latest ? i.date : latest, incidents[0].date)).getTime()) / 86400000))
    : 0;

  return (
    <RouteGuard allowedRoles={ROLE_GROUPS.SAFETY}>
    <div className="min-h-screen bg-gray-50 dark:bg-transparent p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white">Safety Incident Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Track, investigate, and resolve skydiving safety incidents</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Today</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{todayIncidents}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">This Week</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{weekIncidents}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Open</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{openCount}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Resolved</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{resolvedCount}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Safe Days</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{safeDays}</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 sm:p-6 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Filters</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {(['All', 'REPORTED', 'INVESTIGATING', 'RESOLVED', 'CLOSED'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {status === 'All' ? 'All Status' : status}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {(['All', 'NEAR_MISS', 'MINOR', 'MODERATE', 'SERIOUS', 'FATAL'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterSeverity === sev
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {sev === 'All' ? 'All' : sev}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Report Button */}
        <button
          onClick={() => router.push('/dashboard/incidents/new')}
          className="mb-6 w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow transition-colors flex items-center justify-center gap-2"
        >
          <AlertCircle className="w-5 h-5" />
          Report Incident
        </button>

        {/* Incident Cards */}
        <div className="grid gap-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 animate-pulse">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-gray-200 rounded w-2/3" />
                      <div className="h-4 bg-gray-200 rounded w-full" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((c) => (
                      <div key={c} className="space-y-1">
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-lg">No incidents match your filters</p>
            </div>
          ) : (
            filteredIncidents.map((incident) => {
              const severity = getSeverityColor(incident.severity);
              const status = getStatusColor(incident.status);
              return (
                <div key={incident.id} className="bg-white dark:bg-slate-800 rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${severity.bg} flex items-center justify-center mt-1`}>
                          <TrendingUp className={`w-5 h-5 ${severity.icon}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{incident.title}</h3>
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${severity.bg} ${severity.text}`}>
                              {incident.severity}
                            </span>
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${status.bg} ${status.text} flex items-center gap-1`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                              {incident.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{incident.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Date</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{incident.date}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Reporter</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{incident.reporter}</p>
                      </div>
                      {incident.loadNumber && (
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Load #</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{incident.loadNumber}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Assigned To</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{incident.assignee || 'Unassigned'}</p>
                      </div>
                      {incident.escalatedToFAA && (
                        <div className="col-span-2 sm:col-span-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                            <ShieldAlert className="w-3.5 h-3.5" /> Escalated to FAA
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedIncident(incident)}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setStatusDropdownId(statusDropdownId === incident.id ? null : incident.id)}
                          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                          Update Status
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {statusDropdownId === incident.id && (
                          <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-10 min-w-[160px]">
                            {STATUS_OPTIONS.filter(s => s !== incident.status).map(status => (
                              <button
                                key={status}
                                onClick={() => updateIncidentStatus(incident, status)}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setAssignDropdownId(assignDropdownId === incident.id ? null : incident.id)}
                          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <UserPlus className="w-4 h-4" />
                          {incident.assignee ? `Assigned: ${incident.assignee}` : 'Assign'}
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {assignDropdownId === incident.id && (
                          <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-10 min-w-[200px]">
                            {staffList.map(staff => (
                              <button
                                key={staff.id}
                                onClick={() => assignIncident(incident, staff)}
                                className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg ${incident.assignedToId === staff.id ? 'text-blue-600 font-semibold bg-blue-50' : 'text-gray-700'}`}
                              >
                                {staff.name}
                                {incident.assignedToId === staff.id && ' (current)'}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail Modal */}
        {selectedIncident && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-t-lg sm:rounded-lg w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedIncident.title}</h2>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-400 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Severity</p>
                    <p className={`text-lg font-bold mt-1 ${getSeverityColor(selectedIncident.severity).text}`}>
                      {selectedIncident.severity}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                    <p className={`text-lg font-bold mt-1 ${getStatusColor(selectedIncident.status).text}`}>
                      {selectedIncident.status}
                    </p>
                  </div>
                </div>
                {selectedIncident.details && (
                  <>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2">Full Description</h3>
                      <p className="text-gray-700 dark:text-gray-300">{selectedIncident.details.fullDescription}</p>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2">Timeline</h3>
                      <div className="space-y-2">
                        {selectedIncident.details.timeline.map((event, idx) => (
                          <p key={idx} className="text-sm text-gray-700 dark:text-gray-300">{event}</p>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2">Involved Personnel</h3>
                      <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                        {selectedIncident.details.involvedPersons.map((person, idx) => (
                          <li key={idx}>- {person}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2">Gear Involved</h3>
                      <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                        {selectedIncident.details.gearInvolved.map((gear, idx) => (
                          <li key={idx}>- {gear}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2">Weather at Time</h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{selectedIncident.details.weatherAtTime}</p>
                    </div>
                  </>
                )}
                <div className="border-t pt-4 space-y-2">
                  <div className="relative">
                    <button
                      onClick={() => setModalStatusOpen(!modalStatusOpen)}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      Update Status
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {modalStatusOpen && (
                      <div className="absolute bottom-full left-0 mb-1 w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-10">
                        {STATUS_OPTIONS.filter(s => s !== selectedIncident.status).map(status => (
                          <button
                            key={status}
                            onClick={() => updateIncidentStatus(selectedIncident, status)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {(selectedIncident.severity === 'SERIOUS' || selectedIncident.severity === 'FATAL') && (
                    <>
                      {!escalateConfirm ? (
                        <button
                          onClick={() => setEscalateConfirm(true)}
                          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                        >
                          Escalate to FAA
                        </button>
                      ) : (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-sm text-red-800 font-medium mb-2">
                            Confirm FAA escalation? This will notify the safety officer and DZ owner.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  await apiPatch(`/incidents/${getApiId(selectedIncident)}`, { escalatedToFAA: true });
                                  showToast('Incident escalated to FAA');
                                } catch {
                                  showToast('Escalation failed');
                                }
                                setIncidents(prev => prev.map(i => i.id === selectedIncident.id ? { ...i, escalatedToFAA: true } : i));
                                setEscalateConfirm(false);
                                setSelectedIncident(null);
                              }}
                              className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg"
                            >
                              Confirm Escalation
                            </button>
                            <button
                              onClick={() => setEscalateConfirm(false)}
                              className="flex-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50 flex items-center gap-2">
          <CheckCircle2 size={16} />
          {toast}
        </div>
      )}
    </div>
    </RouteGuard>
  );
}
