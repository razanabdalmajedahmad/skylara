'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import {
  FileText,
  Search,
  ChevronDown,
  Loader2,
  Inbox,
  Mail,
  Calendar,
  ExternalLink,
  Filter,
} from 'lucide-react';

interface Application {
  id: string;
  applicantName: string;
  applicantEmail: string;
  jobTitle: string;
  jobPostId: string;
  stage: string;
  source: string;
  submittedAt: string;
}

interface JobOption {
  id: string;
  title: string;
}

const STAGE_COLORS: Record<string, string> = {
  APPLIED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  INITIAL_REVIEW: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  SHORTLISTED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  INTERVIEW_SCHEDULED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  TECHNICAL_EVALUATION: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  FINAL_REVIEW: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  OFFER: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  HIRED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const STAGE_OPTIONS = [
  { value: '', label: 'All Stages' },
  { value: 'APPLIED', label: 'Applied' },
  { value: 'INITIAL_REVIEW', label: 'Initial Review' },
  { value: 'SHORTLISTED', label: 'Shortlisted' },
  { value: 'INTERVIEW_SCHEDULED', label: 'Interview Scheduled' },
  { value: 'TECHNICAL_EVALUATION', label: 'Technical Evaluation' },
  { value: 'FINAL_REVIEW', label: 'Final Review' },
  { value: 'OFFER', label: 'Offer' },
  { value: 'HIRED', label: 'Hired' },
  { value: 'REJECTED', label: 'Rejected' },
];

function formatStage(stage: string): string {
  return stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatSource(source: string): string {
  if (!source) return 'Direct';
  return source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ApplicationsListPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobOptions, setJobOptions] = useState<JobOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<{ data: JobOption[] }>('/careers/jobs?limit=100');
        setJobOptions((res.data || []).map((j) => ({ id: j.id, title: j.title })));
      } catch {
        setJobOptions([]);
      }
    })();
  }, []);

  const fetchApplications = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (stageFilter) params.set('stage', stageFilter);
      if (jobFilter) params.set('jobPostId', jobFilter);
      if (searchQuery) params.set('search', searchQuery);
      const qs = params.toString();
      const res = await apiGet<{ data: Application[]; total: number }>(`/careers/applications${qs ? `?${qs}` : ''}`);
      setApplications(res.data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load applications', 'error');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [stageFilter, jobFilter, searchQuery]);

  useEffect(() => {
    setLoading(true);
    const debounce = setTimeout(fetchApplications, 300);
    return () => clearTimeout(debounce);
  }, [fetchApplications]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">All Applications</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {applications.length} application{applications.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="relative">
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-w-[160px]"
            >
              <option value="">All Jobs</option>
              {jobOptions.map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-w-[160px]"
            >
              {STAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-500 dark:text-gray-400">Loading applications...</span>
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 py-16 text-center">
          <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No applications found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-1">
            {searchQuery || stageFilter || jobFilter ? 'Try adjusting your filters' : 'Applications will appear here as candidates apply'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Applicant</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Job</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stage</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Submitted</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{app.applicantName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" /> {app.applicantEmail}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/dashboard/careers/jobs/${app.jobPostId}`)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {app.jobTitle}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STAGE_COLORS[app.stage] || 'bg-gray-100 text-gray-600'}`}>
                        {formatStage(app.stage)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{formatSource(app.source)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {formatDate(app.submittedAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => router.push(`/dashboard/careers/applications/${app.id}`)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </button>
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
