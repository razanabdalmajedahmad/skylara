'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import { useSegmentContext } from '@/lib/onboarding/useSegmentContext';
import {
  StatusBadge, PercentBadge, SearchInput, FilterChips, PageLoading, SectionCard, SubTabs, EmptyState, BoolIcon, ProgressBar,
} from '@/components/onboarding/shared';
import type { CategoryApplication, FilterChip, SubTab } from '@/lib/onboarding/types';
import {
  ClipboardList, FileText, FileSignature, HeartPulse, Award, Dumbbell, Target, ShieldCheck, Bell, History,
  Upload, CheckCircle2, AlertCircle, Clock, ExternalLink,
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
interface DocItem { id: number; name: string; type: string; status: string; expiryDate: string | null; uploadedAt: string }
interface WaiverItem { id: number; name: string; templateName: string; signedAt: string | null; status: string; version: number }
interface LicenseItem { id: number; type: string; number: string; issuingBody: string; issueDate: string; expiryDate: string | null; status: string }
interface SkillItem { type: string; selfLevel: string; verifiedLevel: string | null; interest: string }
interface InterestFlags { wantsALicense: boolean; wantsFreefly: boolean; wantsCompetition: boolean; wantsTunnelTime: boolean; wantsFormationSkydiving: boolean; wantsCanopyPiloting: boolean; wantsVideoEditing: boolean; wantsWingsuit: boolean; wantsInstructorPath: boolean; wantsCoachPath: boolean }
interface RuleItem { id: number; name: string; conditions: string; active: boolean; requiredReviewers: number }
interface NotifItem { id: number; channel: string; subject: string; status: string; sentAt: string | null }
interface HistoryItem { id: number; action: string; actor: string; timestamp: string; details: string }

const EMPTY_INTERESTS: InterestFlags = {
  wantsALicense: false,
  wantsFreefly: false,
  wantsCompetition: false,
  wantsTunnelTime: false,
  wantsFormationSkydiving: false,
  wantsCanopyPiloting: false,
  wantsVideoEditing: false,
  wantsWingsuit: false,
  wantsInstructorPath: false,
  wantsCoachPath: false,
};

// ── Sub-tab panels ──────────────────────────────────────

function ApplicationsPanel({ data, search, setSearch, filter, setFilter, filters, handleAction, toast }: {
  data: CategoryApplication[]; search: string; setSearch: (v: string) => void;
  filter: string; setFilter: (v: string) => void; filters: FilterChip[];
  handleAction: (id: string, action: 'approve' | 'request_info' | 'reject') => void; toast: string | null;
}) {
  const filtered = useMemo(() => {
    let d = data;
    if (search) d = d.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase()));
    if (filter !== 'all') d = d.filter((a) => a.status === filter);
    return d;
  }, [data, search, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search students..." /></div>
        <FilterChips chips={filters} active={filter} onToggle={setFilter} />
      </div>
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Template</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Progress</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Steps</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Submitted</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3"><div className="font-medium text-gray-900 dark:text-white">{a.name}</div><div className="text-xs text-gray-500 dark:text-gray-400">{a.email}</div></td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.template}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={a.status === 'APPROVED' ? 'green' : a.status === 'IN_PROGRESS' ? 'blue' : a.status === 'SUBMITTED' ? 'yellow' : 'gray'} label={a.status} /></td>
                  <td className="px-4 py-3 text-center"><PercentBadge value={a.progress} /></td>
                  <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{a.stepsCompleted}/{a.stepsTotal}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {a.status !== 'APPROVED' && <button onClick={() => handleAction(a.id, 'approve')} className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">Approve</button>}
                      {a.status !== 'DOCUMENTS_MISSING' && <button onClick={() => handleAction(a.id, 'request_info')} className="px-2.5 py-1 text-xs font-medium rounded-md bg-gray-50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 border border-gray-200 dark:border-slate-700">Request Info</button>}
                      {a.status !== 'REJECTED' && <button onClick={() => handleAction(a.id, 'reject')} className="px-2.5 py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 border border-red-200">Reject</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">No students found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {toast && <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>}
    </div>
  );
}

function DocumentsPanel({ docs, showToast }: { docs: DocItem[]; showToast: (msg: string) => void }) {
  const statusColor = (s: string) => s === 'VERIFIED' ? 'green' : s === 'PENDING' ? 'yellow' : s === 'EXPIRED' ? 'red' : s === 'MISSING' ? 'orange' : 'gray';

  return (
    <SectionCard title="Student Documents" action={<button onClick={() => showToast('Upload request sent to student')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Upload className="w-3.5 h-3.5" /> Request Upload</button>}>
      <div className="space-y-3">
        {docs.map((d) => (
          <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-400" />
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
    <SectionCard title="Waiver Acknowledgements">
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
      </div>
    </SectionCard>
  );
}

function MedicalPanel({ medical }: { medical: { declared: boolean; riskFlags: string[]; reviewedBy: string | null } | null }) {
  const status = medical ?? { declared: false, riskFlags: [] as string[], reviewedBy: null };

  return (
    <SectionCard title="Student Medical Declaration">
      <div className="space-y-4">
        {!status.declared && !status.reviewedBy ? (
          <EmptyState message="No medical data loaded from the server yet." />
        ) : (
          <>
        <div className={`flex items-center gap-3 p-4 rounded-lg border ${status.declared ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'}`}>
          {status.declared ? <CheckCircle2 className="w-6 h-6 text-green-600" /> : <AlertCircle className="w-6 h-6 text-amber-600" />}
          <div>
            <p className={`text-sm font-semibold ${status.declared ? 'text-green-800 dark:text-green-300' : 'text-amber-800 dark:text-amber-300'}`}>
              {status.declared ? 'Medical Declaration Complete' : 'Medical Declaration Pending'}
            </p>
            <p className={`text-xs ${status.declared ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {status.declared ? `Reviewed by ${status.reviewedBy || 'Pending review'}` : 'Student has not submitted medical form'}
            </p>
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
    <SectionCard title="Licenses & Ratings" action={<button onClick={() => showToast('License upload initiated')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Upload className="w-3.5 h-3.5" /> Upload License</button>}>
      <div className="space-y-3">
        {licenses.map((l) => (
          <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{l.type}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{l.issuingBody} · #{l.number}{l.issueDate ? ` · Issued: ${l.issueDate}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {l.expiryDate && <span className="text-xs text-gray-400">Exp: {l.expiryDate}</span>}
              <StatusBadge status={l.status === 'ACTIVE' ? 'green' : l.status === 'EXPIRED' ? 'red' : l.status === 'IN_PROGRESS' ? 'blue' : 'yellow'} label={l.status} />
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
    <SectionCard title="Skills & Experience">
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
                <td className="px-3 py-2 text-center"><StatusBadge status={s.selfLevel === 'None' ? 'gray' : s.selfLevel === 'Beginner' ? 'yellow' : 'blue'} label={s.selfLevel} /></td>
                <td className="px-3 py-2 text-center">{s.verifiedLevel ? <StatusBadge status="green" label={s.verifiedLevel} /> : <span className="text-xs text-gray-400">—</span>}</td>
                <td className="px-3 py-2 text-center"><StatusBadge status={s.interest === 'High' ? 'green' : s.interest === 'Medium' ? 'yellow' : 'gray'} label={s.interest} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function GoalsPanel({ interests }: { interests: InterestFlags }) {
  const flags = [
    { key: 'wantsALicense', label: 'Get A License', value: interests.wantsALicense },
    { key: 'wantsFreefly', label: 'Freefly', value: interests.wantsFreefly },
    { key: 'wantsCompetition', label: 'Competition', value: interests.wantsCompetition },
    { key: 'wantsTunnelTime', label: 'Tunnel Time', value: interests.wantsTunnelTime },
    { key: 'wantsFormationSkydiving', label: 'Formation Skydiving', value: interests.wantsFormationSkydiving },
    { key: 'wantsCanopyPiloting', label: 'Canopy Piloting', value: interests.wantsCanopyPiloting },
    { key: 'wantsVideoEditing', label: 'Video Editing', value: interests.wantsVideoEditing },
    { key: 'wantsWingsuit', label: 'Wingsuit', value: interests.wantsWingsuit },
    { key: 'wantsInstructorPath', label: 'Instructor Pathway', value: interests.wantsInstructorPath },
    { key: 'wantsCoachPath', label: 'Coach Pathway', value: interests.wantsCoachPath },
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
    <SectionCard title="Review Rules" action={<Link href="/dashboard/onboarding/templates" className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">Templates &amp; rules</Link>}>
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
      </div>
    </SectionCard>
  );
}

function NotificationsPanel({ notifs }: { notifs: NotifItem[] }) {
  return (
    <SectionCard title="Onboarding Notifications">
      <div className="space-y-3">
        {notifs.map((n) => (
          <div key={n.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <StatusBadge status={n.channel === 'EMAIL' ? 'blue' : n.channel === 'PUSH' ? 'purple' : 'green'} label={n.channel} />
              <span className="text-sm text-gray-900 dark:text-white">{n.subject}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{n.sentAt || '—'}</span>
              <StatusBadge status={n.status === 'DELIVERED' ? 'green' : 'yellow'} label={n.status} />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function HistoryPanel({ history }: { history: HistoryItem[] }) {
  return (
    <SectionCard title="Activity History">
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
      </div>
    </SectionCard>
  );
}

// ── Main component ──────────────────────────────────────
export default function StudentsPage() {
  const [data, setData] = useState<CategoryApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState('applications');
  const { ctx, loading: ctxLoading, error: ctxError } = useSegmentContext('students');

  const interestsMerged = useMemo((): InterestFlags => ({
    ...EMPTY_INTERESTS,
    ...(ctx?.athleteInterests as Partial<InterestFlags> | undefined),
  }), [ctx]);

  const filters: FilterChip[] = [{ label: 'All', value: 'all' }, { label: 'Approved', value: 'APPROVED' }, { label: 'In Progress', value: 'IN_PROGRESS' }, { label: 'Submitted', value: 'SUBMITTED' }];

  const fetchData = useCallback(async () => {
    try { setData(await apiGet<CategoryApplication[]>('/onboarding/students')); } catch { setData([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (id: string, action: 'approve' | 'request_info' | 'reject') => {
    const statusMap: Record<string, string> = { approve: 'APPROVED', request_info: 'DOCUMENTS_MISSING', reject: 'REJECTED' };
    const labelMap: Record<string, string> = { approve: 'Approved', request_info: 'Info requested', reject: 'Rejected' };
    try {
      await apiPatch(`/onboarding/applications/${id}/status`, { status: statusMap[action] });
      setToast(`Application ${labelMap[action]} successfully`);
      setTimeout(() => setToast(null), 3000);
      fetchData();
    } catch {
      setToast('Action failed. Please try again.');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const tabsWithCounts = useMemo(() => SUB_TABS.map((t) => ({
    ...t,
    count: t.id === 'applications' ? data.length : undefined,
  })), [data.length]);

  if (loading) return <PageLoading label="Loading students..." />;

  return (
    <div className="space-y-4">
      {ctxError && (
        <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {ctxError}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Student Onboarding</h2>
        <button
          onClick={async () => {
            try {
              const link = `${window.location.origin}/onboarding/students/register`;
              await navigator.clipboard.writeText(link);
              setToast('Student registration link copied to clipboard!');
            } catch {
              setToast('Failed to copy link — please try again.');
            }
            setTimeout(() => setToast(null), 3000);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Share Registration Link
        </button>
      </div>

      <SubTabs tabs={tabsWithCounts} active={activeSubTab} onSwitch={setActiveSubTab} />

      {activeSubTab === 'applications' && <ApplicationsPanel data={data} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} filters={filters} handleAction={handleAction} toast={toast} />}
      {activeSubTab === 'documents' && (ctxLoading ? <PageLoading label="Loading documents..." /> : <DocumentsPanel docs={ctx?.documents ?? []} showToast={(msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); }} />)}
      {activeSubTab === 'waivers' && (ctxLoading ? <PageLoading label="Loading waivers..." /> : <WaiversPanel waivers={ctx?.waivers ?? []} />)}
      {activeSubTab === 'medical' && (ctxLoading ? <PageLoading label="Loading medical..." /> : <MedicalPanel medical={ctx?.medical ?? null} />)}
      {activeSubTab === 'licenses' && (ctxLoading ? <PageLoading label="Loading licenses..." /> : <LicensesPanel licenses={ctx?.licenses ?? []} showToast={(msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); }} />)}
      {activeSubTab === 'skills' && (ctxLoading ? <PageLoading label="Loading skills..." /> : <SkillsPanel skills={ctx?.skills ?? []} />)}
      {activeSubTab === 'goals' && (ctxLoading ? <PageLoading label="Loading goals..." /> : <GoalsPanel interests={interestsMerged} />)}
      {activeSubTab === 'rules' && (ctxLoading ? <PageLoading label="Loading rules..." /> : <ReviewRulesPanel rules={ctx?.rules ?? []} />)}
      {activeSubTab === 'notifications' && (ctxLoading ? <PageLoading label="Loading notifications..." /> : <NotificationsPanel notifs={ctx?.notifications ?? []} />)}
      {activeSubTab === 'history' && (ctxLoading ? <PageLoading label="Loading history..." /> : <HistoryPanel history={ctx?.history ?? []} />)}

      {toast && <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>}
    </div>
  );
}
