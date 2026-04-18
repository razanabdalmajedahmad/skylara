'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { PageLoading, SearchInput } from '@/components/onboarding/shared';
import type { Segment } from '@/lib/notifications/types';
import { Plus, X, Pencil, Trash2, Save } from 'lucide-react';

interface SegmentForm { name: string; description: string }
const emptyForm: SegmentForm = { name: '', description: '' };

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SegmentForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setSegments(await apiGet<Segment[]>('/notifications/segments')); } catch { setSegments([]); }
  }, []);

  useEffect(() => { load().then(() => setLoading(false)); }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const created = await apiPost<Segment>('/notifications/segments', { name: form.name, description: form.description });
      setSegments(prev => [...prev, created]);
      setShowCreate(false);
      setForm(emptyForm);
    } catch {}
    setSaving(false);
  };

  const startEdit = (s: Segment) => {
    setEditingId(s.id);
    setForm({ name: s.name, description: s.description });
    setShowCreate(false);
  };

  const handleUpdate = async () => {
    if (!editingId || !form.name.trim()) return;
    setSaving(true);
    try {
      const updated = await apiPut<Segment>(`/notifications/segments/${editingId}`, form);
      setSegments(prev => prev.map(s => s.id === editingId ? updated : s));
      setEditingId(null);
      setForm(emptyForm);
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (uuid: string) => {
    setSaving(true);
    try {
      await apiDelete(`/notifications/segments/${uuid}`);
      setSegments(prev => prev.filter(s => s.id !== uuid));
    } catch {}
    setSaving(false);
  };

  const toggleActive = async (s: Segment) => {
    const updated = { ...s, active: !s.active };
    setSegments(prev => prev.map(seg => seg.id === s.id ? updated : seg));
    try { await apiPut(`/notifications/segments/${s.id}`, { active: !s.active }); } catch {}
  };

  const cancelForm = () => { setShowCreate(false); setEditingId(null); setForm(emptyForm); };

  if (loading) return <PageLoading label="Loading segments..." />;

  const filtered = search ? segments.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase())) : segments;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex-1 max-w-md"><SearchInput value={search} onChange={setSearch} placeholder="Search segments..." /></div>
        {!showCreate && !editingId && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Segment
          </button>
        )}
      </div>

      {showCreate && (
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border-2 border-blue-500 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Create New Segment</h4>
            <button onClick={cancelForm} className="text-gray-400 hover:text-gray-600 dark:text-gray-400"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Segment Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Active Athletes" className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the audience..." className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={cancelForm} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
            <button onClick={handleCreate} disabled={saving || !form.name.trim()} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Save className="w-4 h-4" /> {saving ? 'Creating...' : 'Create Segment'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((s) => (
          editingId === s.id ? (
            <div key={s.id} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border-2 border-blue-500 p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={cancelForm} className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400">Cancel</button>
                <button onClick={handleUpdate} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  <Save className="w-3 h-3" /> {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div key={s.id} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-gray-900 dark:text-white text-sm">{s.name}</p>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => startEdit(s)} className="p-1 text-gray-400 hover:text-blue-600" title="Edit"><Pencil className="w-3 h-3" /></button>
                  <button onClick={() => handleDelete(s.id)} className="p-1 text-gray-400 hover:text-red-600" title="Delete"><Trash2 className="w-3 h-3" /></button>
                  <button onClick={() => toggleActive(s)} title={s.active ? 'Deactivate' : 'Activate'}>
                    {s.active ? <span className="w-2 h-2 bg-green-500 rounded-full block" /> : <span className="w-2 h-2 bg-gray-300 rounded-full block" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{s.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900 dark:text-white">{s.memberCount}</span>
                <span className="text-xs text-gray-400">{s.rulesCount} rules</span>
              </div>
            </div>
          )
        ))}
      </div>
      <p className="text-xs text-gray-400 text-center">{filtered.length} of {segments.length} segments</p>
    </div>
  );
}
