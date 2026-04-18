'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Bot, Loader2, AlertCircle, Save, FlaskConical } from 'lucide-react';
import { apiGet, apiPut, APIError } from '@/lib/api';
import { RouteGuard, ROLES } from '@/components/RouteGuard';
import { useToast } from '@/components/Toast';

type TemplateOption = { id: string; description: string };

type ExperimentConfig = {
  id: number;
  organizationId: number;
  enabled: boolean;
  experimentTemplateId: string;
  cohortTiers: string[] | null;
  rolloutPercent: number;
  experimentKey: string | null;
};

type OrgPromptPayload = {
  organizationId: number;
  organizationName: string;
  assistantPromptTemplateIdPinned: string | null;
  templates: TemplateOption[];
  effective: {
    requestedOrgTemplateId: string | null;
    resolvedTemplateId: string;
    selectionSource: 'organization' | 'experiment' | 'environment' | 'registry_default';
    headerVersion: string;
  };
  fallbackOrderHelp: string;
  experimentConfig: ExperimentConfig | null;
  experimentsGloballyEnabled: boolean;
};

type HistoryRow = {
  id: number;
  organizationId: number;
  previousTemplateId: string | null;
  newTemplateId: string | null;
  actorUserId: number | null;
  actorRoleSummary: string | null;
  changeSource: string;
  effectiveSelectionSource: string | null;
  createdAt: string;
};

const ADMIN_ROLES = [ROLES.PLATFORM_ADMIN, ROLES.DZ_OWNER, ROLES.DZ_MANAGER];

