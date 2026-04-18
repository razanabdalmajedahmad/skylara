'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  Archive,
  Download,
  FileSignature,
  Eye,
  Copy,
  ExternalLink,
  Edit3,
  Trash2,
  Send,
  Mail,
  MessageSquare,
  Smartphone,
  QrCode,
  Monitor,
  Loader2,
  RefreshCw,
  X,
  Info,
  ChevronDown,
  ChevronUp,
  Settings,
  BarChart3,
  History,
  Shield,
  Link as LinkIcon,
  Globe,
  Hash,
  Users,
  AlertTriangle,
  Filter,
  MoreVertical,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = 'templates' | 'signed' | 'delivery' | 'review' | 'settings' | 'audit';

interface WaiverTemplate {
  id: string;
  title: string;
  waiverType: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  currentVersion: number;
  sectionsCount: number;
  submissionsCount: number;
  lastPublished: string | null;
  requireMinor: boolean;
  requireMedical: boolean;
}

interface SignedWaiver {
  id: string;
  participantName: string;
  participantEmail: string | null;
  templateTitle: string;
  version: number;
  status: 'SIGNED' | 'EXPIRED' | 'REVOKED' | 'PENDING_SIGNATURE' | 'APPROVED';
  signedAt: string | null;
  expiresAt: string | null;
  sourceChannel: string;
  isMinor: boolean;
  reviewedAt: string | null;
}

interface DeliveryLog {
  id: string;
  templateTitle: string;
  recipientName: string;
  channel: 'EMAIL' | 'WHATSAPP' | 'PUSH' | 'IN_APP';
  status: 'SENT' | 'DELIVERED' | 'OPENED' | 'SIGNED' | 'FAILED';
  sentAt: string;
}

interface AuditEntry {
  id: string;
  action: string;
  details: string;
  actor: string;
  timestamp: string;
}

interface Toast { id: string; message: string; type: 'success' | 'error' | 'info' }

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'signed', label: 'Signed Waivers', icon: FileSignature },
  { id: 'delivery', label: 'Delivery', icon: Send },
  { id: 'review', label: 'Review Queue', icon: Eye },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'audit', label: 'Audit Log', icon: History },
];

// ---------------------------------------------------------------------------
// Reusable components
// ---------------------------------------------------------------------------

