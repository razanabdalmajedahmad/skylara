'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import {
  Briefcase,
  FileText,
  Video,
  UserCheck,
  Plus,
  ArrowRight,
  Loader2,
  Inbox,
  TrendingUp,
  Clock,
} from 'lucide-react';

interface OverviewStats {
  activeJobs: number;
  totalApplications: number;
  interviewsThisWeek: number;
  hiredThisMonth: number;
}

interface RecentApplication {
  id: string;
  applicantName: string;
  applicantEmail: string;
  jobTitle: string;
  stage: string;
  submittedAt: string;
}

interface ActiveJob {
  id: string;
  title: string;
  status: string;
  roleCategory: string;
  applicationsCount: number;
  createdAt: string;
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

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-300',
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PAUSED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  CLOSED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ARCHIVED: 'bg-gray-100 text-gray-500 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-400',
};

function formatStage(stage: string): string {
  if (!stage) return '';
  return stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export default function CareersOverviewPage() {
  const router = useRouter();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [recentApps, setRecentApps] = useState<RecentApplication[]>([]);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [jobsRes, appsRes] = await Promise.allSettled([
          apiGet<{ data: ActiveJob[]; total: number }>('/careers/jobs?status=PUBLISHED&limit=10'),
          apiGet<{ data: RecentApplication[]; total: number }>('/careers/applications?limit=5&sort=submittedAt:desc'),
        ]);

        const jobs = jobsRes.status === 'fulfilled' ? jobsRes.value.data || [] : [];
        const apps = appsRes.status === 'fulfilled' ? appsRes.value.data || [] : [];

        setActiveJobs(jobs);
        setRecentApps(apps);

        const allJobsRes = await apiGet<{ data: any[]; total: number }>('/careers/jobs').catch(() => ({ data: [], total: 0 }));
        const allJobs = allJobsRes.data || [];
        const allAppsRes = await apiGet<{ data: any[]; total: number }>('/careers/applications').catch(() => ({ data: [], total: 0 }));

        const interviewsRes = await apiGet<{ data: any[]; total: number }>('/careers/interviews?status=SCHEDULED').catch(() => ({ data: [], total: 0 }));

        const publishedCount = allJobs.filter((j: any) => j.status === 'PUBLISHED').length;
        const hiredCount = (allAppsRes.data || []).filter((a: any) => a.stage === 'HIRED').length;

        setStats({
          activeJobs: publishedCount,
          totalApplications: allAppsRes.total || 0,
          interviewsThisWeek: interviewsRes.total || (interviewsRes.data || []).length,
          hiredThisMonth: hiredCount,
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load careers overview');
        setStats({ activeJobs: 0, totalApplications: 0, interviewsThisWeek: 0, hiredThisMonth: 0 });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading careers overview...</span>
      </div>
    );
  }

  const statCards = [
    { label: 'Active Jobs', value: stats?.activeJobs ?? 0, icon: Briefcase, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Total Applications', value: stats?.totalApplications ?? 0, icon: FileText, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Interviews This Week', value: stats?.interviewsThisWeek ?? 0, icon: Video, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' },
    { label: 'Hired This Month', value: stats?.hiredThisMonth ?? 0, icon: UserCheck, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{card.value.toLocaleString()}</p>
                </div>
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => router.push('/dashboard/careers/jobs/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Post New Job
        </button>
        <button
          onClick={() => router.push('/dashboard/careers/applications')}
          className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <FileText className="w-4 h-4" /> View Applications
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Applications */}
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Applications</h2>
            <button
              onClick={() => router.push('/dashboard/careers/applications')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="px-6 pb-6">
            {recentApps.length === 0 ? (
              <div className="text-center py-8">
                <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No applications received yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-1">Applications will appear here once candidates apply</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentApps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => router.push(`/dashboard/careers/applications/${app.id}`)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{app.applicantName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{app.jobTitle}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${STAGE_COLORS[app.stage] || 'bg-gray-100 text-gray-600'}`}>
                        {formatStage(app.stage)}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 dark:text-gray-400">{formatDate(app.submittedAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Jobs */}
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Active Jobs</h2>
            <button
              onClick={() => router.push('/dashboard/careers/jobs')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="px-6 pb-6">
            {activeJobs.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="w-10 h-10 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No active job postings</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-1">Post a new job to start receiving applications</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeJobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => router.push(`/dashboard/careers/jobs/${job.id}`)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{job.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{job.roleCategory?.replace(/_/g, ' ')}</span>
                        <span className="text-gray-300 dark:text-gray-600 dark:text-gray-400">|</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <FileText className="w-3 h-3" /> {job.applicationsCount ?? 0} applicants
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-600'}`}>
                        {job.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline Summary */}
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" /> Hiring Pipeline
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
          {['APPLIED', 'INITIAL_REVIEW', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'TECHNICAL_EVALUATION', 'FINAL_REVIEW', 'OFFER', 'HIRED', 'REJECTED'].map((stage) => {
            const count = recentApps.filter((a) => a.stage === stage).length;
            return (
              <div key={stage} className="text-center">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${STAGE_COLORS[stage]} text-sm font-bold mb-1`}>
                  {count}
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">{formatStage(stage)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
