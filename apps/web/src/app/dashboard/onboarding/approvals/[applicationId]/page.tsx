'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import { StatusBadge, SectionCard, ProgressBar, PageLoading } from '@/components/onboarding/shared';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface ApprovalDetail {
  id: string;
  personName: string;
  email: string;
  itemType: string;
  description: string;
  submittedAt: string;
  priority: string;
  template: string;
  progress: number;
  timeline: { action: string; date: string; actor: string }[];
  notes: string;
}

export default function ApprovalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.applicationId as string;
  const [item, setItem] = useState<ApprovalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet<any>(`/onboarding/applications/${applicationId}`);
        const u = data.user;
        setItem({
          id: String(data.uuid ?? data.id ?? applicationId),
          personName: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : data.externalContactName || 'Guest',
          email: u?.email || data.externalContactEmail || '',
          itemType: data.template?.category || 'application',
          description: data.template?.name || 'Application Review',
          submittedAt: data.submittedAt || data.createdAt || '',
          priority: 'normal',
          template: data.template?.name || '',
          progress: data.completionPercent ?? 0,
          timeline: [],
          notes: data.reviewNotes || '',
        });
      } catch {
        setItem(null);
      }
      setLoading(false);
    })();
  }, [applicationId]);

  const handleStatusUpdate = async (status: string) => {
    setSaving(true);
    try {
      await apiPatch(`/onboarding/applications/${applicationId}/status`, {
        status,
        ...(adminNote && { reviewNotes: adminNote }),
      });
      router.push('/dashboard/onboarding/approvals');
    } catch {}
    setSaving(false);
  };

  if (loading) return <PageLoading label="Loading approval..." />;
  if (!item) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600 dark:text-red-400">Could not load this approval.</p>
        <Link href="/dashboard/onboarding/approvals" className="text-sm text-blue-600 hover:underline">Back to approvals</Link>
      </div>
    );
  }

  const priorityColor = item.priority === 'urgent' ? 'red' : item.priority === 'high' ? 'orange' : 'blue';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/onboarding/approvals" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Review: {item.description}</h2>
            <StatusBadge status={priorityColor} label={item.priority} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{item.personName}{item.email && ` · ${item.email}`}{item.itemType && ` · ${item.itemType}`}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Template</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">{item.template || '—'}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Progress</p>
          <ProgressBar value={item.progress} className="mt-2" />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.progress}%</p>
        </div>
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Submitted</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">{item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {item.timeline.length > 0 && (
          <SectionCard title="Activity Timeline">
            <div className="space-y-3">
              {item.timeline.map((t, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white">{t.action}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.date}{t.actor && ` · ${t.actor}`}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        <SectionCard title="Review Notes">
          {item.notes && <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{item.notes}</p>}
          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="Add admin note..."
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </SectionCard>
      </div>

      <div className="flex gap-3 p-4 bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700">
        <button onClick={() => handleStatusUpdate('APPROVED')} disabled={saving} className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">Approve</button>
        <button onClick={() => handleStatusUpdate('DOCUMENTS_MISSING')} disabled={saving} className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">Request More Info</button>
        <button onClick={() => handleStatusUpdate('REJECTED')} disabled={saving} className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">Reject</button>
      </div>
    </div>
  );
}