function StatusBadge({ status, label }: { status: string; label?: string }) {
  const colorMap: Record<string, string> = {
    PUBLISHED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    SIGNED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    DRAFT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    PENDING_SIGNATURE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    ARCHIVED: 'bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-400',
    EXPIRED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    REVOKED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    SENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    DELIVERED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    OPENED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${colorMap[status] || 'bg-gray-100 text-gray-600'}`}>{label || status.replace(/_/g, ' ')}</span>;
}

function ChannelIcon({ channel }: { channel: string }) {
  switch (channel) {
    case 'EMAIL': return <Mail className="w-4 h-4 text-blue-500" />;
    case 'WHATSAPP': return <MessageSquare className="w-4 h-4 text-green-500" />;
    case 'PUSH': return <Smartphone className="w-4 h-4 text-purple-500" />;
    case 'IN_APP': return <Monitor className="w-4 h-4 text-orange-500" />;
    case 'KIOSK': return <QrCode className="w-4 h-4 text-indigo-500" />;
    case 'WEB': return <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
    default: return <Globe className="w-4 h-4 text-gray-400" />;
  }
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div key={t.id} className={`${t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-blue-600'} text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between gap-3 text-sm`}>
          <span>{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="hover:opacity-80"><X className="w-4 h-4" /></button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function WaiverCenterPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('templates');
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [templates, setTemplates] = useState<WaiverTemplate[]>([]);
  const [signedWaivers, setSignedWaivers] = useState<SignedWaiver[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [orgSlug, setOrgSlug] = useState('skyhigh-aviation');

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tplRes, signedRes, delRes, auditRes, orgRes] = await Promise.allSettled([
        apiGet('/waivers/templates'),
        apiGet('/waivers/submissions'),
        apiGet('/waivers/delivery-logs'),
        apiGet('/waivers/audit'),
        apiGet('/waivers/org-info'),
      ]);
      if (orgRes.status === 'fulfilled' && (orgRes.value as any)?.slug) {
        setOrgSlug((orgRes.value as any).slug);
      }
      if (tplRes.status === 'fulfilled' && Array.isArray(tplRes.value)) {
        setTemplates((tplRes.value as any[]).map((t) => ({
          id: String(t.id),
          title: t.title,
          waiverType: t.waiverType,
          slug: t.slug,
          status: t.status,
          currentVersion: t.currentVersion || t.versions?.[0]?.version || 0,
          sectionsCount: t.versions?.[0]?._count?.sections || 0,
          submissionsCount: t.submissionsCount || 0,
          lastPublished: t.versions?.find((v: any) => v.status === 'PUBLISHED')?.publishedAt || null,
          requireMinor: t.requireMinor || false,
          requireMedical: t.requireMedical || false,
        })));
      } else { setTemplates([]); }
      if (signedRes.status === 'fulfilled' && Array.isArray(signedRes.value)) {
        setSignedWaivers((signedRes.value as any[]).map((s) => ({
          id: String(s.id),
          participantName: s.signerName || 'Unknown',
          participantEmail: s.signerEmail || null,
          templateTitle: s.version?.titleSnapshot || 'Waiver',
          version: s.version?.version || 1,
          status: (s.submissionStatus || 'SIGNED').toUpperCase(),
          signedAt: s.submittedAt || null,
          expiresAt: null,
          sourceChannel: s.sourceChannel || 'WEB',
          isMinor: s.isMinor || false,
          reviewedAt: s.reviewedAt || null,
        })));
      } else { setSignedWaivers([]); }
      if (delRes.status === 'fulfilled' && Array.isArray(delRes.value)) {
        setDeliveryLogs((delRes.value as any[]).map((d) => ({
          id: String(d.id),
          templateTitle: d.templateTitle || `Template #${d.templateId}`,
          recipientName: d.recipientEmail || d.recipientPhone || 'Unknown',
          channel: d.channel,
          status: d.status,
          sentAt: d.createdAt,
        })));
      } else { setDeliveryLogs([]); }
      if (auditRes.status === 'fulfilled' && Array.isArray(auditRes.value)) {
        setAuditEntries((auditRes.value as any[]).map((a) => ({
          id: String(a.id),
          action: a.action,
          details: typeof a.details === 'object' ? Object.entries(a.details).map(([k, v]) => `${k}: ${v}`).join(', ') : String(a.details || ''),
          actor: a.actorUserId ? `User ${a.actorUserId}` : 'System',
          timestamp: a.createdAt,
        })));
      } else { setAuditEntries([]); }
    } catch {
      setTemplates([]);
      setSignedWaivers([]);
      setDeliveryLogs([]);
      setAuditEntries([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const reviewCount = signedWaivers.filter((w) => w.status === 'SIGNED' && !w.reviewedAt).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center"><Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" /><p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading waiver center...</p></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Waiver Center</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Create, publish, sign, and manage digital waivers</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 dark:bg-gray-700 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="-mb-px flex overflow-x-auto gap-1 scrollbar-hide">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const badge = tab.id === 'review' ? reviewCount : undefined;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${isActive ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300'}`}>
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {badge && badge > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'templates' && <TemplatesTab templates={templates} addToast={addToast} orgSlug={orgSlug} />}
        {activeTab === 'signed' && <SignedWaiversTab data={signedWaivers} addToast={addToast} />}
        {activeTab === 'delivery' && <DeliveryTab data={deliveryLogs} />}
        {activeTab === 'review' && <ReviewTab data={signedWaivers.filter((w) => w.status === 'SIGNED' && !w.reviewedAt)} addToast={addToast} />}
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'audit' && <AuditTab data={auditEntries} />}
      </div>

      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Templates Tab
// ---------------------------------------------------------------------------

function TemplatesTab({ templates, addToast, orgSlug }: { templates: WaiverTemplate[]; addToast: (m: string, t?: Toast['type']) => void; orgSlug: string }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    let d = templates;
    if (search) d = d.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== 'all') d = d.filter((t) => t.status === statusFilter);
    return d;
  }, [templates, search, statusFilter]);

  const copySignLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/sign/${orgSlug}/${slug}`);
    addToast('Sign link copied to clipboard');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'PUBLISHED', 'DRAFT', 'ARCHIVED'].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'}`}>{s === 'all' ? 'All' : s}</button>
            ))}
          </div>
        </div>
        <Link href="/dashboard/waivers/templates/new" className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors self-start">
          <Plus className="w-4 h-4" /> New Waiver Template
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((tpl) => (
          <div key={tpl.id} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5 flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">{tpl.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={tpl.status} />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{tpl.waiverType}</span>
                  <span className="text-xs text-gray-400">v{tpl.currentVersion}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div><p className="text-lg font-bold text-gray-900 dark:text-white">{tpl.submissionsCount}</p><p className="text-[11px] text-gray-500 dark:text-gray-400">Signed</p></div>
              <div><p className="text-lg font-bold text-gray-900 dark:text-white">{tpl.sectionsCount}</p><p className="text-[11px] text-gray-500 dark:text-gray-400">Sections</p></div>
              <div>
                <div className="flex items-center gap-1">
                  {tpl.requireMinor && <span title="Minor support"><Shield className="w-3.5 h-3.5 text-blue-500" /></span>}
                  {tpl.requireMedical && <span title="Medical required"><AlertCircle className="w-3.5 h-3.5 text-orange-500" /></span>}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Features</p>
              </div>
            </div>

            {tpl.lastPublished && <p className="text-xs text-gray-400 mb-3">Published: {new Date(tpl.lastPublished).toLocaleDateString()}</p>}

            <div className="flex items-center gap-2 mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
              {tpl.status === 'PUBLISHED' && (
                <>
                  <button onClick={() => copySignLink(tpl.slug)} className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                    <Copy className="w-3.5 h-3.5" /> Copy Link
                  </button>
                  <a href={`/sign/${orgSlug}/${tpl.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" /> Preview
                  </a>
                  <Link href={`/dashboard/waivers/send?templateId=${tpl.id}`} className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                    <Send className="w-3.5 h-3.5" /> Send
                  </Link>
                </>
              )}
              <Link href={`/dashboard/waivers/templates/${tpl.id}/versions`} className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                <Clock className="w-3.5 h-3.5" /> Versions
              </Link>
              <Link href={`/dashboard/waivers/templates/${tpl.id}/builder`} className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ml-auto">
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Signed Waivers Tab
// ---------------------------------------------------------------------------

function SignedWaiversTab({ data, addToast }: { data: SignedWaiver[]; addToast: (m: string, t?: Toast['type']) => void }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    let d = data;
    if (search) d = d.filter((w) => w.participantName.toLowerCase().includes(search.toLowerCase()) || w.templateTitle.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== 'all') d = d.filter((w) => w.status === statusFilter);
    return d;
  }, [data, search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or waiver..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'SIGNED', 'PENDING_SIGNATURE', 'EXPIRED', 'REVOKED'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'}`}>{s === 'all' ? 'All' : s.replace(/_/g, ' ')}</button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Participant</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Waiver</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Version</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Channel</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Signed</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Expires</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => router.push(`/dashboard/waivers/signed/${w.id}`)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <Link href={`/dashboard/waivers/signed/${w.id}`} className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">{w.participantName}</Link>
                        {w.participantEmail && <p className="text-xs text-gray-500 dark:text-gray-400">{w.participantEmail}</p>}
                      </div>
                      {w.isMinor && <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded">Minor</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">{w.templateTitle}</td>
                  <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400 text-xs">v{w.version}</td>
                  <td className="px-4 py-3 text-center"><ChannelIcon channel={w.sourceChannel} /></td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={w.status} /></td>
                  <td className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400">{w.signedAt ? new Date(w.signedAt).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400">{w.expiresAt || 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delivery Tab
// ---------------------------------------------------------------------------

function DeliveryTab({ data }: { data: DeliveryLog[] }) {
  return (
    <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Delivery Logs</h2>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Waiver</th>
          <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Recipient</th>
          <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Channel</th>
          <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
          <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Sent</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {data.map((dl) => (
            <tr key={dl.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td className="px-4 py-3 text-gray-900 dark:text-white text-xs">{dl.templateTitle}</td>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{dl.recipientName}</td>
              <td className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1"><ChannelIcon channel={dl.channel} /><span className="text-xs">{dl.channel}</span></div></td>
              <td className="px-4 py-3 text-center"><StatusBadge status={dl.status} /></td>
              <td className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400">{new Date(dl.sentAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review Tab
// ---------------------------------------------------------------------------

function ReviewTab({ data, addToast }: { data: SignedWaiver[]; addToast: (m: string, t?: Toast['type']) => void }) {
  const [reviewing, setReviewing] = useState<string | null>(null);

  const handleApprove = async (w: SignedWaiver) => {
    setReviewing(w.id);
    try {
      await apiPost(`/waivers/submissions/${w.id}/review`, { status: 'approved' });
      addToast(`Approved waiver for ${w.participantName}`, 'success');
      w.reviewedAt = new Date().toISOString();
    } catch {
      addToast(`Failed to approve waiver`, 'error');
    } finally { setReviewing(null); }
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">All signed waivers have been reviewed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{data.length} signed waiver{data.length !== 1 ? 's' : ''} awaiting review</p>
      {data.map((w) => (
        <div key={w.id} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900 dark:text-white">{w.participantName}</p>
              {w.isMinor && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Minor</span>}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{w.participantEmail}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{w.templateTitle} v{w.version} &middot; Signed via {w.sourceChannel} &middot; {w.signedAt ? new Date(w.signedAt).toLocaleDateString() : ''}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => handleApprove(w)}
              disabled={reviewing === w.id}
              className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >{reviewing === w.id ? 'Approving...' : 'Approve'}</button>
            <Link href={`/dashboard/waivers/signed/${w.id}`} className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">View Details</Link>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings Tab
// ---------------------------------------------------------------------------

function SettingsTab() {
  const [expiry, setExpiry] = useState('12');
  const [minorAge, setMinorAge] = useState('18');
  const [autoRemind, setAutoRemind] = useState('24');
  const [kioskEnabled, setKioskEnabled] = useState(true);
  const [offlineEnabled, setOfflineEnabled] = useState(true);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Waiver Defaults</h3>
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-medium text-gray-900 dark:text-white">Default Expiry Period</p><p className="text-xs text-gray-500 dark:text-gray-400">How long signed waivers remain valid</p></div>
            <select value={expiry} onChange={(e) => setExpiry(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-900 dark:text-white w-full sm:w-auto">
              <option value="12">12 months</option><option value="6">6 months</option><option value="24">24 months</option><option value="0">Never expires</option>
            </select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-medium text-gray-900 dark:text-white">Minor Threshold Age</p><p className="text-xs text-gray-500 dark:text-gray-400">Age below which guardian signature is required</p></div>
            <select value={minorAge} onChange={(e) => setMinorAge(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-900 dark:text-white w-full sm:w-auto">
              <option value="18">18 years</option><option value="16">16 years</option><option value="21">21 years</option>
            </select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-medium text-gray-900 dark:text-white">Auto-remind unsigned waivers</p><p className="text-xs text-gray-500 dark:text-gray-400">Send reminder after X hours if not signed</p></div>
            <select value={autoRemind} onChange={(e) => setAutoRemind(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-900 dark:text-white w-full sm:w-auto">
              <option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option><option value="0">Disabled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Kiosk Mode</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-900 dark:text-white">Enable Kiosk Mode</p><p className="text-xs text-gray-500 dark:text-gray-400">Allow tablet/kiosk signing at the DZ</p></div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={kioskEnabled} onChange={(e) => setKioskEnabled(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white dark:bg-slate-800 after:rounded-full after:h-5 after:w-5 after:transition-all" />
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-900 dark:text-white">Offline Kiosk Support</p><p className="text-xs text-gray-500 dark:text-gray-400">Store signatures locally and sync when online</p></div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={offlineEnabled} onChange={(e) => setOfflineEnabled(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white dark:bg-slate-800 after:rounded-full after:h-5 after:w-5 after:transition-all" />
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <Link href="/dashboard/waivers/kiosk" className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <Monitor className="w-4 h-4" /> Open Kiosk Mode
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audit Tab
// ---------------------------------------------------------------------------

function AuditTab({ data }: { data: AuditEntry[] }) {
  const actionColor = (a: string): string => {
    switch (a) {
      case 'PUBLISHED': return 'text-green-600';
      case 'SIGNED': return 'text-blue-600';
      case 'REVOKED': return 'text-red-600';
      case 'CREATED': return 'text-purple-600';
      case 'SENT': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Audit Log</h2>
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-gray-700">
        {data.map((entry) => (
          <li key={entry.id} className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <span className={`text-xs font-bold uppercase flex-shrink-0 ${actionColor(entry.action)}`}>{entry.action}</span>
            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 break-words">{entry.details}</span>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <span className="text-xs text-gray-400 whitespace-nowrap">{entry.actor}</span>
              <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(entry.timestamp).toLocaleString()}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
