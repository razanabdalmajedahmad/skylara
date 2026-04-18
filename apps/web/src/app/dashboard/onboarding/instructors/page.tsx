'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useSegmentContext } from '@/lib/onboarding/useSegmentContext';
import {
  StatusBadge, PercentBadge, SearchInput, FilterChips, PageLoading, SectionCard, SubTabs, EmptyState, BoolIcon, ProgressBar,
} from '@/components/onboarding/shared';
import type { CoachApplication, FilterChip, SubTab } from '@/lib/onboarding/types';
import {
  ClipboardList, FileText, FileSignature, HeartPulse, Award, Dumbbell, Target, ShieldCheck, Bell, History,
  Upload, CheckCircle2, AlertCircle, Clock, ExternalLink, Link as LinkIcon, BadgeCheck, X,
} from 'lucide-react';
import Link from 'next/link';

// ── Sub-tab config ──────────────────────────────────────
const SUB_TABS: SubTab[] = [
  { id: 'applications', label: 'Applications', icon: <ClipboardList className="w-3.5 h-3.5" /> },
  { id: 'documents', label: 'Documents', icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'waivers', label: 'Waivers', icon: <FileSignature className="w-3.5 h-3.5" /> },
  { id: 'medical', label: 'Medical', icon: <HeartPulse className="w-3.5 h-3.5" /> },
  { id: 'licenses', label: 'Licenses & Ratings', icon: <Award className="w-3.5 h-3.5" /> },
  { id: 'skills', label: 'Skills & Experience', icon: <Dumbbell className="w-3.5 h-3.5" /> },
  { id: 'goals', label: 'Goals & Interests', icon: <Target className="w-3.5 h-3.5" /> },
  { id: 'rules', label: 'Review Rules', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="w-3.5 h-3.5" /> },
  { id: 'history', label: 'History', icon: <History className="w-3.5 h-3.5" /> },
];

// ── Interfaces ──────────────────────────────────────────
interface DocItem { id: number; applicationId?: number; source?: 'PROFILE' | 'DECLARATION'; name: string; type: string; status: string; expiryDate: string | null; uploadedAt: string }
interface WaiverItem { id: number; name: string; templateName: string; signedAt: string | null; status: string; version: number }
interface LicenseItem { id: number; type: string; number: string; issuingBody: string; issueDate: string; expiryDate: string | null; status: string }
interface SkillItem { type: string; selfLevel: string; verifiedLevel: string | null; interest: string }
interface CoachGoalFlags { wantsTiRating: boolean; wantsExaminerPath: boolean; wantsEvents: boolean; wantsCamps: boolean; wantsCompetitionCoaching: boolean; wantsTunnelCoaching: boolean; wantsAffRating: boolean; wantsFreefly: boolean; wantsWingsuit: boolean; wantsCanopyCoaching: boolean }
interface RuleItem { id: number; name: string; conditions: string; active: boolean; requiredReviewers: number }
interface NotifItem { id: number; channel: string; subject: string; status: string; sentAt: string | null }
interface HistoryItem { id: number; action: string; actor: string; timestamp: string; details: string }

const EMPTY_COACH_GOALS: CoachGoalFlags = {
  wantsTiRating: false,
  wantsExaminerPath: false,
  wantsEvents: false,
  wantsCamps: false,
  wantsCompetitionCoaching: false,
  wantsTunnelCoaching: false,
  wantsAffRating: false,
  wantsFreefly: false,
  wantsWingsuit: false,
  wantsCanopyCoaching: false,
};

