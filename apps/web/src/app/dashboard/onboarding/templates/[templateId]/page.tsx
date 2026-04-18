'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import { StatusBadge, PageLoading, SectionCard } from '@/components/onboarding/shared';
import type { OnboardingTemplate, StatusColor } from '@/lib/onboarding/types';
import { ArrowLeft, Globe, Mail, Hash, Layers, Copy, ExternalLink, Settings, FileText, Users, BarChart3 } from 'lucide-react';
import Link from 'next/link';

interface TemplateDetailState {
  template: OnboardingTemplate;
  steps: { label: string; required: boolean; orderIndex: number }[];
  applications: { id: string; name: string; statusLabel: string; badge: StatusColor; date: string }[];
}

function formatApplicantName(app: {
  user: { firstName: string | null; lastName: string | null; email: string | null } | null;
  externalContactName?: string | null;
}): string {
  const u = app.user;
  const fromProfile = [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim();
  if (fromProfile) return fromProfile;
  if (app.externalContactName) return app.externalContactName;
  if (u?.email) return u.email;
  return 'Applicant';
}

function formatAppStatus(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Draft',
    IN_PROGRESS: 'In progress',
    SUBMITTED: 'Submitted',
    UNDER_REVIEW: 'Under review',
    DOCUMENTS_MISSING: 'Documents missing',
    APPROVED: 'Approved',
    CONDITIONALLY_APPROVED: 'Conditionally approved',
    REJECTED: 'Rejected',
    EXPIRED: 'Expired',
    WITHDRAWN: 'Withdrawn',
  };
  return labels[status] || status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function mapStatusToBadge(status: string): StatusColor {
  if (status === 'APPROVED' || status === 'CONDITIONALLY_APPROVED') return 'green';
  if (status === 'IN_PROGRESS') return 'blue';
  if (status === 'SUBMITTED' || status === 'UNDER_REVIEW') return 'yellow';
  if (status === 'REJECTED') return 'red';
  if (status === 'EXPIRED' || status === 'WITHDRAWN') return 'gray';
  return 'gray';
}

function mapDetail(raw: Record<string, unknown>): TemplateDetailState {
  const stepsRaw = (raw.steps as Array<{ label: string; required: boolean; orderIndex: number }> | undefined) ?? [];
  const appsRaw = (raw.applications as Array<{
    id: number;
    status: string;
    createdAt: string;
    user: { firstName: string | null; lastName: string | null; email: string | null } | null;
    externalContactName?: string | null;
  }> | undefined) ?? [];

  const count =
    typeof raw.applicationsCount === 'number'
      ? raw.applicationsCount
      : ((raw._count as { applications?: number } | undefined)?.applications ?? 0);

  return {
    template: {
      id: raw.uuid as string,
      name: raw.name as string,
      category: raw.category as string,
      flowKey: raw.flowKey as string,
      accessMode: raw.accessMode as OnboardingTemplate['accessMode'],
      status: raw.status as OnboardingTemplate['status'],
      applicationsCount: count,
      completionRate: typeof raw.completionRate === 'number' ? raw.completionRate : 0,
      externalSlug: (raw.externalSlug as string | null) ?? null,
      version: raw.version as number,
    },
    steps: [...stepsRaw].sort((a, b) => a.orderIndex - b.orderIndex),
    applications: appsRaw.map((a) => ({
      id: String(a.id),
      name: formatApplicantName(a),
      statusLabel: formatAppStatus(a.status),
      badge: mapStatusToBadge(a.status),
      date: new Date(a.createdAt).toISOString().slice(0, 10),
    })),
  };
}

export default function TemplateDetailPage() {
  const params = useParams();
  const templateId = params.templateId as string;
  const [detail, setDetail] = useState<TemplateDetailState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const raw = await apiGet<Record<string, unknown>>(`/onboarding/templates/${templateId}`);
        if (!cancelled) setDetail(mapDetail(raw));
      } catch {
        if (!cancelled) {
          setDetail(null);
          setLoadError('Could not load this template. Check your connection or permissions.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  if (loading) return <PageLoading label="Loading template..." />;

  if (loadError || !detail) {
    return (
      <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/50 dark:bg-amber-950/30">
        <p className="text-sm text-amber-900 dark:text-amber-100">{loadError}</p>
        <Link href="/dashboard/onboarding/templates" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
          <ArrowLeft className="w-4 h-4" /> Back to templates
        </Link>
      </div>
    );
  }

  const { template, steps, applications } = detail;

  const accessIcon = (mode: string) => {
    switch (mode) {
      case 'PUBLIC':
        return <Globe className="w-4 h-4 text-green-500" />;
      case 'INVITE_ONLY':
        return <Mail className="w-4 h-4 text-blue-500" />;
      case 'TOKEN':
        return <Hash className="w-4 h-4 text-purple-500" />;
      case 'INTERNAL_ONLY':
        return <Layers className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/onboarding/templates" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{template.name}</h2>
            <StatusBadge status={template.status === 'ACTIVE' ? 'green' : template.status === 'DRAFT' ? 'yellow' : 'gray'} label={template.status} />
            <span className="text-xs text-gray-400">v{template.version}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status="blue" label={template.category} />
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              {accessIcon(template.accessMode)} {template.accessMode.replace('_', ' ').toLowerCase()}
            </div>
            <span className="text-xs text-gray-400">Flow: {template.flowKey}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/join/${template.externalSlug || templateId}/${template.flowKey}`);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Copy className="w-4 h-4" /> Copy Link
          </button>
          {template.externalSlug && (
            <a
              href={`/join/${template.externalSlug}/${template.flowKey}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ExternalLink className="w-4 h-4" /> Preview
            </a>
          )}
          <Link href={`/dashboard/onboarding/templates/${templateId}/builder`} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Settings className="w-4 h-4" /> Edit Template
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Applications', value: template.applicationsCount, icon: Users },
          { label: 'Completion Rate', value: `${template.completionRate}%`, icon: BarChart3 },
          { label: 'Version', value: `v${template.version}`, icon: FileText },
          { label: 'Flow Key', value: template.flowKey, icon: Settings },
        ].map((c) => {
          const I = c.icon;
          return (
            <div key={c.label} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <I className="w-4 h-4 text-gray-400" />
                <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{c.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard title="Template Steps">
          <div className="space-y-3">
            {steps.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No steps defined yet.</p>
            ) : (
              steps.map((step, i) => (
                <div key={`${step.orderIndex}-${i}`} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <span className="text-sm text-gray-900 dark:text-white flex-1">{step.label}</span>
                  <span className="text-xs text-gray-400">{step.required ? 'Required' : 'Optional'}</span>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Recent Applications">
          <div className="space-y-3">
            {applications.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No applications yet.</p>
            ) : (
              applications.map((app) => (
                <div key={app.id} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{app.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{app.date}</p>
                  </div>
                  <StatusBadge status={app.badge} label={app.statusLabel} />
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
