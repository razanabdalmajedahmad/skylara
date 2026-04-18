'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api';
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  X,
  RefreshCw,
  ClipboardList,
  Clock,
  Rocket,
  Radio,
  MapPin,
  Plane,
} from 'lucide-react';

// ── TYPES ──────────────────────────────────────────────────
interface DropzoneApplication {
  id: string;
  name: string;
  country: string;
  city: string;
  address?: string;
  contactEmail: string;
  contactPhone?: string;
  contactName?: string;
  website?: string;
  aircraftTypes: string[];
  maxAltitude?: number;
  disciplines: string[];
  services?: string[];
  facilities?: string[];
  operatingDays?: string[];
  setupReadiness?: string;
  description?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  notes?: string;
}

// ── STATUS CONFIG ──────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
  under_review: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-700' },
  verification_pending: { label: 'Verification Pending', color: 'bg-orange-100 text-orange-700' },
  pilot_ready: { label: 'Pilot Ready', color: 'bg-purple-100 text-purple-700' },
  live: { label: 'Live', color: 'bg-green-100 text-green-700' },
  suspended: { label: 'Suspended', color: 'bg-red-100 text-red-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
};

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'verification_pending', label: 'Verification Pending' },
  { key: 'pilot_ready', label: 'Pilot Ready' },
  { key: 'live', label: 'Live' },
  { key: 'suspended', label: 'Suspended' },
];

// ── FALLBACK DATA (used only when API returns empty and for offline resilience) ──
const FALLBACK_DROPZONES: DropzoneApplication[] = [];

