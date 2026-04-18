'use client';

import { useState } from 'react';
import { apiPost } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { RouteGuard } from '@/components/RouteGuard';
import { Download, Loader2, CheckCircle, AlertCircle, ArrowLeft, FileJson } from 'lucide-react';
import Link from 'next/link';

const MODULES = [
  { key: 'users', label: 'Users & Profiles' },
  { key: 'athletes', label: 'Athletes' },
  { key: 'aircraft', label: 'Aircraft' },
  { key: 'loads', label: 'Loads & Slots' },
  { key: 'gear', label: 'Gear Items' },
  { key: 'rigs', label: 'Rigs & Components' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'boogies', label: 'Events & Boogies' },
];

function ExportContent() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[]>(MODULES.map(m => m.key));
  const [format, setFormat] = useState<'JSON' | 'CSV'>('JSON');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);

  const toggleModule = (key: string) => {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleExport = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    setResult(null);
    try {
      const res: any = await apiPost('/data-management/export', {
        dropzoneId: user?.dropzoneId || 1,
        modules: selected,
        format,
      });
      // Trigger download
      const dateStr = new Date().toISOString().split('T')[0];
      if (format === 'CSV') {
        const csvEntries = Object.entries(res.data as Record<string, string>);
        if (csvEntries.length === 1) {
          // Single module — download as one CSV
          const [mod, csv] = csvEntries[0];
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `skylara-${mod}-${dateStr}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          // Multiple modules — combine into one file with section headers
          const combined = csvEntries
            .map(([mod, csv]) => `# === MODULE: ${mod.toUpperCase()} ===\n${csv}`)
            .join('\n\n');
          const blob = new Blob([combined], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `skylara-export-${dateStr}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `skylara-export-${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      setResult({ success: true, message: `Exported ${res.recordCount} records from ${res.modules.length} modules.` });
    } catch (e: any) {
      setResult({ success: false, message: e?.response?.data?.error || 'Export failed' });
    }
    setLoading(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <Link href="/dashboard/admin/data-management" className="inline-flex items-center gap-1 text-secondary-500 dark:text-secondary-400 text-sm no-underline mb-4">
        <ArrowLeft size={14} /> Back to Data Management
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white m-0">Export Data</h1>
      <p className="text-gray-500 dark:text-gray-400 mt-1 mb-6 text-sm">
        Export your dropzone data by module. Choose which data to include.
      </p>

      {result && (
        <div className={`${result.success ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500' : 'bg-red-50 dark:bg-red-900/30 border-red-500'} border rounded-lg p-4 mb-5 flex gap-3`}>
          {result.success ? <CheckCircle size={20} className="text-emerald-500" /> : <AlertCircle size={20} className="text-red-500" />}
          <span className={`font-semibold text-sm ${result.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>{result.message}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 mb-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Select Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {MODULES.map(m => (
            <label key={m.key} className={`flex items-center gap-2.5 py-2.5 px-3.5 rounded-lg border cursor-pointer transition-all ${selected.includes(m.key) ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-500 dark:border-purple-400' : 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600'}`}>
              <input type="checkbox" checked={selected.includes(m.key)} onChange={() => toggleModule(m.key)}
                className="accent-purple-500" />
              <span className="text-sm text-gray-900 dark:text-white">{m.label}</span>
            </label>
          ))}
        </div>

        <div className="mt-5 flex gap-3 items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Format:</span>
          {(['JSON', 'CSV'] as const).map(f => (
            <button key={f} onClick={() => setFormat(f)} className={`border rounded-md px-4 py-1.5 text-sm font-semibold cursor-pointer transition-colors ${format === f ? 'bg-primary-500 dark:bg-primary-600 text-white border-primary-500 dark:border-primary-600' : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleExport} disabled={loading || selected.length === 0} className={`${loading ? 'bg-gray-400 dark:bg-gray-500 cursor-not-allowed' : 'bg-purple-500 dark:bg-purple-600 cursor-pointer hover:bg-purple-600 dark:hover:bg-purple-500'} text-white border-none rounded-lg px-7 py-3 text-sm font-semibold inline-flex items-center gap-2`}>
        {loading ? <><Loader2 size={16} className="animate-spin" /> Exporting...</> : <><Download size={16} /> Export {selected.length} Module{selected.length !== 1 ? 's' : ''}</>}
      </button>
    </div>
  );
}

export default function ExportPage() {
  return (
    <RouteGuard allowedRoles={['PLATFORM_ADMIN', 'DZ_OWNER', 'DZ_MANAGER']}>
      <ExportContent />
    </RouteGuard>
  );
}
