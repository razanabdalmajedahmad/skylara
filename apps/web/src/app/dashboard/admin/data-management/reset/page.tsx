'use client';

import { useState } from 'react';
import { apiPost } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { RouteGuard } from '@/components/RouteGuard';
import { Trash2, Loader2, CheckCircle, AlertTriangle, AlertCircle, ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';

const MODES = [
  { key: 'SETTINGS_ONLY' as const, label: 'Keep Users + Settings', description: 'Remove operational data (loads, slots, gear, incidents). Keep users, roles, and settings.', severity: 'medium' },
  { key: 'USERS_AND_SETTINGS' as const, label: 'Keep Settings Only', description: 'Remove all users and operational data. Preserve DZ configuration and integration settings.', severity: 'high' },
  { key: 'FULL_DESTRUCTIVE' as const, label: 'Full Destructive Reset', description: 'Remove everything except the organization and audit logs. Requires PLATFORM_ADMIN.', severity: 'critical' },
];

function ResetContent() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'SETTINGS_ONLY' | 'USERS_AND_SETTINGS' | 'FULL_DESTRUCTIVE'>('SETTINGS_ONLY');
  const [preview, setPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [batchId, setBatchId] = useState('');
  const [clearMode, setClearMode] = useState<'reset' | 'demo-clear'>('reset');

  const handlePreview = async () => {
    setPreviewLoading(true);
    setPreview(null);
    setResult(null);
    try {
      const res = await apiPost('/data-management/reset/preview', {
        dropzoneId: user?.dropzoneId || 1,
        preserveMode: mode,
      });
      setPreview(res);
    } catch (e: any) {
      setResult({ success: false, message: e?.response?.data?.error || 'Preview failed' });
    }
    setPreviewLoading(false);
  };

  const handleReset = async () => {
    setResetting(true);
    setResult(null);
    try {
      const res: any = await apiPost('/data-management/reset/confirm', {
        dropzoneId: user?.dropzoneId || 1,
        confirmDropzoneName: confirmName,
        preserveMode: mode,
      });
      setResult({ success: true, message: `Reset completed. ${res.recordsAffected} records removed.` });
      setPreview(null);
      setConfirmName('');
    } catch (e: any) {
      setResult({ success: false, message: e?.response?.data?.error || 'Reset failed' });
    }
    setResetting(false);
  };

  const handleDemoClear = async () => {
    if (!batchId.trim()) return;
    setResetting(true);
    setResult(null);
    try {
      const res: any = await apiPost('/data-management/scenarios/clear', { batchId: batchId.trim() });
      setResult({ success: true, message: `Demo data cleared. ${res.recordsAffected} records removed.` });
      setBatchId('');
    } catch (e: any) {
      setResult({ success: false, message: e?.response?.data?.error || 'Clear failed' });
    }
    setResetting(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <Link href="/dashboard/admin/data-management" className="inline-flex items-center gap-1 text-secondary-500 dark:text-secondary-400 text-sm no-underline mb-4">
        <ArrowLeft size={14} /> Back to Data Management
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white m-0">Reset / Clear Data</h1>
      <p className="text-gray-500 dark:text-gray-400 mt-1 mb-6 text-sm">
        Clear demo data or reset tenant operational data. All actions are audit-logged.
      </p>

      {result && (
        <div className={`${result.success ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500' : 'bg-red-50 dark:bg-red-900/30 border-red-500'} border rounded-lg p-4 mb-5 flex gap-3`}>
          {result.success ? <CheckCircle size={20} className="text-emerald-500" /> : <AlertCircle size={20} className="text-red-500" />}
          <span className={`font-semibold text-sm ${result.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>{result.message}</span>
        </div>
      )}

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setClearMode('demo-clear')} className={`border rounded-lg px-5 py-2.5 text-sm font-semibold cursor-pointer transition-colors ${clearMode === 'demo-clear' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-500 dark:border-amber-400' : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700'}`}>
          Clear Demo Data
        </button>
        <button onClick={() => setClearMode('reset')} className={`border rounded-lg px-5 py-2.5 text-sm font-semibold cursor-pointer transition-colors ${clearMode === 'reset' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-500 dark:border-red-400' : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700'}`}>
          Tenant Reset
        </button>
      </div>

      {/* Demo Clear Section */}
      {clearMode === 'demo-clear' && (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Clear Demo Scenario Data</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            Enter the batch ID from a previous scenario load to remove all records from that batch. Find batch IDs in Operation History.
          </p>
          <div className="flex gap-3">
            <input
              type="text" placeholder="Batch ID (UUID)" value={batchId}
              onChange={e => setBatchId(e.target.value)}
              className="flex-1 px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm outline-none font-mono bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <button onClick={handleDemoClear} disabled={!batchId.trim() || resetting} className={`${resetting ? 'bg-gray-400 dark:bg-gray-500 cursor-not-allowed' : 'bg-amber-500 dark:bg-amber-600 cursor-pointer hover:bg-amber-600 dark:hover:bg-amber-500'} text-white border-none rounded-lg px-5 py-2.5 text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap`}>
              {resetting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Clear Batch
            </button>
          </div>
        </div>
      )}

      {/* Tenant Reset Section */}
      {clearMode === 'reset' && (
        <div>
          {/* Danger Banner */}
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-500 rounded-lg p-4 mb-5 flex gap-3">
            <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-red-700 dark:text-red-400 text-sm">Danger Zone</div>
              <div className="text-sm text-red-700 dark:text-red-400 mt-0.5">
                Tenant reset permanently deletes operational data. This cannot be undone. Audit logs are always preserved.
              </div>
            </div>
          </div>

          {/* Preserve Mode Selection */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 mb-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Preserve Mode</h2>
            <div className="flex flex-col gap-2.5">
              {MODES.map(m => (
                <label key={m.key} className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${mode === m.key ? (m.severity === 'critical' ? 'bg-red-50 dark:bg-red-900/30 border-red-500 dark:border-red-400' : 'bg-amber-50 dark:bg-amber-900/30 border-amber-500 dark:border-amber-400') : 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600'}`}>
                  <input type="radio" name="mode" checked={mode === m.key}
                    onChange={() => setMode(m.key)} className={`mt-0.5 ${m.severity === 'critical' ? 'accent-red-500' : 'accent-amber-500'}`} />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">{m.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{m.description}</div>
                  </div>
                </label>
              ))}
            </div>

            <button onClick={handlePreview} disabled={previewLoading} className="bg-transparent text-primary-500 dark:text-primary-400 border border-primary-500 dark:border-primary-400 rounded-lg px-5 py-2.5 text-sm font-semibold cursor-pointer mt-4 inline-flex items-center gap-1.5 hover:bg-primary-50 dark:hover:bg-primary-900/20">
              {previewLoading ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
              Preview What Will Be Deleted
            </button>
          </div>

          {/* Preview Results */}
          {preview && (
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 mb-5">
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3 mt-0">Records to be deleted:</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                {Object.entries(preview.recordCounts || {}).map(([key, count]: [string, any]) => (
                  <div key={key} className={`${count > 0 ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600'} border rounded-lg px-3 py-2 text-center`}>
                    <div className={`text-lg font-bold ${count > 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>{count}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{key}</div>
                  </div>
                ))}
              </div>
              {preview.warnings?.map((w: string, i: number) => (
                <div key={i} className="text-xs text-amber-700 dark:text-amber-400 mb-1">{w}</div>
              ))}

              {/* Confirmation */}
              <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
                <div className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                  Type the dropzone name to confirm:
                </div>
                <input
                  type="text" placeholder="Enter exact dropzone name" value={confirmName}
                  onChange={e => setConfirmName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-red-500 rounded-lg text-sm outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 box-border"
                />
                <button onClick={handleReset} disabled={!confirmName || resetting} className={`${!confirmName || resetting ? 'bg-gray-400 dark:bg-gray-500 cursor-not-allowed' : 'bg-red-500 dark:bg-red-600 cursor-pointer hover:bg-red-600 dark:hover:bg-red-500'} text-white border-none rounded-lg px-6 py-2.5 text-sm font-semibold mt-3 inline-flex items-center gap-1.5`}>
                  {resetting ? <><Loader2 size={14} className="animate-spin" /> Resetting...</> : <><Trash2 size={14} /> Confirm Reset</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ResetPage() {
  return (
    <RouteGuard allowedRoles={['PLATFORM_ADMIN', 'DZ_OWNER']}>
      <ResetContent />
    </RouteGuard>
  );
}
