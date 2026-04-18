'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';
import { Shield, Loader2, CheckCircle2, AlertTriangle, Clock, XCircle } from 'lucide-react';

const STATE_STYLES: Record<string, { chipClass: string; label: string }> = {
  SELF_DECLARED: { chipClass: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', label: 'Self-Declared' },
  DZ_VERIFIED: { chipClass: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', label: 'DZ Verified' },
  STAFF_VERIFIED: { chipClass: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', label: 'Staff Verified' },
  RIGGER_VERIFIED: { chipClass: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', label: 'Rigger Verified' },
  INSTRUCTOR_VERIFIED: { chipClass: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', label: 'Instructor Verified' },
  PILOT_CONFIRMED: { chipClass: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', label: 'Pilot Confirmed' },
  AUTHORITY_VERIFIED: { chipClass: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', label: 'Authority Verified' },
  VER_EXPIRED: { chipClass: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300', label: 'Expired' },
  REVIEW_REQUIRED: { chipClass: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', label: 'Review Required' },
};

// Mapping for the summary card button styling
const STATE_BUTTON_ACTIVE: Record<string, string> = {
  SELF_DECLARED: 'bg-amber-50 dark:bg-amber-900/30 border-amber-500/40 dark:border-amber-400/40',
  DZ_VERIFIED: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500/40 dark:border-emerald-400/40',
  STAFF_VERIFIED: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500/40 dark:border-emerald-400/40',
  RIGGER_VERIFIED: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500/40 dark:border-emerald-400/40',
  INSTRUCTOR_VERIFIED: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500/40 dark:border-emerald-400/40',
  PILOT_CONFIRMED: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500/40 dark:border-emerald-400/40',
  AUTHORITY_VERIFIED: 'bg-purple-50 dark:bg-purple-900/30 border-purple-500/40 dark:border-purple-400/40',
  VER_EXPIRED: 'bg-red-50 dark:bg-red-900/30 border-red-500/40 dark:border-red-400/40',
  REVIEW_REQUIRED: 'bg-amber-50 dark:bg-amber-900/30 border-amber-500/40 dark:border-amber-400/40',
};

const STATE_TEXT_COLOR: Record<string, string> = {
  SELF_DECLARED: 'text-amber-700 dark:text-amber-300',
  DZ_VERIFIED: 'text-emerald-700 dark:text-emerald-300',
  STAFF_VERIFIED: 'text-emerald-700 dark:text-emerald-300',
  RIGGER_VERIFIED: 'text-emerald-700 dark:text-emerald-300',
  INSTRUCTOR_VERIFIED: 'text-emerald-700 dark:text-emerald-300',
  PILOT_CONFIRMED: 'text-emerald-700 dark:text-emerald-300',
  AUTHORITY_VERIFIED: 'text-purple-700 dark:text-purple-300',
  VER_EXPIRED: 'text-red-700 dark:text-red-300',
  REVIEW_REQUIRED: 'text-amber-700 dark:text-amber-300',
};

export default function VerificationsDashboardPage() {
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    async function fetch() {
      try {
        const res = await apiGet('/verifications');
        setVerifications(res?.data?.verifications ?? []);
      } catch {} finally { setLoading(false); }
    }
    fetch();
  }, []);

  const filtered = filter === 'ALL' ? verifications : verifications.filter(v => v.status === filter);
  const counts: Record<string, number> = {};
  for (const v of verifications) counts[v.status] = (counts[v.status] ?? 0) + 1;

  if (loading) return (
    <div className="flex justify-center items-center h-[60vh]">
      <Loader2 size={32} className="text-secondary-500 animate-spin" />
    </div>
  );

  return (
    <RouteGuard allowedRoles={[...ROLE_GROUPS.OPERATIONS, ...ROLE_GROUPS.SAFETY]}>
      <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Verification Center</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{verifications.length} tracked verifications</p>
            </div>
            <Link href="/dashboard/compliance/review-queue" className="px-4 py-2 rounded-lg bg-primary-500 dark:bg-primary-400 text-white font-medium text-[13px] no-underline hover:bg-primary-600 dark:hover:bg-primary-500 transition-colors">
              Review Queue ({(counts['REVIEW_REQUIRED'] ?? 0) + (counts['VER_EXPIRED'] ?? 0)})
            </Link>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 mb-5">
            {Object.entries(STATE_STYLES).map(([state, style]) => {
              const textColor = STATE_TEXT_COLOR[state] ?? 'text-gray-700 dark:text-gray-300';
              return (
                <button key={state} onClick={() => setFilter(filter === state ? 'ALL' : state)} className={`rounded-xl p-3 border text-center cursor-pointer transition-colors ${filter === state ? STATE_BUTTON_ACTIVE[state] : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                  <div className={`text-xl font-bold ${textColor}`}>{counts[state] ?? 0}</div>
                  <div className={`text-[11px] font-medium ${textColor}`}>{style.label}</div>
                </button>
              );
            })}
          </div>

          {/* Verification list */}
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-400 dark:text-gray-500">
              <Shield size={40} strokeWidth={1.5} className="mb-3 mx-auto" />
              <p>No verifications{filter !== 'ALL' ? ` with status "${filter}"` : ''}.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map(v => {
                const style = STATE_STYLES[v.status] ?? STATE_STYLES.SELF_DECLARED;
                return (
                  <div key={v.id} className="bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-gray-200 dark:border-slate-700 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-900 dark:text-white">
                        {v.entityType} #{v.entityId}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400 text-[13px]">
                        {v.verificationSource ?? 'No source'} · Updated {new Date(v.updatedAt).toLocaleDateString()}
                        {v.expiresAt && <span> · Expires {new Date(v.expiresAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${style.chipClass}`}>{style.label}</span>
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
