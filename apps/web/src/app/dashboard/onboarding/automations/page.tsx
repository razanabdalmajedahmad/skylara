'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { StatusBadge, PageLoading } from '@/components/onboarding/shared';
import type { AutomationItem, StatusColor } from '@/lib/onboarding/types';
import { Plus, X, Pencil, Trash2, Save } from 'lucide-react';

const TRIGGERS = [
  'ONBOARDING_STARTED', 'ONBOARDING_STEP_COMPLETED', 'ONBOARDING_SUBMITTED',
  'ONBOARDING_APPROVED', 'ONBOARDING_REJECTED', 'DOCUMENT_UPLOADED',
  'DOCUMENT_EXPIRING', 'DOCUMENT_EXPIRED', 'WAIVER_SIGNED', 'WAIVER_EXPIRING',
  'RATING_EXPIRING', 'RATING_EXPIRED', 'APPLICATION_INACTIVE',
  'USER_REGISTERED', 'PROFILE_UPDATED', 'SEGMENT_ENTERED', 'SEGMENT_EXITED', 'SCHEDULED',
] as const;

const CATEGORIES = ['ONBOARDING', 'NOTIFICATION', 'APPROVAL', 'FOLLOWUP'] as const;

interface AutoForm { name: string; category: string; triggerEvent: string }
const emptyForm: AutoForm = { name: '', category: 'ONBOARDING', triggerEvent: 'ONBOARDING_STARTED' };

export default function AutomationsPage() {
  const [data, setData] = useState<AutomationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AutoForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setData(await apiGet<AutomationItem[]>('/onboarding/automations')); } catch { setData([]); }
  }, []);

  useEffect(() => { load().then(() => setLoading(false)); }, [load]);

  const toggleActive = async (aut: AutomationItem) => {
    const updated = { ...aut, active: !aut.active };
    setData(prev => prev.map(a => a.id === aut.id ? updated : a));
    try { await apiPut(`/onboarding/automations/${aut.id}`, { active: !aut.active }); } catch {}
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.triggerEvent) return;
    setSaving(true);
    try {
      const created = await apiPost<AutomationItem>('/onboarding/automations', form);
      setData(prev => [created, ...prev]);
      setShowCreate(false);
      setForm(emptyForm);
    } catch {}
    setSaving(false);
  };

  const startEdit = (a: AutomationItem) => {
    setEditingId(a.id);
    setForm({ name: a.name, category: a.category, triggerEvent: a.trigger });
    setShowCreate(false);
  };

  const handleUpdate = async () => {
    if (!editingId || !form.name.trim()) return;
    setSaving(true);
    try {
      const updated = await apiPut<AutomationItem>(`/onboarding/automations/${editingId}`, form);
      setData(prev => prev.map(a => a.id === editingId ? updated : a));
      setEditingId(null);
      setForm(emptyForm);
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (uuid: string) => {
    setSaving(true);
    try {
      await apiDelete(`/onboarding/automations/${uuid}`);
      setData(prev => prev.filter(a => a.id !== uuid));
    } catch {}
    setSaving(false);
  };

  const cancelForm = () => { setShowCreate(false); setEditingId(null); setForm(emptyForm); };

  const categoryColor = (c: string): StatusColor => {
    switch (c) { case 'ONBOARDING': return 'blue'; case 'NOTIFICATION': return 'purple'; case 'APPROVAL': return 'green'; case 'FOLLOWUP': return 'orange'; default: return 'gray'; }
  };

  if (loading) return <PageLoading label="Loading automations..." />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{data.length} automation rules</h3>
        {!showCreate && !editingId && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Automation
          </button>
        )}
      </div>

      {showCreate && (
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border-2 border-blue-500 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Create New Automation</h4>
            <button onClick={cancelForm} className="text-gray-400 hover:text-gray-600 dark:text-gray-400"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Auto-approve returning jumpers" className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Trigger Event *</label>
              <select value={form.triggerEvent} onChange={e => setForm(f => ({ ...f, triggerEvent: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
                {TRIGGERS.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={cancelForm} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
            <button onClick={handleCreate} disabled={saving || !form.name.trim()} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Save className="w-4 h-4" /> {saving ? 'Creating...' : 'Create Automation'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {data.map((aut) => (
          editingId === aut.id ? (
            <div key={aut.id} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border-2 border-blue-500 p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Trigger</label>
                  <select value={form.triggerEvent} onChange={e => setForm(f => ({ ...f, triggerEvent: e.target.value }))} className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white">
                    {TRIGGERS.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={cancelForm} className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400">Cancel</button>
                <button onClick={handleUpdate} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  <Save className="w-3 h-3" /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <div key={aut.id} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{aut.name}</p>
                    <StatusBadge status={categoryColor(aut.category)} label={aut.category} />
                    {aut.active ? <StatusBadge status="green" label="Active" /> : <StatusBadge status="gray" label="Paused" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Trigger: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">{aut.trigger}</span>
                    {aut.lastRunAt && <> &middot; Last run: {new Date(aut.lastRunAt).toLocaleDateString()}</>}
                    &middot; Runs: {aut.runCount}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(aut)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(aut.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => toggleActive(aut)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${aut.active ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                    {aut.active ? 'Pause' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
