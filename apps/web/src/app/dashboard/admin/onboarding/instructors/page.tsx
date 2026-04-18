'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api';
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  FileText,
  Loader2,
  AlertCircle,
  X,
  RefreshCw,
  ClipboardList,
  Clock,
  ShieldCheck,
  ShieldOff,
  MapPin,
} from 'lucide-react';

// ── TYPES ──────────────────────────────────────────────────
interface InstructorApplication {
  id: string;
  dropzoneId?: number | null;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  applicationType: 'INSTRUCTOR' | 'TI' | 'AFFI';
  disciplines: string[];
  languages?: string[];
  totalJumps?: number;
  experience?: string;
  bio?: string;
  capabilities?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  licenseNumber?: string;
  licenseType?: string;
  ratingDetails?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  notes?: string;
}

// ── STATUS CONFIG ──────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
  documents_missing: { label: 'Documents Missing', color: 'bg-yellow-100 text-yellow-700' },
  verification_pending: { label: 'Verification Pending', color: 'bg-orange-100 text-orange-700' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700' },
  limited_approval: { label: 'Limited Approval', color: 'bg-amber-100 text-amber-700' },
  suspended: { label: 'Suspended', color: 'bg-red-100 text-red-700' },
  archived: { label: 'Archived', color: 'bg-gray-100 text-gray-600' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
};

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'documents_missing', label: 'Documents Missing' },
  { key: 'verification_pending', label: 'Verification Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'suspended', label: 'Suspended' },
];

// ── FALLBACK DATA (used only when API returns empty and for offline resilience) ──
const FALLBACK_INSTRUCTORS: InstructorApplication[] = [];

interface DropzoneOption {
  id: number;
  name: string;
  slug: string;
}