export default function OrgAssistantPromptTemplatePage() {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OrgPromptPayload | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expSaving, setExpSaving] = useState(false);
  const [expEnabled, setExpEnabled] = useState(false);
  const [expTemplate, setExpTemplate] = useState('');
  const [expCohorts, setExpCohorts] = useState('');
  const [expPercent, setExpPercent] = useState(100);
  const [expKey, setExpKey] = useState('');

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: HistoryRow[] }>(
        '/assistant/org-prompt-template/history?limit=40'
      );
      if (res?.success && Array.isArray(res.data)) {
        setHistory(res.data);
      }
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ success: boolean; data: OrgPromptPayload }>('/assistant/org-prompt-template');
      if (res?.success && res.data) {
        setData(res.data);
        setSelectedId(res.data.assistantPromptTemplateIdPinned ?? '');
        void loadHistory();
      } else {
        setError('Could not load organization prompt settings.');
      }
    } catch (e) {
      const msg = e instanceof APIError ? e.message : 'Could not load organization prompt settings.';
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [loadHistory]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data) return;
    const ec = data.experimentConfig;
    setExpEnabled(ec?.enabled ?? false);
    setExpTemplate(ec?.experimentTemplateId || data.templates[0]?.id || '');
    setExpCohorts((ec?.cohortTiers ?? []).join(', '));
    setExpPercent(ec?.rolloutPercent ?? 100);
    setExpKey(ec?.experimentKey ?? '');
  }, [data]);

  const handleSaveExperiment = async () => {
    if (!data) return;
    setExpSaving(true);
    setError(null);
    try {
      const tiers = expCohorts
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20);
      const res = await apiPut<{ success: boolean; data: OrgPromptPayload }>(
        '/assistant/org-prompt-template/experiment',
        {
          enabled: expEnabled,
          experimentTemplateId: expTemplate,
          cohortTiers: tiers.length ? tiers : null,
          rolloutPercent: expPercent,
          experimentKey: expKey.trim() || null,
        }
      );
      if (res?.success && res.data) {
        setData(res.data);
        setError(null);
        success('Experiment settings saved.');
      }
    } catch (e) {
      const msg = e instanceof APIError ? e.message : 'Failed to save experiment.';
      setError(msg);
      toastError(msg);
    } finally {
      setExpSaving(false);
    }
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    setError(null);
    try {
      const body =
        selectedId === ''
          ? { assistantPromptTemplateId: null }
          : { assistantPromptTemplateId: selectedId };
      const res = await apiPut<{ success: boolean; data: OrgPromptPayload }>(
        '/assistant/org-prompt-template',
        body
      );
      if (res?.success && res.data) {
        setData(res.data);
        setSelectedId(res.data.assistantPromptTemplateIdPinned ?? '');
        setError(null);
        success('Organization assistant template updated.');
        void loadHistory();
      } else {
        toastError('Save did not return updated data.');
      }
    } catch (e) {
      const msg = e instanceof APIError ? e.message : 'Failed to save.';
      setError(msg);
      toastError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <RouteGuard allowedRoles={ADMIN_ROLES}>
      <div className="min-h-screen bg-gray-50 dark:bg-transparent">
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
              <Bot className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <Link
                href="/dashboard/ai"
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to AI Hub
              </Link>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white mt-1">
                Organization assistant template
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Pin a registry template for your organization. Prompt text is never shown here.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto p-6 space-y-6">
          {loading && (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading…
            </div>
          )}

          {!loading && error && !data && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-900 dark:text-amber-100">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {data && (
            <>
              <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Organization</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">{data.organizationName}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">ID {data.organizationId}</p>
              </section>

              <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Registry template pin</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Choose a template id from the registry, or clear to use server environment / platform default.
                </p>
                <select
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  <option value="">(Clear pin — use env / default)</option>
                  {data.templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id} — {t.description}
                    </option>
                  ))}
                </select>
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                    {error}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedId('')}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                  >
                    Reset selection to clear
                  </button>
                </div>
              </section>

              <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm space-y-3">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Effective template (metadata)</h2>
                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between gap-4 border-b border-gray-100 dark:border-slate-700 pb-2">
                    <dt className="text-gray-500 dark:text-gray-400">Requested org pin</dt>
                    <dd className="text-gray-900 dark:text-white font-mono text-xs text-right break-all">
                      {data.effective.requestedOrgTemplateId ?? '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-gray-100 dark:border-slate-700 pb-2">
                    <dt className="text-gray-500 dark:text-gray-400">Resolved template id</dt>
                    <dd className="text-gray-900 dark:text-white font-mono text-xs text-right break-all">
                      {data.effective.resolvedTemplateId}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-gray-100 dark:border-slate-700 pb-2">
                    <dt className="text-gray-500 dark:text-gray-400">Selection source</dt>
                    <dd className="text-gray-900 dark:text-white text-right">{data.effective.selectionSource}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 dark:text-gray-400">Prompt-Version header</dt>
                    <dd className="text-gray-900 dark:text-white font-mono text-xs text-right break-all">
                      {data.effective.headerVersion}
                    </dd>
                  </div>
                </dl>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-slate-700 pt-3">
                  {data.fallbackOrderHelp}
                </p>
              </section>

              <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Staged template experiment</h2>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  When the organization has <strong>no</strong> template pin above, eligible users can be assigned the
                  experiment template by tier cohort and deterministic rollout %. Does not override an org pin.
                </p>
                {!data.experimentsGloballyEnabled && (
                  <div className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    Experiments are disabled server-wide (<code className="font-mono">ASSISTANT_PROMPT_EXPERIMENTS_ENABLED=false</code>
                    ). This configuration is stored but will not apply until re-enabled.
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={expEnabled}
                    onChange={(e) => setExpEnabled(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Experiment enabled for this organization
                </label>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Experiment template (registry id)
                  </label>
                  <select
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm"
                    value={expTemplate}
                    onChange={(e) => setExpTemplate(e.target.value)}
                  >
                    {data.templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Cohort tiers (optional)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm"
                    placeholder="e.g. starter, pro — matches Organization.subscriptionTier; empty = all"
                    value={expCohorts}
                    onChange={(e) => setExpCohorts(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Rollout percent (0–100, deterministic per user)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="w-full max-w-[120px] px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm"
                    value={expPercent}
                    onChange={(e) => setExpPercent(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Experiment key (logs only)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-xs font-mono"
                    placeholder="e.g. v4_preview"
                    value={expKey}
                    onChange={(e) => setExpKey(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleSaveExperiment()}
                  disabled={expSaving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium"
                >
                  {expSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                  Save experiment
                </button>
              </section>

              <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm space-y-3">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Change history</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Durable audit log (template ids and metadata only). Does not depend on dropzone scope.
                </p>
                {historyLoading && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading history…
                  </div>
                )}
                {!historyLoading && history.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No recorded changes yet.</p>
                )}
                {!historyLoading && history.length > 0 && (
                  <div className="overflow-x-auto -mx-1">
                    <table className="min-w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400">
                          <th className="py-2 pr-3 font-medium">When (UTC)</th>
                          <th className="py-2 pr-3 font-medium">From</th>
                          <th className="py-2 pr-3 font-medium">To</th>
                          <th className="py-2 pr-3 font-medium">Source</th>
                          <th className="py-2 pr-3 font-medium">Effective</th>
                          <th className="py-2 pr-3 font-medium">Actor</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-800 dark:text-gray-200">
                        {history.map((h) => (
                          <tr key={h.id} className="border-b border-gray-100 dark:border-slate-700/80 align-top">
                            <td className="py-2 pr-3 whitespace-nowrap font-mono">{h.createdAt.slice(0, 19)}</td>
                            <td className="py-2 pr-3 font-mono break-all max-w-[140px]">
                              {h.previousTemplateId ?? '—'}
                            </td>
                            <td className="py-2 pr-3 font-mono break-all max-w-[140px]">
                              {h.newTemplateId ?? '—'}
                            </td>
                            <td className="py-2 pr-3">{h.changeSource}</td>
                            <td className="py-2 pr-3">{h.effectiveSelectionSource ?? '—'}</td>
                            <td className="py-2 pr-3">
                              <span className="font-mono">#{h.actorUserId ?? '—'}</span>
                              {h.actorRoleSummary ? (
                                <span className="block text-gray-500 dark:text-gray-400 mt-0.5">
                                  {h.actorRoleSummary}
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </RouteGuard>
  );
}