// ── COMPONENT ──────────────────────────────────────────────
export default function AdminDropzonesOnboardingPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<DropzoneApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState<DropzoneApplication | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── FETCH DATA ───────────────────────────────────────
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ success: boolean; data: DropzoneApplication[] }>('/onboarding/dropzones');
      if (res.success && res.data && res.data.length > 0) {
        setApplications(res.data);
      } else {
        setApplications([]);
      }
    } catch {
      setError('Failed to load dropzone applications. Please try again.');
      setApplications(FALLBACK_DROPZONES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications, refreshKey]);

  // ── ACTIONS ──────────────────────────────────────────
  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await apiPost(`/onboarding/dropzones/${id}/approve`);
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'pilot_ready' } : a))
      );
      if (selectedApp?.id === id) {
        setSelectedApp((prev) => prev ? { ...prev, status: 'pilot_ready' } : null);
      }
    } catch {
      setError('Failed to approve application. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    const notes = window.prompt('Enter rejection reason:');
    if (!notes) return;
    setActionLoading(id);
    try {
      await apiPost(`/onboarding/dropzones/${id}/reject`, { notes });
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'rejected', notes } : a))
      );
      if (selectedApp?.id === id) {
        setSelectedApp((prev) => prev ? { ...prev, status: 'rejected', notes } : null);
      }
    } catch {
      setError('Failed to reject application. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  // ── FILTERING / SEARCH ───────────────────────────────
  const filtered = applications.filter((a) => {
    const matchesFilter = activeFilter === 'all' || a.status === activeFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      a.name.toLowerCase().includes(q) ||
      a.contactEmail.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.country.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  // ── STATS ────────────────────────────────────────────
  const stats = {
    total: applications.length,
    underReview: applications.filter((a) => a.status === 'submitted' || a.status === 'under_review' || a.status === 'verification_pending').length,
    pilotReady: applications.filter((a) => a.status === 'pilot_ready').length,
    live: applications.filter((a) => a.status === 'live').length,
  };

  const statusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  };

  // ── RENDER ───────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dropzone Applications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review and manage dropzone onboarding applications</p>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: ClipboardList, iconColor: 'text-blue-600', bgColor: 'bg-blue-50' },
          { label: 'Under Review', value: stats.underReview, icon: Clock, iconColor: 'text-orange-600', bgColor: 'bg-orange-50' },
          { label: 'Pilot Ready', value: stats.pilotReady, icon: Rocket, iconColor: 'text-purple-600', bgColor: 'bg-purple-50' },
          { label: 'Live', value: stats.live, icon: Radio, iconColor: 'text-green-600', bgColor: 'bg-green-50' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 flex items-center gap-4">
            <div className={`${stat.bgColor} p-3 rounded-lg`}>
              <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Tabs + Search */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap gap-1">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                    activeFilter === tab.key
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-500 dark:text-gray-400">Loading applications...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
            <AlertCircle className="w-8 h-8 mb-2" />
            <p>No applications found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">DZ Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">Country / City</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400 hidden lg:table-cell">Contact Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400 hidden lg:table-cell">Aircraft</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400 hidden xl:table-cell">Disciplines</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{app.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        {app.country}, {app.city}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell">{app.contactEmail}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(app.aircraftTypes || []).slice(0, 2).map((a) => (
                          <span key={a} className="text-xs bg-gray-100 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded flex items-center gap-1">
                            <Plane className="w-3 h-3" />
                            {a}
                          </span>
                        ))}
                        {(app.aircraftTypes || []).length > 2 && (
                          <span className="text-xs text-gray-400">+{(app.aircraftTypes || []).length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden xl:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(app.disciplines || []).slice(0, 2).map((d) => (
                          <span key={d} className="text-xs bg-gray-100 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                            {d}
                          </span>
                        ))}
                        {(app.disciplines || []).length > 2 && (
                          <span className="text-xs text-gray-400">+{(app.disciplines || []).length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{statusBadge(app.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedApp(app)}
                          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {app.status !== 'live' && app.status !== 'pilot_ready' && app.status !== 'rejected' && (
                          <>
                            <button
                              onClick={() => handleApprove(app.id)}
                              disabled={actionLoading === app.id}
                              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition disabled:opacity-50"
                              title="Approve (Set Pilot Ready)"
                            >
                              {actionLoading === app.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleReject(app.id)}
                              disabled={actionLoading === app.id}
                              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── DETAIL MODAL ─────────────────────────────────── */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 rounded-t-xl z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selectedApp.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedApp.country}, {selectedApp.city}
                </p>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-400 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="flex items-center gap-3">
                {statusBadge(selectedApp.status)}
                {selectedApp.createdAt && (
                  <span className="text-xs text-gray-400">
                    Applied {new Date(selectedApp.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Description */}
              {selectedApp.description && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedApp.description}</p>
                </section>
              )}

              {/* Location */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Location</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Address:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{selectedApp.address || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Country:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{selectedApp.country}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">City:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{selectedApp.city}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Website:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{selectedApp.website || '-'}</span>
                  </div>
                </div>
              </section>

              {/* Contact */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Contact</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Name:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{selectedApp.contactName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Email:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{selectedApp.contactEmail}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Phone:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{selectedApp.contactPhone || '-'}</span>
                  </div>
                </div>
              </section>

              {/* Aircraft */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Aircraft</h3>
                <div className="flex flex-wrap gap-2">
                  {(selectedApp.aircraftTypes || []).map((a) => (
                    <span key={a} className="inline-flex items-center gap-1 px-3 py-1 bg-sky-50 text-sky-700 rounded-full text-xs font-medium">
                      <Plane className="w-3 h-3" />
                      {a}
                    </span>
                  ))}
                </div>
                {selectedApp.maxAltitude && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Max Altitude: {selectedApp.maxAltitude.toLocaleString()} ft
                  </p>
                )}
              </section>

              {/* Disciplines */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Disciplines</h3>
                <div className="flex flex-wrap gap-2">
                  {(selectedApp.disciplines || []).map((d) => (
                    <span key={d} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      {d}
                    </span>
                  ))}
                </div>
              </section>

              {/* Services */}
              {(selectedApp.services || []).length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Services</h3>
                  <div className="flex flex-wrap gap-2">
                    {(selectedApp.services || []).map((s) => (
                      <span key={s} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Facilities */}
              {(selectedApp.facilities || []).length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Facilities</h3>
                  <div className="flex flex-wrap gap-2">
                    {(selectedApp.facilities || []).map((f) => (
                      <span key={f} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                        {f}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Operating Days */}
              {(selectedApp.operatingDays || []).length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Operating Days</h3>
                  <div className="flex flex-wrap gap-2">
                    {(selectedApp.operatingDays || []).map((day) => (
                      <span key={day} className="px-3 py-1 bg-gray-100 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
                        {day}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Setup Readiness */}
              {selectedApp.setupReadiness && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Setup Readiness</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                    {selectedApp.setupReadiness}
                  </p>
                </section>
              )}

              {/* Notes */}
              {selectedApp.notes && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Notes</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    {selectedApp.notes}
                  </p>
                </section>
              )}
            </div>

            {/* Modal Footer Actions */}
            {selectedApp.status !== 'live' && selectedApp.status !== 'pilot_ready' && selectedApp.status !== 'rejected' && (
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 rounded-b-xl">
                <button
                  onClick={() => handleReject(selectedApp.id)}
                  disabled={actionLoading === selectedApp.id}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(selectedApp.id)}
                  disabled={actionLoading === selectedApp.id}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {actionLoading === selectedApp.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Approve (Pilot Ready)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
