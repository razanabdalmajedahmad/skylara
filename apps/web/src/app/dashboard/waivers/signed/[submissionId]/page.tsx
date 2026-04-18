'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import {
  ChevronLeft, FileSignature, Download, Mail, AlertTriangle,
  CheckCircle2, Clock, User, Globe, Smartphone, Shield, Calendar,
  FileText, XCircle, RotateCcw, Loader2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubmissionDetail {
  id: string;
  uuid: string;
  templateTitle: string;
  version: number;
  status: string;
  signerType: string;
  signerName: string;
  signerEmail: string;
  signerPhone: string;
  signerIp: string;
  signerUserAgent: string;
  signerCountry: string;
  locale: string;
  isMinor: boolean;
  guardianRequired: boolean;
  guardianName: string | null;
  guardianRelation: string | null;
  sourceChannel: string;
  startedAt: string;
  submittedAt: string;
  signedAt: string;
  eventName: string | null;
  bookingRef: string | null;
  answers: Record<string, any>;
  signatures: { role: string; name: string; method: string; signedAt: string }[];
  reviews: { reviewer: string; status: string; notes: string; reviewedAt: string }[];
  auditTrail: { action: string; actor: string; timestamp: string; details: string }[];
  generatedPdfUrl: string | null;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SignedWaiverDetailPage() {
  const params = useParams<{ submissionId: string }>();
  const router = useRouter();
  const [sub, setSub] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadError(false);
      try {
        const data = await apiGet<any>(`/waivers/submissions/${params.submissionId}`);
        setSub({
          id: String(data.id),
          uuid: data.uuid || params.submissionId,
          templateTitle: data.version?.template?.title || data.version?.titleSnapshot || 'Waiver',
          version: data.version?.version || 1,
          status: data.submissionStatus || 'signed',
          signerType: data.signerType || 'self',
          signerName: data.signerName || 'Unknown',
          signerEmail: data.signerEmail || '',
          signerPhone: data.signerPhone || '',
          signerIp: data.signerIp || '',
          signerUserAgent: data.signerUserAgent || '',
          signerCountry: data.signerCountry || '',
          locale: data.locale || 'en',
          isMinor: data.isMinor || false,
          guardianRequired: data.guardianRequired || false,
          guardianName: data.guardianName || null,
          guardianRelation: data.guardianRelation || null,
          sourceChannel: data.sourceChannel || 'WEB',
          startedAt: data.startedAt || data.createdAt || '',
          submittedAt: data.submittedAt || '',
          signedAt: data.submittedAt || '',
          eventName: data.eventName || null,
          bookingRef: data.bookingRef || null,
          answers: data.answersJson || {},
          signatures: (data.signatures || []).map((s: any) => ({
            role: s.signerType || 'participant',
            name: s.signatureData || '',
            method: s.signatureMethod || 'TYPED',
            signedAt: s.createdAt || '',
          })),
          reviews: (data.reviews || []).map((r: any) => ({
            reviewer: `User ${r.reviewerUserId}`,
            status: r.status,
            notes: r.notes || '',
            reviewedAt: r.createdAt || '',
          })),
          auditTrail: [],
          generatedPdfUrl: null,
        });
        // Load audit trail for this submission's template
        try {
          const audit = await apiGet<any[]>(`/waivers/audit`);
          if (Array.isArray(audit)) {
            const relevant = audit.filter((a: any) => a.submissionId === parseInt(params.submissionId));
            setSub((prev) => prev ? { ...prev, auditTrail: relevant.map((a: any) => ({
              action: a.action || '',
              actor: a.actorUserId ? `User ${a.actorUserId}` : 'System',
              timestamp: a.createdAt || '',
              details: typeof a.details === 'object' ? Object.entries(a.details).map(([k, v]) => `${k}: ${v}`).join(', ') : String(a.details || ''),
            })) } : prev);
          }
        } catch {}
      } catch {
        setSub(null);
        setLoadError(true);
      }
      setLoading(false);
    })();
  }, [params.submissionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center"><Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" /><p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading submission...</p></div>
      </div>
    );
  }

  if (loadError || !sub) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <p className="mt-3 text-gray-700 dark:text-gray-300">This submission could not be loaded.</p>
          <Link href="/dashboard/waivers" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">Back to waiver center</Link>
        </div>
      </div>
    );
  }

  const statusColor = (s: string) => {
    switch (s) { case 'signed': return 'bg-green-100 text-green-800'; case 'submitted': return 'bg-blue-100 text-blue-800'; case 'invalidated': return 'bg-red-100 text-red-800'; case 'reviewed': return 'bg-purple-100 text-purple-800'; default: return 'bg-gray-100 text-gray-600'; }
  };

  const actionIcon = (a: string) => {
    switch (a) { case 'SIGNED': return <FileSignature className="w-4 h-4 text-green-500" />; case 'OPENED': return <Globe className="w-4 h-4 text-blue-500" />; case 'REQUEST_SENT': return <Mail className="w-4 h-4 text-purple-500" />; case 'PDF_GENERATED': return <FileText className="w-4 h-4 text-orange-500" />; default: return <Clock className="w-4 h-4 text-gray-400" />; }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">{sub.signerName}</h1>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(sub.status)}`}>{sub.status}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{sub.templateTitle} &middot; v{sub.version} &middot; {sub.uuid}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"><Download className="w-4 h-4" /> Print / PDF</button>
              <button onClick={async () => { try { await apiPost(`/waivers/send`, { templateId: 0, channel: 'EMAIL', recipients: [{ email: sub.signerEmail, name: sub.signerName }] }); } catch {} }} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"><Mail className="w-4 h-4" /> Resend</button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Signer information */}
            <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Signer Information</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gray-500 dark:text-gray-400">Name</p><p className="font-medium text-gray-900 dark:text-white">{sub.signerName}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">Email</p><p className="font-medium text-gray-900 dark:text-white">{sub.signerEmail}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">Phone</p><p className="font-medium text-gray-900 dark:text-white">{sub.signerPhone}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">Country</p><p className="font-medium text-gray-900 dark:text-white">{sub.signerCountry}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">IP Address</p><p className="font-mono text-xs text-gray-700 dark:text-gray-300">{sub.signerIp}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">Device</p><p className="text-xs text-gray-700 dark:text-gray-300 truncate">{sub.signerUserAgent}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">Channel</p><p className="font-medium text-gray-900 dark:text-white">{sub.sourceChannel}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">Signer Type</p><p className="font-medium text-gray-900 dark:text-white">{sub.signerType}</p></div>
                {sub.isMinor && <div><p className="text-gray-500 dark:text-gray-400">Minor</p><p className="font-medium text-red-600">Yes - Guardian required</p></div>}
                {sub.guardianName && <div><p className="text-gray-500 dark:text-gray-400">Guardian</p><p className="font-medium text-gray-900 dark:text-white">{sub.guardianName} ({sub.guardianRelation})</p></div>}
              </div>
            </div>

            {/* Answers */}
            <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Form Answers</h2>
              <div className="space-y-2">
                {Object.entries(sub.answers).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Signatures */}
            <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Signatures</h2>
              {sub.signatures.map((sig, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                  <FileSignature className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{sig.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{sig.role} &middot; {sig.method} &middot; {new Date(sig.signedAt).toLocaleString()}</p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Timeline */}
            <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Timeline</h2>
              <div className="space-y-1">
                <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Started</span><span className="text-gray-900 dark:text-white">{new Date(sub.startedAt).toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Submitted</span><span className="text-gray-900 dark:text-white">{new Date(sub.submittedAt).toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Signed</span><span className="text-gray-900 dark:text-white">{new Date(sub.signedAt).toLocaleString()}</span></div>
              </div>
            </div>

            {/* Linked records */}
            <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Linked Records</h2>
              <div className="space-y-2 text-sm">
                {sub.bookingRef && <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Booking</span><span className="text-blue-600 dark:text-blue-400 font-mono">{sub.bookingRef}</span></div>}
                {sub.eventName && <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Event</span><span className="text-gray-900 dark:text-white">{sub.eventName}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Template</span><span className="text-gray-900 dark:text-white">v{sub.version}</span></div>
              </div>
            </div>

            {/* Audit trail */}
            <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Audit Trail</h2>
              <div className="space-y-3">
                {sub.auditTrail.map((entry, i) => (
                  <div key={i} className="flex items-start gap-3">
                    {actionIcon(entry.action)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{entry.details}</p>
                      <p className="text-[10px] text-gray-400">{entry.actor} &middot; {new Date(entry.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin actions */}
            <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Admin Actions</h2>
              <div className="space-y-2">
                <button onClick={async () => { try { await apiPost(`/waivers/send`, { templateId: 0, channel: 'EMAIL', recipients: [{ email: sub.signerEmail, name: sub.signerName }] }); } catch {} }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"><Mail className="w-4 h-4" /> Resend Confirmation</button>
                <button onClick={() => { window.print(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"><Download className="w-4 h-4" /> Print / Save PDF</button>
                <button onClick={async () => { if (!confirm('Are you sure you want to invalidate this waiver? This action cannot be undone.')) return; try { await apiPost(`/waivers/submissions/${params.submissionId}/review`, { status: 'invalidated', notes: 'Invalidated by admin' }); setSub((prev) => prev ? { ...prev, status: 'invalidated' } : prev); } catch {} }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"><XCircle className="w-4 h-4" /> Invalidate Waiver</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
