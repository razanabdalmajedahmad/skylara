'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, Loader2, AlertCircle } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';

type RolloutReport = {
  window: { days: number; fromDayKey: string; toDayKey: string };
  totals: Record<string, number>;
  byDay: Array<{ dayKey: string; totals: Record<string, number> }>;
  usageByOrg: Array<{ orgId: number | null; orgName: string | null; subscriptionTier: string | null; usedCount: number }>;
  byTier: Array<{ subscriptionTier: string | null; totals: Record<string, number> }>;
};

function n(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function pct(num: number, den: number): string {
  if (!den) return '—';
  return `${Math.round((num / den) * 100)}%`;
}

export default function AIRolloutPage() {
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<RolloutReport | null>(null);

  const metrics = useMemo(() => {
    const t = report?.totals ?? {};
    const streamSuccess = n(t['assistant.stream.success']);
    const streamFallback = n(t['assistant.stream.fallback']);
    const jsonSuccess = n(t['assistant.json.success']);
    const jsonFallback = n(t['assistant.json.fallback']);
    const blocked = n(t['assistant.usage.blocked']);
    const softLimit = n(t['assistant.usage.soft_limit']);
    const aborted = n(t['assistant.stream.aborted']);
    const unsupported = n(t['assistant.stream.unsupported_client']);
    const trunc = n(t['assistant.budget.truncation']);
    const providerFail = n(t['assistant.provider.failure']);
    const streamAttempts = streamSuccess + streamFallback;
    const jsonAttempts = jsonSuccess + jsonFallback;
    return {
      streamSuccess,
      streamFallback,
      streamAttempts,
      jsonSuccess,
      jsonFallback,
      jsonAttempts,
      blocked,
      softLimit,
      aborted,
      unsupported,
      trunc,
      providerFail,
    };
  }, [report]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiGet<{ success: boolean; data: RolloutReport }>(`/assistant/rollout/report?days=${days}`);
        if (res?.success && res.data) {
          setReport(res.data);
        } else {
          setReport(null);
          setError('No report data available.');
        }
      } catch {
        setError('Could not load assistant rollout report.');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [days]);

  return (
    <RouteGuard allowedRoles={[...ROLE_GROUPS.STAFF_MGMT, ...ROLE_GROUPS.OPERATIONS]}>
      <div className="min-h-screen bg-gray-50 dark:bg-transparent">
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/dashboard/ai"
                    className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to AI Hub
                  </Link>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">Assistant Rollout Report</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Prompt-safe metrics for usage, fallback, limits, and failures.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    days === d
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center min-h-[40vh]">
              <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300">{error}</p>
            </div>
          )}

          {!loading && report && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Streaming health</div>
                  <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                    <div className="flex justify-between"><span>Stream success</span><span className="font-semibold">{metrics.streamSuccess}</span></div>
                    <div className="flex justify-between"><span>Stream fallback</span><span className="font-semibold">{metrics.streamFallback}</span></div>
                    <div className="flex justify-between"><span>Success rate</span><span className="font-semibold">{pct(metrics.streamSuccess, metrics.streamAttempts)}</span></div>
                    <div className="flex justify-between"><span>Unsupported clients</span><span className="font-semibold">{metrics.unsupported}</span></div>
                    <div className="flex justify-between"><span>Aborted</span><span className="font-semibold">{metrics.aborted}</span></div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">JSON fallback + provider</div>
                  <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                    <div className="flex justify-between"><span>JSON success</span><span className="font-semibold">{metrics.jsonSuccess}</span></div>
                    <div className="flex justify-between"><span>JSON fallback</span><span className="font-semibold">{metrics.jsonFallback}</span></div>
                    <div className="flex justify-between"><span>Provider failures</span><span className="font-semibold">{metrics.providerFail}</span></div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Governance + limits</div>
                  <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                    <div className="flex justify-between"><span>Blocked</span><span className="font-semibold">{metrics.blocked}</span></div>
                    <div className="flex justify-between"><span>Soft-limit hits</span><span className="font-semibold">{metrics.softLimit}</span></div>
                    <div className="flex justify-between"><span>Budget truncations</span><span className="font-semibold">{metrics.trunc}</span></div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                  <div className="font-semibold text-gray-900 dark:text-white">Usage by org (window)</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Uses persistent daily usage store; org/tier labels only (no billing secrets).
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      <tr className="border-b border-gray-200 dark:border-slate-700">
                        <th className="text-left p-3">Org</th>
                        <th className="text-left p-3">Tier</th>
                        <th className="text-right p-3">Requests</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.usageByOrg.length === 0 ? (
                        <tr><td className="p-3 text-gray-500 dark:text-gray-400" colSpan={3}>No usage recorded in window.</td></tr>
                      ) : (
                        report.usageByOrg.slice(0, 50).map((row, idx) => (
                          <tr key={`${row.orgId ?? 'none'}-${idx}`} className="border-b border-gray-100 dark:border-slate-800">
                            <td className="p-3 text-gray-900 dark:text-gray-100">{row.orgName ?? 'Unknown org'}</td>
                            <td className="p-3 text-gray-600 dark:text-gray-300">{row.subscriptionTier ?? 'unknown'}</td>
                            <td className="p-3 text-right font-semibold text-gray-900 dark:text-gray-100">{row.usedCount}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                  <div className="font-semibold text-gray-900 dark:text-white">Daily metrics (window)</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Key rollout counters by UTC day.</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      <tr className="border-b border-gray-200 dark:border-slate-700">
                        <th className="text-left p-3">Day</th>
                        <th className="text-right p-3">Stream ok</th>
                        <th className="text-right p-3">Stream fallback</th>
                        <th className="text-right p-3">Blocked</th>
                        <th className="text-right p-3">Provider fail</th>
                        <th className="text-right p-3">Trunc</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.byDay.length === 0 ? (
                        <tr><td className="p-3 text-gray-500 dark:text-gray-400" colSpan={6}>No metric events recorded in window.</td></tr>
                      ) : (
                        report.byDay.map((d) => (
                          <tr key={d.dayKey} className="border-b border-gray-100 dark:border-slate-800">
                            <td className="p-3 text-gray-900 dark:text-gray-100">{d.dayKey}</td>
                            <td className="p-3 text-right font-semibold">{n(d.totals['assistant.stream.success'])}</td>
                            <td className="p-3 text-right font-semibold">{n(d.totals['assistant.stream.fallback'])}</td>
                            <td className="p-3 text-right font-semibold">{n(d.totals['assistant.usage.blocked'])}</td>
                            <td className="p-3 text-right font-semibold">{n(d.totals['assistant.provider.failure'])}</td>
                            <td className="p-3 text-right font-semibold">{n(d.totals['assistant.budget.truncation'])}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </RouteGuard>
  );
}

