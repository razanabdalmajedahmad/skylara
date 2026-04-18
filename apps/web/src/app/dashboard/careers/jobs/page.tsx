'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  Play,
  Pause,
  XCircle,
  Archive,
  Loader2,
  Inbox,
  MapPin,
  Calendar,
  FileText,
  ChevronDown,
} from 'lucide-react';

interface Job {
  id: string;
  title: string;
  roleCategory: string;
  status: string;
  employmentType: string;
  locationMode: string;
  city: string;
  country: string;
  applicationsCount: number;
  createdAt: string;
  publishedAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-300',
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PAUSED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  CLOSED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ARCHIVED: 'bg-gray-100 text-gray-500 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-400',
};

const ROLE_CATEGORIES = [
  { value: '', label: 'All Roles' },
  { value: 'TI', label: 'Tandem Instructor' },
  { value: 'AFFI', label: 'AFF Instructor' },
  { value: 'COACH', label: 'Coach' },
  { value: 'PILOT', label: 'Pilot' },
  { value: 'RIGGER', label: 'Rigger' },
  { value: 'MANIFEST_STAFF', label: 'Manifest Staff' },
  { value: 'DZ_MANAGER', label: 'DZ Manager' },
  { value: 'CAMERA', label: 'Camera' },
  { value: 'PACKER', label: 'Packer' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRole(role: string): string {
  const found = ROLE_CATEGORIES.find((r) => r.value === role);
  return found ? found.label : role.replace(/_/g, ' ');
}

export default function JobsListPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchJobs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (roleFilter) params.set('roleCategory', roleFilter);
      if (searchQuery) params.set('search', searchQuery);
      const qs = params.toString();
      const res = await apiGet<{ data: Job[]; total: number }>(`/careers/jobs${qs ? `?${qs}` : ''}`);
      setJobs(res.data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load jobs', 'error');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, roleFilter, searchQuery]);

  useEffect(() => {
    setLoading(true);
    const debounce = setTimeout(fetchJobs, 300);
    return () => clearTimeout(debounce);
  }, [fetchJobs]);

  const handleAction = async (jobId: string, action: string) => {
    setActionLoading(jobId);
    try {
      await apiPost(`/careers/jobs/${jobId}/${action}`);
      showToast(`Job ${action}ed successfully`);
      await fetchJobs();
    } catch (err: any) {
      showToast(err.message || `Failed to ${action} job`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const getActions = (job: Job) => {
    const actions: { label: string; icon: typeof Edit; action: string; color: string }[] = [
      { label: 'View', icon: Eye, action: 'view', color: 'text-gray-600 dark:text-gray-400 hover:text-gray-800' },
      { label: 'Edit', icon: Edit, action: 'edit', color: 'text-blue-600 hover:text-blue-800' },
    ];
    switch (job.status) {
      case 'DRAFT':
        actions.push({ label: 'Publish', icon: Play, action: 'publish', color: 'text-green-600 hover:text-green-800' });
        break;
      case 'PUBLISHED':
        actions.push({ label: 'Pause', icon: Pause, action: 'pause', color: 'text-yellow-600 hover:text-yellow-800' });
        actions.push({ label: 'Close', icon: XCircle, action: 'close', color: 'text-red-600 hover:text-red-800' });
        break;
      case 'PAUSED':
        actions.push({ label: 'Publish', icon: Play, action: 'publish', color: 'text-green-600 hover:text-green-800' });
        actions.push({ label: 'Close', icon: XCircle, action: 'close', color: 'text-red-600 hover:text-red-800' });
        break;
      case 'CLOSED':
        actions.push({ label: 'Archive', icon: Archive, action: 'archive', color: 'text-gray-500 dark:text-gray-400 hover:text-gray-700' });
        break;
    }
    return actions;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Job Postings</h2>
        <button
          onClick={() => router.push('/dashboard/careers/jobs/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Post New Job
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {ROLE_CATEGORIES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-500 dark:text-gray-400">Loading jobs...</span>
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 py-16 text-center">
          <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No jobs found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-1">
            {searchQuery || statusFilter || roleFilter
              ? 'Try adjusting your filters'
              : 'Create your first job posting to get started'}
          </p>
          {!searchQuery && !statusFilter && !roleFilter && (
            <button
              onClick={() => router.push('/dashboard/careers/jobs/new')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Post New Job
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Job Title</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Applicants</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/dashboard/careers/jobs/${job.id}`)}
                        className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left"
                      >
                        {job.title}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-300">{formatRole(job.roleCategory)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-600'}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {job.city && job.country ? `${job.city}, ${job.country}` : job.locationMode || 'Remote'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{job.applicationsCount ?? 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(job.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {getActions(job).map((act) => {
                          const Icon = act.icon;
                          const isLoading = actionLoading === job.id;
                          return (
                            <button
                              key={act.action}
                              onClick={() => {
                                if (act.action === 'view') {
                                  router.push(`/dashboard/careers/jobs/${job.id}`);
                                } else if (act.action === 'edit') {
                                  router.push(`/dashboard/careers/jobs/${job.id}?edit=true`);
                                } else {
                                  handleAction(job.id, act.action);
                                }
                              }}
                              disabled={isLoading}
                              title={act.label}
                              className={`p-1.5 rounded-md transition-colors ${act.color} disabled:opacity-50`}
                            >
                              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
