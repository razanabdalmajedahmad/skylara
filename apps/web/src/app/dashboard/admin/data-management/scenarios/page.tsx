'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { RouteGuard } from '@/components/RouteGuard';
import {
  PlayCircle,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Tag,
  Package,
  ArrowLeft,
  Search,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

interface Scenario {
  key: string;
  name: string;
  description: string;
  tags: string[];
  estimatedRecords: number | Record<string, number>;
}

interface Preview {
  operationType: string;
  recordCounts: Record<string, number>;
  warnings: string[];
  estimatedDuration: string;
}

function ScenariosContent() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [search, setSearch] = useState('');
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    apiGet('/data-management/scenarios')
      .then((res: any) => setScenarios(res.scenarios || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredScenarios = useMemo(() => {
    if (!search.trim()) return scenarios;
    const q = search.toLowerCase();
    return scenarios.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tags.some(t => t.includes(q))
    );
  }, [scenarios, search]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    scenarios.forEach(s => s.tags.forEach(t => tags.add(t)));
    return [...tags].sort();
  }, [scenarios]);

  const handlePreview = async (key: string) => {
    if (expandedKey === key) { setExpandedKey(null); setPreview(null); return; }
    setExpandedKey(key);
    setPreviewLoading(true);
    setPreview(null);
    try {
      const res = await apiGet(`/data-management/scenarios/${key}/preview`);
      setPreview(res as Preview);
    } catch { setPreview(null); }
    setPreviewLoading(false);
  };

  const handleLoad = async (key: string) => {
    if (!confirm(`Load demo scenario "${key}"? This creates new demo data. Existing data is not modified.`)) return;
    setLoadingKey(key);
    setResult(null);
    try {
      const res: any = await apiPost(`/data-management/scenarios/${key}/load`, {});
      setResult({
        success: true,
        message: `Scenario loaded! ${res.recordsAffected} records created in ${(res.durationMs / 1000).toFixed(1)}s.`,
        details: res,
      });
    } catch (e: any) {
      setResult({ success: false, message: e?.response?.data?.error || 'Failed to load scenario' });
    }
    setLoadingKey(null);
  };

  const toggleBulkSelect = (key: string) => {
    setSelectedForBulk(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleBulkLoad = async () => {
    if (selectedForBulk.size === 0) return;
    const keys = [...selectedForBulk];
    if (!confirm(`Load ${keys.length} scenarios? This will create demo data for: ${keys.join(', ')}`)) return;
    setBulkLoading(true);
    setResult(null);
    try {
      const res: any = await apiPost('/data-management/scenarios/bulk-load', { scenarioKeys: keys });
      const succeeded = res.results?.filter((r: any) => r.status === 'COMPLETED').length || 0;
      const failed = res.results?.filter((r: any) => r.status === 'FAILED').length || 0;
      setResult({
        success: failed === 0,
        message: `Bulk load complete: ${succeeded} succeeded, ${failed} failed. ${res.totalRecords} total records in ${(res.totalDurationMs / 1000).toFixed(1)}s.`,
        details: res,
      });
      setSelectedForBulk(new Set());
    } catch (e: any) {
      setResult({ success: false, message: e?.response?.data?.error || 'Bulk load failed' });
    }
    setBulkLoading(false);
  };

  const estimateTotal = (est: number | Record<string, number>) =>
    typeof est === 'number' ? est : Object.values(est).reduce((s, v) => s + v, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <Link href="/dashboard/admin/data-management" className="inline-flex items-center gap-1 text-secondary-500 dark:text-secondary-400 text-sm no-underline mb-4">
        <ArrowLeft size={14} /> Back to Data Management
      </Link>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white m-0">Demo Scenarios</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            {scenarios.length} scenario packs available — load individually or bulk-select
          </p>
        </div>
        {selectedForBulk.size > 0 && (
          <button onClick={handleBulkLoad} disabled={bulkLoading} className={`${bulkLoading ? 'bg-gray-400 dark:bg-gray-500 cursor-not-allowed' : 'bg-primary-500 dark:bg-primary-600 cursor-pointer hover:bg-primary-600 dark:hover:bg-primary-500'} text-white border-none rounded-lg px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2`}>
            {bulkLoading ? <><Loader2 size={16} className="animate-spin" /> Loading {selectedForBulk.size}...</>
              : <><Layers size={16} /> Bulk Load ({selectedForBulk.size})</>}
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search size={16} className="text-gray-400 dark:text-gray-500 absolute left-3 top-3" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search scenarios by name, description, or tag..."
          className="w-full py-2.5 pr-3 pl-9 text-sm border border-gray-200 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 box-border"
        />
      </div>

      {/* Tag Filter Pills */}
      {allTags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-5">
          {allTags.slice(0, 12).map(tag => (
            <button key={tag} onClick={() => setSearch(tag)} className={`rounded px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-colors ${search === tag ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-500 dark:border-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 border border-transparent'}`}>
              {tag}
            </button>
          ))}
          {search && (
            <button onClick={() => setSearch('')} className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-none rounded px-2.5 py-0.5 text-xs font-medium cursor-pointer">
              Clear
            </button>
          )}
        </div>
      )}

      {result && (
        <div className={`${result.success ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500' : 'bg-red-50 dark:bg-red-900/30 border-red-500'} border rounded-lg p-4 mb-5 flex gap-3 items-start`}>
          {result.success ? <CheckCircle size={20} className="text-emerald-500" /> : <AlertCircle size={20} className="text-red-500" />}
          <div>
            <div className={`font-semibold text-sm ${result.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>{result.message}</div>
            {result.details && !result.details.results && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Operation ID: {result.details.operationId} | Modules: {result.details.modulesAffected?.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16"><Loader2 size={28} className="text-secondary-500 dark:text-secondary-400 animate-spin mx-auto" /></div>
      ) : filteredScenarios.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <Package size={40} className="mb-3 opacity-50 mx-auto" />
          <p>{search ? `No scenarios matching "${search}"` : 'No scenarios available yet.'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredScenarios.map(sc => (
            <div key={sc.key} className={`bg-white dark:bg-slate-800 border rounded-xl overflow-hidden transition-colors ${expandedKey === sc.key ? 'border-secondary-500 dark:border-secondary-400' : selectedForBulk.has(sc.key) ? 'border-blue-500 dark:border-blue-400' : 'border-gray-200 dark:border-slate-700'}`}>
              <div className="p-5 flex items-center gap-4">
                {/* Bulk Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedForBulk.has(sc.key)}
                  onChange={() => toggleBulkSelect(sc.key)}
                  onClick={e => e.stopPropagation()}
                  className="w-[18px] h-[18px] accent-blue-500 cursor-pointer flex-shrink-0"
                />

                <div
                  className="flex-1 cursor-pointer flex items-center gap-4"
                  onClick={() => handlePreview(sc.key)}
                >
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-[10px] p-2.5 flex-shrink-0">
                    <PlayCircle size={24} className="text-blue-500 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-gray-900 dark:text-white">{sc.name}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">~{estimateTotal(sc.estimatedRecords)} records</span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{sc.description}</div>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {sc.tags.map(t => (
                        <span key={t} className="bg-slate-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded text-xs font-medium">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  {expandedKey === sc.key ? <ChevronUp size={18} className="text-gray-400 dark:text-gray-500" /> : <ChevronDown size={18} className="text-gray-400 dark:text-gray-500" />}
                </div>
              </div>

              {expandedKey === sc.key && (
                <div className="border-t border-gray-200 dark:border-slate-700 p-5 bg-gray-50 dark:bg-slate-900/50">
                  {previewLoading ? (
                    <div className="text-center py-5"><Loader2 size={20} className="text-secondary-500 dark:text-secondary-400 animate-spin mx-auto" /></div>
                  ) : preview ? (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 mt-0">Preview: What will be created</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                        {Object.entries(preview.recordCounts).map(([key, count]) => (
                          <div key={key} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-center">
                            <div className="text-xl font-bold text-primary-500 dark:text-primary-400">{count}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{key}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mb-4">
                        {preview.warnings.map((w, i) => (
                          <div key={i} className="text-xs text-gray-500 dark:text-gray-400 flex gap-1.5 mb-1">
                            <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-px" />
                            {w}
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mb-4">Estimated duration: {preview.estimatedDuration}</div>
                      <button
                        onClick={() => handleLoad(sc.key)}
                        disabled={loadingKey !== null}
                        className={`${loadingKey === sc.key ? 'bg-gray-400 dark:bg-gray-500 cursor-not-allowed' : 'bg-primary-500 dark:bg-primary-600 cursor-pointer hover:bg-primary-600 dark:hover:bg-primary-500'} text-white border-none rounded-lg px-6 py-2.5 text-sm font-semibold inline-flex items-center gap-2`}
                      >
                        {loadingKey === sc.key ? <><Loader2 size={16} className="animate-spin" /> Loading...</> : <><PlayCircle size={16} /> Load Scenario</>}
                      </button>
                    </div>
                  ) : (
                    <div className="text-gray-400 dark:text-gray-500 text-sm">Could not load preview.</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ScenariosPage() {
  return (
    <RouteGuard allowedRoles={['PLATFORM_ADMIN', 'DZ_OWNER', 'DZ_MANAGER']}>
      <ScenariosContent />
    </RouteGuard>
  );
}
