'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import { StatusBadge, ProgressBar, BoolIcon, SectionCard, PageLoading } from '@/components/onboarding/shared';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';

interface AppDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  template: string;
  category: string;
  status: string;
  submittedAt: string;
  progress: number;
  steps: { name: string; completed: boolean; completedAt: string | null }[];
  documents: { name: string; status: string }[];
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.applicationId as string;
  const [app, setApp] = useState<AppDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setFetchError(null);
      try {
        const data = await apiGet<any>(`/onboarding/applications/${applicationId}`);
        const u = data.user;
        setApp({
          id: String(data.uuid ?? data.id ?? applicationId),
          name: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : data.externalContactName || 'Guest',
          email: u?.email || data.externalContactEmail || '',
          phone: u?.phone || data.externalContactPhone || '',
          template: data.template?.name || '',
          category: data.template?.category || '',
          status: data.status || 'IN_PROGRESS',
          submittedAt: data.submittedAt || data.createdAt || '',
          progress: data.completionPercent ?? data.progress ?? 0,
          steps: (data.stepResponses || []).map((sr: any) => ({
            name: sr.step?.label || sr.stepId || 'Step',
            completed: !!sr.completed,
            completedAt: sr.completedAt || null,
          })),
          documents: (data.applicationDocuments || []).map((d: any) => ({ name: d.title, status: d.verificationStatus })),
        });
      } catch {
        setApp(null);
        setFetchError('Could not load this application.');
      }
      setLoading(false);
    })();
  }, [applicationId]);

  const handleStatusUpdate = async (status: string) => {
    setSaving(true);
    try {
      await apiPatch(`/onboarding/applications/${applicationId}/status`, { status });
      router.push('/dashboard/onboarding/approvals');
    } catch {}
    setSaving(false);
  };

  if (loading) return <PageLoading label="Loading application..." />;
  if (fetchError || !app) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600 dark:text-red-400">{fetchError || 'Application not found.'}</p>
        <Link href="/dashboard/onboarding/approvals" className="text-sm text-blue-600 hover:underline">Back to approvals</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/onboarding/approvals" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{app.name}</h2>
            <StatusBadge status="purple" label={app.status} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{app.email}{app.phone && ` · ${app.phone}`}{app.template && ` · ${app.template}`}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Template</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">{app.template || '—'}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Category</p>
          <StatusBadge status="blue" label={app.category || '—'} />
        </div>
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Progress</p>
          <ProgressBar value={app.progress} className="mt-2" />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{app.progress}% complete</p>
        </div>
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Submitted</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">{app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {app.steps.length > 0 && (
          <SectionCard title="Application Steps">
            <div className="space-y-3">
              {app.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <BoolIcon value={step.completed} />
                  <span className={`text-sm flex-1 ${step.completed ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{step.name}</span>
                  <span className="text-xs text-gray-400">{step.completedAt || 'Pending'}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {app.documents.length > 0 && (
          <SectionCard title="Documents">
            <div className="space-y-3">
              {app.documents.map((doc, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-900 dark:text-white flex-1">{doc.name}</span>
                  <StatusBadge status={doc.status === 'verified' ? 'green' : 'yellow'} label={doc.status} />
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={() => handleStatusUpdate('APPROVED')} disabled={saving} className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">Approve Application</button>
        <button onClick={() => handleStatusUpdate('DOCUMENTS_MISSING')} disabled={saving} className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">Request More Info</button>
        <button onClick={() => handleStatusUpdate('REJECTED')} disabled={saving} className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">Reject</button>
      </div>
    </div>
  );
}
