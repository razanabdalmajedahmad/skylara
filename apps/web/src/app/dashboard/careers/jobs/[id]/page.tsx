'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import {
  ArrowLeft,
  Briefcase,
  Play,
  Pause,
  XCircle,
  Archive,
  Edit,
  Eye,
  FileText,
  Users,
  Calendar,
  UserCheck,
  Loader2,
  Inbox,
  Target,
  GripVertical,
  Mail,
  Clock,
  ChevronRight,
} from 'lucide-react';

interface Job {
  id: string;
  title: string;
  status: string;
  roleCategory: string;
  employmentType: string;
  locationMode: string;
  city: string;
  country: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  compensation: { min?: number; max?: number; currency?: string; period?: string } | null;
  benefits: string[];
  visibilityType: string;
  targetRules: { targetType: string; operator: string; value: string }[];
  customQuestions: { key: string; label: string }[];
  applicationsCount: number;
  views: number;
  recruiterNote: string;
  createdAt: string;
  publishedAt: string | null;
}

interface Application {
  id: string;
  applicantName: string;
  applicantEmail: string;
  stage: string;
  submittedAt: string;
  source: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-300',
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PAUSED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  CLOSED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ARCHIVED: 'bg-gray-100 text-gray-500 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-400',
};

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

const PIPELINE_STAGES = [
  'APPLIED',
  'INITIAL_REVIEW',
  'SHORTLISTED',
  'INTERVIEW_SCHEDULED',
  'TECHNICAL_EVALUATION',
  'FINAL_REVIEW',
  'OFFER',
  'HIRED',
  'REJECTED',
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

function formatDateRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'details' | 'audience'>('pipeline');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    try {
      const [jobRes, appsRes] = await Promise.allSettled([
        apiGet<Job>(`/careers/jobs/${jobId}`),
        apiGet<{ data: Application[] }>(`/careers/applications?jobPostId=${jobId}`),
      ]);
      if (jobRes.status === 'fulfilled') setJob(jobRes.value);
      if (appsRes.status === 'fulfilled') setApplications(appsRes.value.data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load job details', 'error');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (action: string) => {
    setActionLoading(true);
    try {
      await apiPost(`/careers/jobs/${jobId}/${action}`);
      showToast(`Job ${action}ed successfully`);
      await fetchData();
    } catch (err: any) {
      showToast(err.message || `Failed to ${action} job`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading job details...</span>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-20">
        <Briefcase className="w-12 h-12 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">Job not found</p>
        <button onClick={() => router.push('/dashboard/careers/jobs')} className="mt-4 text-sm text-blue-600 hover:underline">
          Back to Jobs
        </button>
      </div>
    );
  }

  const pipelineByStage = PIPELINE_STAGES.reduce<Record<string, Application[]>>((acc, stage) => {
    acc[stage] = applications.filter((a) => a.stage === stage);
    return acc;
  }, {});

  const shortlisted = applications.filter((a) => a.stage === 'SHORTLISTED').length;
  const interviewed = applications.filter((a) => ['INTERVIEW_SCHEDULED', 'TECHNICAL_EVALUATION', 'FINAL_REVIEW'].includes(a.stage)).length;
  const hired = applications.filter((a) => a.stage === 'HIRED').length;

  const statusActions: { label: string; action: string; icon: typeof Play; color: string }[] = [];
  switch (job.status) {
    case 'DRAFT':
      statusActions.push({ label: 'Publish', action: 'publish', icon: Play, color: 'bg-green-600 hover:bg-green-700 text-white' });
      break;
    case 'PUBLISHED':
      statusActions.push({ label: 'Pause', action: 'pause', icon: Pause, color: 'bg-yellow-500 hover:bg-yellow-600 text-white' });
      statusActions.push({ label: 'Close', action: 'close', icon: XCircle, color: 'bg-red-600 hover:bg-red-700 text-white' });
      break;
    case 'PAUSED':
      statusActions.push({ label: 'Resume', action: 'publish', icon: Play, color: 'bg-green-600 hover:bg-green-700 text-white' });
      statusActions.push({ label: 'Close', action: 'close', icon: XCircle, color: 'bg-red-600 hover:bg-red-700 text-white' });
      break;
    case 'CLOSED':
      statusActions.push({ label: 'Archive', action: 'archive', icon: Archive, color: 'bg-gray-600 hover:bg-gray-700 text-white' });
      break;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/careers/jobs')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">{job.title}</h2>
            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[job.status]}`}>{job.status}</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {job.roleCategory?.replace(/_/g, ' ')} / {job.employmentType?.replace(/_/g, ' ')} / {job.locationMode || 'On-site'}
            {job.city ? ` - ${job.city}` : ''}{job.country ? `, ${job.country}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => router.push(`/dashboard/careers/jobs/${jobId}?edit=true`)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 dark:bg-gray-700 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <Edit className="w-4 h-4" /> Edit
          </button>
          {statusActions.map((sa) => {
            const Icon = sa.icon;
            return (
              <button
                key={sa.action}
                onClick={() => handleAction(sa.action)}
                disabled={actionLoading}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${sa.color}`}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                {sa.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Views', value: job.views ?? 0, icon: Eye },
          { label: 'Applications', value: applications.length, icon: FileText },
          { label: 'Shortlisted', value: shortlisted, icon: Users },
          { label: 'Interviews', value: interviewed, icon: Calendar },
          { label: 'Hired', value: hired, icon: UserCheck },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
        <div className="flex gap-1">
          {[
            { id: 'pipeline' as const, label: 'Applications Pipeline', icon: Users },
            { id: 'details' as const, label: 'Job Details', icon: FileText },
            { id: 'audience' as const, label: 'Audience', icon: Target },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'pipeline' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {PIPELINE_STAGES.map((stage) => {
              const stageApps = pipelineByStage[stage] || [];
              return (
                <div key={stage} className="w-64 shrink-0">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{formatStage(stage)}</h4>
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${STAGE_COLORS[stage]}`}>{stageApps.length}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 min-h-[200px] space-y-2">
                    {stageApps.length === 0 ? (
                      <div className="flex items-center justify-center h-24 text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400">
                        No candidates
                      </div>
                    ) : (
                      stageApps.map((app) => (
                        <button
                          key={app.id}
                          onClick={() => router.push(`/dashboard/careers/applications/${app.id}`)}
                          className="w-full bg-white dark:bg-slate-800 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-600 p-3 text-left hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-400 shrink-0">
                              {app.applicantName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{app.applicantName}</p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                                <Mail className="w-2.5 h-2.5" /> {app.applicantEmail}
                              </p>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> {formatDateRelative(app.submittedAt)}
                              </p>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-1" />
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'details' && (
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{job.description || 'No description provided'}</p>
          </div>

          {job.responsibilities && job.responsibilities.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Responsibilities</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {job.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {job.requirements && job.requirements.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Requirements</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {job.requirements.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {job.compensation && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Compensation</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {job.compensation.currency || 'USD'}{' '}
                {job.compensation.min?.toLocaleString()}
                {job.compensation.min && job.compensation.max ? ' - ' : ''}
                {job.compensation.max?.toLocaleString()}
                {job.compensation.period ? ` / ${job.compensation.period}` : ''}
              </p>
            </div>
          )}

          {job.benefits && job.benefits.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Benefits</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {job.benefits.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          )}

          {job.customQuestions && job.customQuestions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Application Questions</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {job.customQuestions.map((q, i) => <li key={i}>{q.label}</li>)}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-slate-700 dark:border-gray-700">
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Created</span>
              <p className="text-sm text-gray-900 dark:text-white">{formatDate(job.createdAt)}</p>
            </div>
            {job.publishedAt && (
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Published</span>
                <p className="text-sm text-gray-900 dark:text-white">{formatDate(job.publishedAt)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'audience' && (
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Visibility</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{job.visibilityType || 'Public'}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Target Rules</h3>
            {job.targetRules && job.targetRules.length > 0 ? (
              <div className="space-y-2">
                {job.targetRules.map((rule, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{rule.targetType}</span>
                    <span className="text-gray-400">{rule.operator}</span>
                    <span className="text-gray-900 dark:text-white">{rule.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 dark:text-gray-400">No target rules configured. This job is visible to all candidates.</p>
            )}
          </div>

          {job.recruiterNote && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Recruiter Notes</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{job.recruiterNote}</p>
            </div>
          )}
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