// ── COMPONENT ──────────────────────────────────────────────
export default function AdminInstructorsOnboardingPage() {
  const { user } = useAuth();
  const isPlatformAdmin = user?.roles?.includes('PLATFORM_ADMIN') ?? false;
  const [applications, setApplications] = useState<InstructorApplication[]>([]);
  const [dzOptions, setDzOptions] = useState<DropzoneOption[]>([]);
  const [assignDropzoneId, setAssignDropzoneId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState<InstructorApplication | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isPlatformAdmin) return;
    (async () => {
      try {
        const res = await apiGet<{ success: boolean; data: DropzoneOption[] }>('/onboarding/admin/dropzone-options');
        if (res.success && Array.isArray(res.data)) setDzOptions(res.data);
      } catch {
        setDzOptions([]);
      }
    })();
  }, [isPlatformAdmin]);

  useEffect(() => {
    if (!selectedApp) {
      setAssignDropzoneId('');
      return;
    }
    setAssignDropzoneId(selectedApp.dropzoneId != null ? String(selectedApp.dropzoneId) : '');
  }, [selectedApp]);

  const dzLabel = (app: InstructorApplication) => {
    if (app.dropzoneId == null) return 'Unassigned';
    const name = dzOptions.find((d) => d.id === app.dropzoneId)?.name;
    return name ?? `DZ #${app.dropzoneId}`;
  };

  // ── FETCH DATA ───────────────────────────────────────
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ success: boolean; data: InstructorApplication[] }>('/onboarding/instructors');
      if (res.success && res.data && res.data.length > 0) {
        const instructorTypes = ['INSTRUCTOR', 'TI', 'AFFI'];
        const mapped = (res.data as unknown as Array<{ id: number } & Record<string, unknown>>).map((row) => ({
          ...row,
          id: String(row.id),
        })) as InstructorApplication[];
        const filtered = mapped.filter((a) => instructorTypes.includes(a.applicationType));
        setApplications(filtered.length > 0 ? filtered : []);
      } else {
        setApplications([]);
      }
    } catch {
      setError('Failed to load instructor applications. Please try again.');
      setApplications(FALLBACK_INSTRUCTORS);
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
      await apiPost(`/onboarding/instructors/${id}/approve`);
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'approved' } : a))
      );
      if (selectedApp?.id === id) {
        setSelectedApp((prev) => prev ? { ...prev, status: 'approved' } : null);
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
      await apiPost(`/onboarding/instructors/${id}/reject`, { notes });
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

  const handleAssignDropzone = async (id: string) => {
    const dzId = parseInt(assignDropzoneId, 10);
    if (!Number.isFinite(dzId)) {
      setError('Select a dropzone to assign.');
      return;
    }
    setActionLoading(id);
    setError(null);
    try {
      await apiPost(`/onboarding/instructors/${id}/assign-dropzone`, { dropzoneId: dzId });
      setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, dropzoneId: dzId } : a)));
      setSelectedApp((prev) => (prev && prev.id === id ? { ...prev, dropzoneId: dzId } : prev));
    } catch {
      setError('Failed to assign dropzone.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestDocs = async (id: string) => {
    setActionLoading(id);
    try {
      await apiPost(`/onboarding/instructors/${id}/request-docs`, { notes: 'Additional documents required.' });
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'documents_missing' } : a))
      );
      if (selectedApp?.id === id) {
        setSelectedApp((prev) => prev ? { ...prev, status: 'documents_missing' } : null);
      }
    } catch {
      setError('Failed to request documents. Please try again.');
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
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  // ── STATS ────────────────────────────────────────────
  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === 'submitted' || a.status === 'verification_pending').length,
    approved: applications.filter((a) => a.status === 'approved').length,
    rejected: applications.filter((a) => a.status === 'rejected' || a.status === 'suspended').length,
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Instructor Applications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review and manage instructor onboarding applications (TI, AFFI, Instructor)</p>
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
          { label: 'Total Applications', value: stats.total, icon: ClipboardList, iconColor: 'text-blue-600', bgColor: 'bg-blue-50' },
          { label: 'Pending Review', value: stats.pending, icon: Clock, iconColor: 'text-orange-600', bgColor: 'bg-orange-50' },
          { label: 'Approved', value: stats.approved, icon: ShieldCheck, iconColor: 'text-green-600', bgColor: 'bg-green-50' },
          { label: 'Rejected', value: stats.rejected, icon: ShieldOff, iconColor: 'text-red-600', bgColor: 'bg-red-50' },
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
                placeholder="Search by name or email..."
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
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400 hidden xl:table-cell">Dropzone</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400 hidden lg:table-cell">License Type</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400 hidden lg:table-cell">Disciplines</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">Jumps</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {app.firstName} {app.lastName}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">{app.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                        {app.applicationType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden xl:table-cell text-xs max-w-[10rem] truncate" title={dzLabel(app)}>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                        {dzLabel(app)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                      {app.licenseType || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell">
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
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
                      {app.totalJumps?.toLocaleString() ?? '-'}
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
                        {app.status !== 'approved' && app.status !== 'rejected' && (
                          <>
                            <button
                              onClick={() => handleApprove(app.id)}
                              disabled={actionLoading === app.id}
                              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition disabled:opacity-50"
                              title="Approve"
                            >
                              {actionLoading === app.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleRequestDocs(app.id)}
                              disabled={actionLoading === app.id}
                              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition disabled:opacity-50"
                              title="Request Documents"
                            >
                              <FileText className="w-4 h-4" />
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
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedApp.firstName} {selectedApp.lastName}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedApp.email}</p>
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
              {/* Status + Type */}
              <div className="flex items-center gap-3">
                {statusBadge(selectedApp.status)}
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                  {selectedApp.applicationType}
                </span>
                {selectedApp.createdAt && (
                  <span className="text-xs text-gray-400">
                    Applied {new Date(selectedApp.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Personal Info */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Phone:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{selectedApp.phone || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">License #:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{selectedApp.licenseNumber || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">License Type:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{selectedApp.licenseType || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Total Jumps:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{selectedApp.totalJumps?.toLocaleString() || '-'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-500 dark:text-gray-400">Languages:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{selectedApp.languages?.join(', ') || '-'}</span>
                  </div>
                </div>
              </section>

              {/* Rating Details */}
              {selectedApp.ratingDetails && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Rating Details</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                    {selectedApp.ratingDetails}
                  </p>
                </section>
              )}

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

              {/* Capabilities */}
              {(selectedApp.capabilities || []).length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Capabilities</h3>
                  <div className="flex flex-wrap gap-2">
                    {(selectedApp.capabilities || []).map((c) => (
                      <span key={c} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                        {c}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Experience */}
              {selectedApp.experience && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Experience</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedApp.experience}</p>
                </section>
              )}

              {/* Bio */}
              {selectedApp.bio && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Bio</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedApp.bio}</p>
                </section>
              )}

              {/* Emergency Contact */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Emergency Contact</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Name:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{selectedApp.emergencyContactName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Phone:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{selectedApp.emergencyContactPhone || '-'}</span>
                  </div>
                </div>
              </section>

              {isPlatformAdmin && (
                <section className="border border-blue-100 dark:border-blue-900/40 rounded-lg p-4 bg-blue-50/50 dark:bg-slate-900/40">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Dropzone assignment
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Link this application to a dropzone so tenant managers can see it. Use for legacy submissions without a dropzone.
                  </p>
                  {dzOptions.length === 0 ? (
                    <p className="text-sm text-amber-700 dark:text-amber-300">No active dropzones loaded. Refresh the page or check API access.</p>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <select
                        value={assignDropzoneId}
                        onChange={(e) => setAssignDropzoneId(e.target.value)}
                        className="flex-1 text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800"
                      >
                        <option value="">Select dropzone…</option>
                        {dzOptions.map((dz) => (
                          <option key={dz.id} value={String(dz.id)}>
                            {dz.name} ({dz.slug})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAssignDropzone(selectedApp.id)}
                        disabled={actionLoading === selectedApp.id || !assignDropzoneId}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {actionLoading === selectedApp.id ? 'Saving…' : 'Save assignment'}
                      </button>
                    </div>
                  )}
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
            {selectedApp.status !== 'approved' && selectedApp.status !== 'rejected' && (
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 rounded-b-xl">
                <button
                  onClick={() => handleRequestDocs(selectedApp.id)}
                  disabled={actionLoading === selectedApp.id}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 rounded-lg hover:bg-yellow-200 transition disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  Request Documents
                </button>
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
                  Approve
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
