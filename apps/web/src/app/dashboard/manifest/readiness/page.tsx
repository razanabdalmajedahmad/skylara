'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  FileText,
  CreditCard,
  Stethoscope,
  Users,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Plane,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';

interface GateIssue {
  gate: string;
  message: string;
  canOverride?: boolean;
}

interface SlotReadiness {
  slotId: number;
  position: number;
  userId: number;
  userName: string;
  slotType: string;
  weight: number | null;
  readinessState: string;
  failedGates: GateIssue[];
  warningGates: GateIssue[];
}

interface LoadReadiness {
  loadId: number;
  loadNumber: number | null;
  status: string;
  aircraft: string;
  capacity: number;
  scheduledAt: string | null;
  slots: SlotReadiness[];
  readyCount: number;
  blockedCount: number;
  fillPercent: number;
}

interface ReadinessSummary {
  activeLoads: number;
  totalSlots: number;
  totalReady: number;
  totalBlocked: number;
  readinessPercent: number;
}

const READINESS_STYLES: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  ready: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
  missing_waiver: { bg: 'bg-red-100', text: 'text-red-700', icon: FileText },
  missing_documents: { bg: 'bg-amber-100', text: 'text-amber-700', icon: FileText },
  payment_pending: { bg: 'bg-orange-100', text: 'text-orange-700', icon: CreditCard },
  medical_review_needed: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Stethoscope },
  review_needed: { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertTriangle },
  blocked: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
};

const READINESS_LABELS: Record<string, string> = {
  ready: 'Ready',
  missing_waiver: 'Missing Waiver',
  missing_documents: 'Missing Documents',
  payment_pending: 'Payment Pending',
  medical_review_needed: 'Medical Review',
  review_needed: 'Review Needed',
  blocked: 'Blocked',
};

const FALLBACK_SUMMARY: ReadinessSummary = {
  activeLoads: 0, totalSlots: 0, totalReady: 0, totalBlocked: 0, readinessPercent: 0,
};

export default function ManifestReadinessPage() {
  const [board, setBoard] = useState<LoadReadiness[]>([]);
  const [summary, setSummary] = useState<ReadinessSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedLoad, setExpandedLoad] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: { board: LoadReadiness[]; summary: ReadinessSummary } }>('/manifest/readiness');
      if (res?.data?.board) {
        setBoard(res.data.board);
        setSummary(res.data.summary);
      } else {
        setBoard([]);
        setSummary(FALLBACK_SUMMARY);
      }
    } catch {
      setBoard([]);
      setSummary(FALLBACK_SUMMARY);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <RouteGuard allowedRoles={ROLE_GROUPS.OPERATIONS}>
    <div className="min-h-screen bg-gray-50 dark:bg-transparent p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <Link href="/dashboard/manifest" className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white dark:text-gray-400 dark:hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Manifest
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Shield className="w-7 h-7 text-emerald-500" /> Manifest Readiness
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Real-time compliance and readiness for all active loads</p>
          </div>
          <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Summary Strip */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg border p-3">
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Active Loads</p>
              <p className="text-2xl font-bold text-blue-600">{summary.activeLoads}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg border p-3">
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Total Jumpers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalSlots}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg border p-3">
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Ready</p>
              <p className="text-2xl font-bold text-emerald-600">{summary.totalReady}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg border p-3">
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Blocked</p>
              <p className="text-2xl font-bold text-red-600">{summary.totalBlocked}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg border p-3">
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Readiness</p>
              <p className={`text-2xl font-bold ${summary.readinessPercent >= 80 ? 'text-emerald-600' : summary.readinessPercent >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{summary.readinessPercent}%</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Checking compliance...</p>
          </div>
        ) : board.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border">
            <Plane className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No active loads</p>
          </div>
        ) : (
          <div className="space-y-4">
            {board.map(load => {
              const isExpanded = expandedLoad === load.loadId;
              return (
                <div key={load.loadId} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 overflow-hidden">
                  {/* Load Header */}
                  <button
                    onClick={() => setExpandedLoad(isExpanded ? null : load.loadId)}
                    className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <Plane className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white">Load {load.loadNumber || load.loadId}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{load.status}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{load.aircraft}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>{load.slots.length}/{load.capacity} filled</span>
                        <span className="text-emerald-600 font-semibold">{load.readyCount} ready</span>
                        {load.blockedCount > 0 && <span className="text-red-600 font-semibold">{load.blockedCount} blocked</span>}
                      </div>
                    </div>
                    {/* Readiness bar */}
                    <div className="w-32 hidden md:block">
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${load.blockedCount === 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${load.slots.length > 0 ? (load.readyCount / load.slots.length) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>

                  {/* Expanded Slot List */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-slate-700 dark:border-gray-700">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-700/50">
                          <tr>
                            <th className="text-left px-5 py-2 font-semibold text-gray-600 dark:text-gray-400">#</th>
                            <th className="text-left px-5 py-2 font-semibold text-gray-600 dark:text-gray-400">Jumper</th>
                            <th className="text-left px-5 py-2 font-semibold text-gray-600 dark:text-gray-400">Type</th>
                            <th className="text-center px-5 py-2 font-semibold text-gray-600 dark:text-gray-400">Weight</th>
                            <th className="text-center px-5 py-2 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                            <th className="text-left px-5 py-2 font-semibold text-gray-600 dark:text-gray-400">Issues</th>
                          </tr>
                        </thead>
                        <tbody>
                          {load.slots.map(slot => {
                            const style = READINESS_STYLES[slot.readinessState] || READINESS_STYLES.review_needed;
                            const Icon = style.icon;
                            return (
                              <tr key={slot.slotId} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                                <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{slot.position}</td>
                                <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{slot.userName}</td>
                                <td className="px-5 py-3">
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:text-gray-300">{slot.slotType}</span>
                                </td>
                                <td className="px-5 py-3 text-center text-gray-600 dark:text-gray-400">{slot.weight ? `${slot.weight} lbs` : '-'}</td>
                                <td className="px-5 py-3 text-center">
                                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${style.bg} ${style.text}`}>
                                    <Icon className="w-3 h-3" />
                                    {READINESS_LABELS[slot.readinessState] || slot.readinessState}
                                  </span>
                                </td>
                                <td className="px-5 py-3">
                                  {slot.failedGates.length > 0 && (
                                    <div className="space-y-1">
                                      {slot.failedGates.map((g, i) => (
                                        <p key={i} className="text-xs text-red-600">{g.message}</p>
                                      ))}
                                    </div>
                                  )}
                                  {slot.warningGates.length > 0 && (
                                    <div className="space-y-1">
                                      {slot.warningGates.map((g, i) => (
                                        <p key={i} className="text-xs text-amber-600">{g.message}</p>
                                      ))}
                                    </div>
                                  )}
                                  {slot.failedGates.length === 0 && slot.warningGates.length === 0 && (
                                    <span className="text-xs text-emerald-600">All gates passed</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </RouteGuard>
  );
}
