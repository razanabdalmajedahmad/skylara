'use client';

import { useState, useRef } from 'react';
import { apiPost } from '@/lib/api';
import { RouteGuard } from '@/components/RouteGuard';
import { Upload, Loader2, CheckCircle, AlertCircle, ArrowLeft, FileText, Shield, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface ParsedPreview {
  type: 'JSON' | 'CSV';
  modules: string[];
  totalRecords: number;
  moduleSummary: { module: string; count: number }[];
  rawData: Record<string, any[]>;
}

interface ValidationResult {
  valid: boolean;
  modules: { module: string; newRecords: number; conflicts: number; errors: string[] }[];
  totalNew: number;
  totalConflicts: number;
}

function ImportContent() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedPreview | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [conflictStrategy, setConflictStrategy] = useState<'SKIP' | 'REPLACE' | 'MERGE'>('SKIP');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setPreview(null);
    setValidation(null);
    setLoading(true);

    try {
      const text = await f.text();

      if (f.name.endsWith('.json')) {
        const data = JSON.parse(text);
        const modules = Object.keys(data).filter(k => Array.isArray(data[k]));
        const totalRecords = modules.reduce((sum, m) => sum + data[m].length, 0);
        setPreview({
          type: 'JSON',
          modules,
          totalRecords,
          moduleSummary: modules.map(m => ({ module: m, count: data[m].length })),
          rawData: data,
        });
      } else if (f.name.endsWith('.csv')) {
        // Parse CSV via backend
        const res: any = await apiPost('/data-management/import/parse-csv', {
          csvText: text,
          moduleHint: undefined,
        });
        const csvModule = res.module || 'unknown';
        const rows = res.rows || [];
        setPreview({
          type: 'CSV',
          modules: [csvModule],
          totalRecords: rows.length,
          moduleSummary: [{ module: csvModule, count: rows.length }],
          rawData: { [csvModule]: rows },
        });
        if (res.errors?.length > 0) {
          setResult({ success: false, message: `CSV parse warnings: ${res.errors.join('; ')}` });
        }
      } else {
        setResult({ success: false, message: 'Unsupported file format. Use .json or .csv' });
      }
    } catch (e: any) {
      setResult({ success: false, message: `Failed to parse file: ${e.message}` });
    }
    setLoading(false);
  };

  const handleValidate = async () => {
    if (!preview) return;
    setValidating(true);
    setValidation(null);
    try {
      const res: any = await apiPost('/data-management/import/validate', {
        data: preview.rawData,
      });
      setValidation(res);
    } catch (e: any) {
      setResult({ success: false, message: `Validation failed: ${e?.response?.data?.error || e.message}` });
    }
    setValidating(false);
  };

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    setResult(null);
    try {
      const res: any = await apiPost('/data-management/import/commit', {
        data: preview.rawData,
        conflictStrategy,
        format: preview.type,
      });
      setResult({
        success: true,
        message: `Import completed! ${res.recordsAffected} records processed across ${res.modulesAffected?.length || 0} modules in ${(res.durationMs / 1000).toFixed(1)}s.`,
        details: res,
      });
      setPreview(null);
      setValidation(null);
      setFile(null);
    } catch (e: any) {
      setResult({ success: false, message: e?.response?.data?.error || 'Import failed' });
    }
    setImporting(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <Link href="/dashboard/admin/data-management" className="inline-flex items-center gap-1 text-secondary-500 dark:text-secondary-400 text-sm no-underline mb-4">
        <ArrowLeft size={14} /> Back to Data Management
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white m-0">Import Data</h1>
      <p className="text-gray-500 dark:text-gray-400 mt-1 mb-6 text-sm">
        Import data from JSON exports or CSV files. Preview and validate before committing.
      </p>

      {result && (
        <div className={`${result.success ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500' : 'bg-red-50 dark:bg-red-900/30 border-red-500'} border rounded-lg p-4 mb-5 flex gap-3 items-start`}>
          {result.success ? <CheckCircle size={20} className="text-emerald-500" /> : <AlertCircle size={20} className="text-red-500" />}
          <div>
            <span className={`font-semibold text-sm ${result.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>{result.message}</span>
            {result.details && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Operation ID: {result.details.operationId} | Modules: {result.details.modulesAffected?.join(', ')}
                {result.details.errors?.length > 0 && <div className="text-red-500 mt-0.5">Warnings: {result.details.errors.join('; ')}</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Upload Zone */}
      <div
        onClick={() => fileRef.current?.click()}
        className={`bg-white dark:bg-slate-800 border-2 border-dashed ${file ? 'border-secondary-500 dark:border-secondary-400' : 'border-gray-200 dark:border-slate-700'} rounded-xl py-12 px-6 text-center cursor-pointer mb-5 transition-colors`}
      >
        <input ref={fileRef} type="file" accept=".json,.csv" onChange={handleFileSelect} className="hidden" />
        <Upload size={36} className={`${file ? 'text-secondary-500 dark:text-secondary-400' : 'text-gray-400 dark:text-gray-500'} mb-3 mx-auto`} />
        {file ? (
          <div>
            <div className="text-base font-semibold text-gray-900 dark:text-white">{file.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</div>
          </div>
        ) : (
          <div>
            <div className="text-base font-semibold text-gray-900 dark:text-white">Click to upload</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">JSON or CSV files supported</div>
          </div>
        )}
      </div>

      {loading && <div className="text-center py-5"><Loader2 size={24} className="text-secondary-500 dark:text-secondary-400 animate-spin mx-auto" /></div>}

      {/* Preview Panel */}
      {preview && !loading && (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 mb-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            <FileText size={16} className="inline-block align-[-2px] mr-1.5" />
            Parsed Preview — {preview.type}
          </h2>

          <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {preview.modules.length} module{preview.modules.length > 1 ? 's' : ''}, {preview.totalRecords} total records
          </div>

          <div className="flex gap-2 flex-wrap mb-4">
            {preview.moduleSummary.map((s) => (
              <div key={s.module} className="bg-slate-100 dark:bg-slate-700 rounded-md px-3 py-1.5 text-sm text-gray-900 dark:text-white">
                <strong>{s.module}</strong>: {s.count}
              </div>
            ))}
          </div>

          {/* Conflict Strategy */}
          <div className="mt-4">
            <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Conflict Strategy</div>
            <div className="flex gap-2.5 flex-col sm:flex-row">
              {([
                { key: 'SKIP' as const, label: 'Skip duplicates', desc: 'New records only — existing left untouched' },
                { key: 'REPLACE' as const, label: 'Replace existing', desc: 'Overwrite matched records with imported data' },
                { key: 'MERGE' as const, label: 'Merge fields', desc: 'Fill empty fields only — keep existing values' },
              ]).map(opt => (
                <label key={opt.key} className={`flex flex-col gap-0.5 p-3.5 flex-1 rounded-lg border cursor-pointer transition-colors ${conflictStrategy === opt.key ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-500 dark:border-amber-400' : 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600'}`}>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                    <input type="radio" name="conflict" checked={conflictStrategy === opt.key}
                      onChange={() => setConflictStrategy(opt.key)} className="accent-amber-500" />
                    {opt.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 pl-[22px]">{opt.desc}</div>
                </label>
              ))}
            </div>
          </div>

          {/* Validation Results */}
          {validation && (
            <div className={`mt-4 p-4 rounded-lg border ${validation.valid ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500' : 'bg-amber-50 dark:bg-amber-900/30 border-amber-500'}`}>
              <div className={`font-semibold text-sm mb-2 ${validation.valid ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                <Shield size={14} className="inline-block align-[-2px] mr-1" />
                Validation {validation.valid ? 'Passed' : 'Has Warnings'}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {validation.totalNew} new records | {validation.totalConflicts} conflicts detected
              </div>
              {validation.modules.map((m) => (
                <div key={m.module} className="text-xs mb-1 flex gap-3">
                  <strong className="text-gray-900 dark:text-white">{m.module}</strong>:
                  <span className="text-emerald-700 dark:text-emerald-400">{m.newRecords} new</span>
                  {m.conflicts > 0 && <span className="text-amber-700 dark:text-amber-400">{m.conflicts} conflicts</span>}
                  {m.errors.length > 0 && <span className="text-red-500">{m.errors.length} errors</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {preview && !loading && (
        <div className="flex gap-3 flex-wrap">
          <button onClick={handleValidate} disabled={validating} className={`bg-white dark:bg-slate-800 text-primary-500 dark:text-primary-400 border border-primary-500 dark:border-primary-400 rounded-lg px-6 py-3 text-sm font-semibold inline-flex items-center gap-2 ${validating ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20'}`}>
            {validating ? <><Loader2 size={16} className="animate-spin" /> Validating...</> : <><Shield size={16} /> Validate First</>}
          </button>

          <button onClick={handleImport} disabled={importing} className={`${importing ? 'bg-gray-400 dark:bg-gray-500 cursor-not-allowed' : 'bg-emerald-500 dark:bg-emerald-600 cursor-pointer hover:bg-emerald-600 dark:hover:bg-emerald-500'} text-white border-none rounded-lg px-7 py-3 text-sm font-semibold inline-flex items-center gap-2`}>
            {importing ? <><Loader2 size={16} className="animate-spin" /> Importing...</> : <><Upload size={16} /> Import Data</>}
          </button>

          <button onClick={() => { setFile(null); setPreview(null); setValidation(null); setResult(null); }} className="bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700 rounded-lg px-5 py-3 text-sm font-medium cursor-pointer inline-flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-slate-700">
            <RefreshCw size={14} /> Reset
          </button>
        </div>
      )}
    </div>
  );
}

export default function ImportPage() {
  return (
    <RouteGuard allowedRoles={['PLATFORM_ADMIN', 'DZ_OWNER', 'DZ_MANAGER']}>
      <ImportContent />
    </RouteGuard>
  );
}