// ── Doc preview popover ────────────────────────────────
function DocPreviewPopover({ uploaded, required, onViewAll, documents }: { uploaded: number; required: number; onViewAll: () => void; documents: DocItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const docs = documents;

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 flex-shrink-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors"
        title="Preview documents"
      >
        <div className="text-xs text-gray-500 dark:text-gray-400">Docs: {uploaded}/{required}</div>
        <ProgressBar value={(uploaded / required) * 100} className="w-20" />
        <FileText className="w-3.5 h-3.5 text-gray-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Document Status</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="max-h-56 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
            {docs.length === 0 && (
              <div className="px-3 py-4 text-xs text-gray-500 dark:text-gray-400">No documents listed for this applicant yet.</div>
            )}
            {docs.map((d) => (
              <div key={d.id} className="px-3 py-2 flex items-center gap-2.5">
                {d.status === 'VERIFIED' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : d.status === 'PENDING' ? (
                  <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{d.name}</p>
                  <p className="text-[10px] text-gray-400">{d.status}{d.expiryDate ? ` · Exp: ${d.expiryDate}` : ''}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
            <button onClick={() => { setOpen(false); onViewAll(); }} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> View All Documents
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-tab panels ──────────────────────────────────────

function ApplicationsPanel({ data, filter, setFilter, filters, handleAction, toast, onNavigateToDocuments, segmentDocuments, registerQuery }: {
  data: CoachApplication[]; filter: string; setFilter: (v: string) => void; filters: FilterChip[];
  handleAction: (id: string, action: 'approve' | 'request_info' | 'reject') => void; toast: string | null;
  onNavigateToDocuments: () => void;
  segmentDocuments: DocItem[];
  registerQuery: string;
}) {
  const [linkToast, setLinkToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'all') return data;
    return data.filter((c) => c.status === filter);
  }, [data, filter]);

  const statusColor = (s: string) => {
    switch (s) {
      case 'APPROVED': case 'LIMITED_APPROVAL': return 'green' as const;
      case 'SUBMITTED': return 'blue' as const;
      case 'UNDER_REVIEW': return 'purple' as const;
      case 'DOCUMENTS_MISSING': return 'yellow' as const;
      default: return 'gray' as const;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <FilterChips chips={filters} active={filter} onToggle={setFilter} />
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(`${window.location.origin}/onboarding/instructors/register${registerQuery}`);
              setLinkToast('Instructor registration link copied!');
            } catch {
              setLinkToast('Failed to copy link');
            }
            setTimeout(() => setLinkToast(null), 3000);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <LinkIcon className="w-3.5 h-3.5" /> Share Instructor Link
        </button>
      </div>
      <div className="space-y-3">
        {filtered.map((c) => (
          <div key={c.id} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 dark:text-white">{c.name}</p>
                  <StatusBadge status={statusColor(c.status)} label={c.status.replace(/_/g, ' ')} />
                  {c.hasExistingRating && <StatusBadge status="green" label="Has Rating" />}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.type} &middot; {c.disciplines.join(', ') || 'No disciplines listed'}</p>
                {c.hasExistingRating && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5" /> Existing rating detected
                  </p>
                )}
              </div>
              <DocPreviewPopover
                uploaded={c.documentsUploaded}
                required={c.documentsRequired}
                onViewAll={onNavigateToDocuments}
                documents={segmentDocuments.filter((d) => d.applicationId === Number(c.id))}
              />
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              {c.status !== 'APPROVED' && c.status !== 'LIMITED_APPROVAL' && (
                <button onClick={() => handleAction(c.id, 'approve')} className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">Approve</button>
              )}
              {c.status !== 'DOCUMENTS_MISSING' && (
                <button onClick={() => handleAction(c.id, 'request_info')} className="px-2.5 py-1 text-xs font-medium rounded-md bg-gray-50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 border border-gray-200 dark:border-slate-700">Request Info</button>
              )}
              {c.status !== 'ARCHIVED' && c.status !== 'SUSPENDED' && (
                <button onClick={() => handleAction(c.id, 'reject')} className="px-2.5 py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 border border-red-200">Archive</button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <EmptyState message="No instructor applications found" />}
      </div>
      {(toast || linkToast) && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50 flex items-center gap-2">
          <CheckCircle2 size={16} />
          {linkToast || toast}
        </div>
      )}
    </div>
  );
}

function DocumentsPanel({ docs, showToast }: { docs: DocItem[]; showToast: (msg: string) => void }) {
  const statusColor = (s: string) => s === 'VERIFIED' ? 'green' : s === 'PENDING' ? 'yellow' : s === 'EXPIRED' ? 'red' : s === 'MISSING' ? 'orange' : 'gray';

  return (
    <SectionCard title="Instructor Documents" action={<button onClick={() => showToast('Upload request sent to instructor')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Upload className="w-3.5 h-3.5" /> Request Upload</button>}>
      <div className="space-y-3">
        {docs.map((d) => (
          <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
            <div className="flex items-center gap-3">
              {d.status === 'VERIFIED' ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : d.status === 'PENDING' ? (
                <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{d.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{d.type}{d.expiryDate ? ` · Expires: ${d.expiryDate}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {d.uploadedAt && <span className="text-xs text-gray-400">{d.uploadedAt}</span>}
              <StatusBadge status={statusColor(d.status)} label={d.status} />
            </div>
          </div>
        ))}
        {docs.length === 0 && <EmptyState message="No documents uploaded yet" />}
      </div>
    </SectionCard>
  );
}

function WaiversPanel({ waivers }: { waivers: WaiverItem[] }) {
  return (
    <SectionCard title="Instructor Waivers & Agreements">
      <div className="space-y-3">
        {waivers.map((w) => (
          <div key={w.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              {w.status === 'SIGNED' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Clock className="w-5 h-5 text-amber-500" />}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{w.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{w.templateName} · v{w.version}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{w.signedAt || 'Not signed'}</span>
              <StatusBadge status={w.status === 'SIGNED' ? 'green' : 'yellow'} label={w.status} />
            </div>
          </div>
        ))}
        {waivers.length === 0 && <EmptyState message="No waivers on file" />}
      </div>
    </SectionCard>
  );
}

function MedicalPanel({ medical }: { medical: { declared: boolean; riskFlags: string[]; reviewedBy: string | null } | null }) {
  const status = medical ?? { declared: false, riskFlags: [] as string[], reviewedBy: null };

  return (
    <SectionCard title="Medical & Fitness Declaration">
      <div className="space-y-4">
        {!status.declared && !status.reviewedBy ? (
          <EmptyState message="No medical or fitness data loaded from the server yet." />
        ) : (
          <>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">Declaration on file</p>
                <p className="text-xs text-green-600 dark:text-green-400">Reviewed by {status.reviewedBy || 'Pending review'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Declaration submitted</span>
                <BoolIcon value={status.declared} />
              </div>
              <div className="flex justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Risk flags</span>
                <span className="font-medium text-gray-900 dark:text-white">{status.riskFlags.length === 0 ? 'None' : status.riskFlags.join(', ')}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </SectionCard>
  );
}

function LicensesPanel({ licenses, showToast }: { licenses: LicenseItem[]; showToast: (msg: string) => void }) {
  return (
    <SectionCard title="Instructor Licenses & Ratings" action={<button onClick={() => showToast('Rating upload initiated')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Upload className="w-3.5 h-3.5" /> Upload Rating</button>}>
      <div className="space-y-3">
        {licenses.map((l) => (
          <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{l.type}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{l.issuingBody} · #{l.number} · Issued: {l.issueDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {l.expiryDate && <span className="text-xs text-gray-400">Exp: {l.expiryDate}</span>}
              <StatusBadge status={l.status === 'ACTIVE' ? 'green' : l.status === 'EXPIRED' ? 'red' : 'yellow'} label={l.status} />
            </div>
          </div>
        ))}
        {licenses.length === 0 && <EmptyState message="No licenses or ratings on file" />}
      </div>
    </SectionCard>
  );
}

function SkillsPanel({ skills }: { skills: SkillItem[] }) {
  return (
    <SectionCard title="Coaching Specialties & Experience">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
              <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Discipline</th>
              <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Self-Assessed</th>
              <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Verified</th>
              <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Interest</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {skills.map((s) => (
              <tr key={s.type}>
                <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{s.type}</td>
                <td className="px-3 py-2 text-center"><StatusBadge status={s.selfLevel === 'None' ? 'gray' : s.selfLevel === 'Beginner' ? 'yellow' : s.selfLevel === 'Intermediate' ? 'blue' : 'green'} label={s.selfLevel} /></td>
                <td className="px-3 py-2 text-center">{s.verifiedLevel ? <StatusBadge status="green" label={s.verifiedLevel} /> : <span className="text-xs text-gray-400">--</span>}</td>
                <td className="px-3 py-2 text-center"><StatusBadge status={s.interest === 'High' ? 'green' : s.interest === 'Medium' ? 'yellow' : 'gray'} label={s.interest} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function GoalsPanel({ goals }: { goals: CoachGoalFlags }) {
  const flags = [
    { key: 'wantsTiRating', label: 'Wants TI Rating', value: goals.wantsTiRating },
    { key: 'wantsExaminerPath', label: 'Examiner Pathway', value: goals.wantsExaminerPath },
    { key: 'wantsEvents', label: 'Events & Boogies', value: goals.wantsEvents },
    { key: 'wantsCamps', label: 'Coaching Camps', value: goals.wantsCamps },
    { key: 'wantsCompetitionCoaching', label: 'Competition Coaching', value: goals.wantsCompetitionCoaching },
    { key: 'wantsTunnelCoaching', label: 'Tunnel Coaching', value: goals.wantsTunnelCoaching },
    { key: 'wantsAffRating', label: 'AFF Rating', value: goals.wantsAffRating },
    { key: 'wantsFreefly', label: 'Freefly Coaching', value: goals.wantsFreefly },
    { key: 'wantsWingsuit', label: 'Wingsuit Coaching', value: goals.wantsWingsuit },
    { key: 'wantsCanopyCoaching', label: 'Canopy Coaching', value: goals.wantsCanopyCoaching },
  ];

  return (
    <SectionCard title="Goals & Interests">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {flags.map((f) => (
          <div key={f.key} className={`flex items-center gap-2 p-3 rounded-lg border ${f.value ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : 'border-gray-100 dark:border-gray-700'}`}>
            <BoolIcon value={f.value} />
            <span className={`text-sm ${f.value ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>{f.label}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function ReviewRulesPanel({ rules }: { rules: RuleItem[] }) {
  return (
    <SectionCard title="Instructor Review Rules" action={<Link href="/dashboard/onboarding/templates" className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">Templates &amp; rules</Link>}>
      <div className="space-y-3">
        {rules.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{r.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{r.conditions}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{r.requiredReviewers === 0 ? 'Auto' : `${r.requiredReviewers} reviewer(s)`}</span>
              <StatusBadge status={r.active ? 'green' : 'gray'} label={r.active ? 'Active' : 'Disabled'} />
            </div>
          </div>
        ))}
        {rules.length === 0 && <EmptyState message="No review rules configured" />}
      </div>
    </SectionCard>
  );
}

function NotificationsPanel({ notifs }: { notifs: NotifItem[] }) {
  return (
    <SectionCard title="Instructor Notifications">
      <div className="space-y-3">
        {notifs.map((n) => (
          <div key={n.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <StatusBadge status={n.channel === 'EMAIL' ? 'blue' : n.channel === 'PUSH' ? 'purple' : 'green'} label={n.channel} />
              <span className="text-sm text-gray-900 dark:text-white">{n.subject}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{n.sentAt || '--'}</span>
              <StatusBadge status={n.status === 'DELIVERED' ? 'green' : 'yellow'} label={n.status} />
            </div>
          </div>
        ))}
        {notifs.length === 0 && <EmptyState message="No notifications sent" />}
      </div>
    </SectionCard>
  );
}

function HistoryPanel({ history }: { history: HistoryItem[] }) {
  return (
    <SectionCard title="Instructor Activity History">
      <div className="space-y-0">
        {history.map((h, idx) => (
          <div key={h.id} className="flex gap-3 py-3 relative">
            {idx < history.length - 1 && <div className="absolute left-[9px] top-[28px] bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />}
            <div className="w-[18px] h-[18px] rounded-full bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{h.action}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{h.details}</p>
              <p className="text-xs text-gray-400 mt-0.5">{h.actor} · {h.timestamp}</p>
            </div>
          </div>
        ))}
        {history.length === 0 && <EmptyState message="No activity recorded" />}
      </div>
    </SectionCard>
  );
}

// ── Main component ──────────────────────────────────────
export default function InstructorsPage() {
  const { user } = useAuth();
  const registerQuery = user?.dropzoneId ? `?dz=${user.dropzoneId}` : '';
  const [data, setData] = useState<CoachApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState('applications');
  const { ctx, loading: ctxLoading, error: ctxError } = useSegmentContext('instructors');

  const instructorGoalsMerged = useMemo((): CoachGoalFlags => ({
    ...EMPTY_COACH_GOALS,
    ...(ctx?.coachInterests as Partial<CoachGoalFlags> | undefined),
  }), [ctx]);

  const filters: FilterChip[] = [
    { label: 'All', value: 'all' },
    { label: 'Submitted', value: 'SUBMITTED' },
    { label: 'Under Review', value: 'UNDER_REVIEW' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Docs Missing', value: 'DOCUMENTS_MISSING' },
  ];

  const fetchData = useCallback(async () => {
    try {
      const res = await apiGet<{ success: boolean; data: any[] }>('/onboarding/instructors');
      const raw = Array.isArray(res) ? res : res.data || [];
      setData(raw.map((c: any) => ({
        id: String(c.id),
        name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email,
        type: c.applicationType || 'COACH',
        disciplines: Array.isArray(c.disciplines) ? c.disciplines : [],
        status: c.status,
        documentsUploaded: c.disciplines?.length || 0,
        documentsRequired: 5,
        hasExistingRating: false,
      })));
    } catch { setData([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (id: string, action: 'approve' | 'request_info' | 'reject') => {
    try {
      if (action === 'approve') {
        await apiPost(`/onboarding/instructors/${id}/approve`, {});
      } else if (action === 'request_info') {
        await apiPost(`/onboarding/instructors/${id}/request-docs`, { notes: 'Additional information requested' });
      } else {
        await apiPatch(`/onboarding/instructors/${id}`, { status: 'ARCHIVED', reviewNotes: 'Application archived' });
      }
      setToast('Instructor application updated');
      setTimeout(() => setToast(null), 3000);
      fetchData();
    } catch {
      setToast('Action failed. Please try again.');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const tabsWithCounts = useMemo(() => SUB_TABS.map((t) => ({
    ...t,
    count: t.id === 'applications' ? data.length : undefined,
  })), [data.length]);

  if (loading) return <PageLoading label="Loading instructor applications..." />;

  return (
    <div className="space-y-4">
      {ctxError && (
        <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {ctxError}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Instructor Onboarding</h2>
      </div>

      <SubTabs tabs={tabsWithCounts} active={activeSubTab} onSwitch={setActiveSubTab} />

      {activeSubTab === 'applications' && (
        <ApplicationsPanel
          data={data}
          filter={filter}
          setFilter={setFilter}
          filters={filters}
          handleAction={handleAction}
          toast={toast}
          onNavigateToDocuments={() => setActiveSubTab('documents')}
          segmentDocuments={(ctx?.documents ?? []) as DocItem[]}
          registerQuery={registerQuery}
        />
      )}
      {activeSubTab === 'documents' && (ctxLoading ? <PageLoading label="Loading documents..." /> : <DocumentsPanel docs={ctx?.documents ?? []} showToast={showToast} />)}
      {activeSubTab === 'waivers' && (ctxLoading ? <PageLoading label="Loading waivers..." /> : <WaiversPanel waivers={ctx?.waivers ?? []} />)}
      {activeSubTab === 'medical' && (ctxLoading ? <PageLoading label="Loading medical..." /> : <MedicalPanel medical={ctx?.medical ?? null} />)}
      {activeSubTab === 'licenses' && (ctxLoading ? <PageLoading label="Loading licenses..." /> : <LicensesPanel licenses={ctx?.licenses ?? []} showToast={showToast} />)}
      {activeSubTab === 'skills' && (ctxLoading ? <PageLoading label="Loading skills..." /> : <SkillsPanel skills={ctx?.skills ?? []} />)}
      {activeSubTab === 'goals' && (ctxLoading ? <PageLoading label="Loading goals..." /> : <GoalsPanel goals={instructorGoalsMerged} />)}
      {activeSubTab === 'rules' && (ctxLoading ? <PageLoading label="Loading rules..." /> : <ReviewRulesPanel rules={ctx?.rules ?? []} />)}
      {activeSubTab === 'notifications' && (ctxLoading ? <PageLoading label="Loading notifications..." /> : <NotificationsPanel notifs={ctx?.notifications ?? []} />)}
      {activeSubTab === 'history' && (ctxLoading ? <PageLoading label="Loading history..." /> : <HistoryPanel history={ctx?.history ?? []} />)}

      {toast && activeSubTab !== 'applications' && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50 flex items-center gap-2">
          <CheckCircle2 size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
