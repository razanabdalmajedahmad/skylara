'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';
import { RouteGuard } from '@/components/RouteGuard';
import { ArrowLeft, Loader2, Save, Check, Edit3 } from 'lucide-react';

interface PolicyDef {
  id: number; key: string; label: string; description: string;
  dataType: string; defaultValue: any;
}

interface ResolvedPolicy {
  key: string; value: any; resolvedScope: string; definitionId: number;
}

function PolicyCategoryContent() {
  const params = useParams();
  const category = (params?.category as string ?? '').toUpperCase();
  const [definitions, setDefinitions] = useState<PolicyDef[]>([]);
  const [resolved, setResolved] = useState<Record<string, ResolvedPolicy>>({});
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editReason, setEditReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetch() {
      try {
        const [defRes, resolvedRes] = await Promise.all([
          apiGet(`/policies?category=${category}`),
          apiGet('/policies/resolved'),
        ]);
        setDefinitions(defRes?.data?.definitions ?? []);
        setResolved(resolvedRes?.data?.policies ?? {});
      } catch {} finally { setLoading(false); }
    }
    fetch();
  }, [category]);

  async function saveValue(key: string) {
    setSaving(true);
    try {
      let parsedValue: any = editValue;
      const def = definitions.find(d => d.key === key);
      if (def?.dataType === 'number') parsedValue = Number(editValue);
      else if (def?.dataType === 'boolean') parsedValue = editValue === 'true';
      else if (def?.dataType === 'json') parsedValue = JSON.parse(editValue);

      // For now, set at DROPZONE scope (user's current DZ)
      await apiPatch('/policies/DROPZONE/0', {
        values: [{ key, value: parsedValue, reason: editReason || undefined }],
      });

      // Refresh resolved values
      const resolvedRes = await apiGet('/policies/resolved');
      setResolved(resolvedRes?.data?.policies ?? {});
      setEditingKey(null);
      setEditValue('');
      setEditReason('');
    } catch (err) {
      console.error('Failed to save policy:', err);
    } finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 size={32} className="text-secondary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <Link href="/dashboard/settings/policies" className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 no-underline text-sm mb-4 hover:text-gray-700 dark:hover:text-gray-300">
          <ArrowLeft size={16} /> Back to Policy Center
        </Link>

        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-5">
          {category} Policies
        </h1>

        {definitions.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500">No policy definitions for this category.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {definitions.map(def => {
              const res = resolved[def.key];
              const effectiveValue = res?.value ?? def.defaultValue;
              const scope = res?.resolvedScope ?? 'PLATFORM';
              const isEditing = editingKey === def.key;

              return (
                <div key={def.key} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-900 dark:text-white">{def.label}</div>
                      <div className="text-gray-500 dark:text-gray-400 text-[13px] mt-0.5">{def.description}</div>
                      <div className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                        Key: <code className="bg-slate-100 dark:bg-slate-700 px-1 py-px rounded">{def.key}</code>
                        {' · '}Resolved from: <span className={`px-1.5 py-px rounded font-medium ${scope === 'PLATFORM' ? 'bg-slate-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'}`}>{scope}</span>
                      </div>
                    </div>
                    {!isEditing && (
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-sm text-gray-900 dark:text-white font-mono">
                          {typeof effectiveValue === 'object' ? JSON.stringify(effectiveValue) : String(effectiveValue)}
                        </div>
                        <button onClick={() => { setEditingKey(def.key); setEditValue(typeof effectiveValue === 'object' ? JSON.stringify(effectiveValue, null, 2) : String(effectiveValue)); }} className="p-1 sm:p-2 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">
                          <Edit3 size={14} className="text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <div className="mb-2">
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">New Value ({def.dataType})</label>
                        {def.dataType === 'boolean' ? (
                          <select value={editValue} onChange={e => setEditValue(e.target.value)} className="block w-full px-2 py-1.5 rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white mt-1">
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        ) : def.dataType === 'json' ? (
                          <textarea value={editValue} onChange={e => setEditValue(e.target.value)} rows={4} className="block w-full px-2 py-1.5 rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white mt-1 font-mono text-[13px]" />
                        ) : (
                          <input value={editValue} onChange={e => setEditValue(e.target.value)} type={def.dataType === 'number' ? 'number' : 'text'} className="block w-full px-2 py-1.5 rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white mt-1" />
                        )}
                      </div>
                      <div className="mb-2.5">
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Reason (optional)</label>
                        <input value={editReason} onChange={e => setEditReason(e.target.value)} placeholder="Why this change?" className="block w-full px-2 py-1.5 rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white mt-1" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveValue(def.key)} disabled={saving} className="px-3.5 py-1.5 rounded-md border-none bg-primary-500 dark:bg-primary-400 text-white text-[13px] font-medium cursor-pointer flex items-center gap-1 hover:bg-primary-600 dark:hover:bg-primary-500 disabled:opacity-50">
                          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                        </button>
                        <button onClick={() => setEditingKey(null)} className="px-3.5 py-1.5 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-[13px] cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PolicyCategoryPage() {
  return <RouteGuard allowedRoles={['DZ_MANAGER', 'DZ_OWNER', 'PLATFORM_ADMIN']}><PolicyCategoryContent /></RouteGuard>;
}
