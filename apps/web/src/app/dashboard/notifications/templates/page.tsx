'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { StatusBadge, ChannelIcon, PageLoading } from '@/components/onboarding/shared';
import type { NotifTemplate } from '@/lib/notifications/types';
import { Plus, X, Pencil, Save, CheckCircle2, XCircle } from 'lucide-react';

const CHANNELS = ['EMAIL', 'PUSH', 'SMS', 'IN_APP'] as const;
const EVENT_TYPES = ['ONBOARDING_WELCOME', 'WAIVER_REMINDER', 'PAYMENT_RECEIPT', 'LOAD_READY', 'APPROVAL_NEEDED', 'BOOKING_CONFIRMATION', 'SCHEDULE_CHANGE', 'WEATHER_ALERT'] as const;

interface TemplateForm {
  eventType: string;
  channel: string;
  locale: string;
  subject: string;
  body: string;
  active: boolean;
}

const emptyForm: TemplateForm = { eventType: 'ONBOARDING_WELCOME', channel: 'EMAIL', locale: 'en', subject: '', body: '', active: true };

export default function NotifTemplatesPage() {
  const [templates, setTemplates] = useState<NotifTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setTemplates(await apiGet<NotifTemplate[]>('/notifications/templates/all')); } catch { setTemplates([]); }
  }, []);

  useEffect(() => { load().then(() => setLoading(false)); }, [load]);

  const handleCreate = async () => {
    if (!form.eventType || !form.channel || !form.body.trim()) return;
    setSaving(true);
    try {
      const created = await apiPost<NotifTemplate>('/notifications/templates/create', {
        eventType: form.eventType,
        channel: form.channel,
        locale: form.locale,
        subject: form.subject,
        body: form.body,
      });
      setTemplates(prev => [...prev, created]);
      setShowCreate(false);
      setForm(emptyForm);
    } catch {}
    setSaving(false);
  };

  const startEdit = (t: NotifTemplate) => {
    setEditingId(t.id);
    setForm({
      eventType: t.eventType,
      channel: t.channel,
      locale: t.language,
      subject: t.subject || '',
      body: '',
      active: t.active,
    });
    setShowCreate(false);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const updated = await apiPut<NotifTemplate>(`/notifications/templates/${editingId}`, {
        eventType: form.eventType,
        channel: form.channel,
        locale: form.locale,
        subject: form.subject,
        active: form.active,
        ...(form.body.trim() && { body: form.body }),
      });
      setTemplates(prev => prev.map(t => t.id === editingId ? updated : t));
      setEditingId(null);
      setForm(emptyForm);
    } catch {}
    setSaving(false);
  };

  const cancelForm = () => {
    setShowCreate(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  if (loading) return <PageLoading label="Loading templates..." />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{templates.length} templates</h3>
        {!showCreate && !editingId && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Template
          </button>
        )}
      </div>

      {/* Inline Create Form */}
      {showCreate && (
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border-2 border-blue-500 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Create New Template</h4>
            <button onClick={cancelForm} className="text-gray-400 hover:text-gray-600 dark:text-gray-400"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Event Type *</label>
              <select value={form.eventType} onChange={e => setForm(f => ({ ...f, eventType: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
                {EVENT_TYPES.map(e => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Channel *</label>
              <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
                {CHANNELS.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Language</label>
              <select value={form.locale} onChange={e => setForm(f => ({ ...f, locale: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="pt">Portuguese</option>
                <option value="de">German</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Subject</label>
            <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Welcome to {{dropzoneName}}!" className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Body *</label>
            <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Template body content. Use {{variableName}} for dynamic values." rows={4} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={cancelForm} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800">Cancel</button>
            <button onClick={handleCreate} disabled={saving || !form.eventType || !form.body.trim()} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              <Save className="w-4 h-4" /> {saving ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </div>
      )}

      {/* Templates Table */}
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Name</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Event</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Channel</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Lang</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Subject</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Active</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {templates.map((t) => (
              editingId === t.id ? (
                <tr key={t.id} className="bg-blue-50 dark:bg-blue-900/20">
                  <td className="px-4 py-3" colSpan={7}>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Event Type</label>
                          <select value={form.eventType} onChange={e => setForm(f => ({ ...f, eventType: e.target.value }))} className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white">
                            {EVENT_TYPES.map(e => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Channel</label>
                          <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))} className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white">
                            {CHANNELS.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Language</label>
                          <select value={form.locale} onChange={e => setForm(f => ({ ...f, locale: e.target.value }))} className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white">
                            <option value="en">English</option><option value="es">Spanish</option><option value="pt">Portuguese</option><option value="de">German</option>
                          </select>
                        </div>
                        <div className="flex items-end gap-2">
                          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 pb-1.5">
                            <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="rounded" />
                            Active
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Subject</label>
                        <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Body (leave empty to keep current)</label>
                        <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={3} placeholder="Template body..." className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white font-mono" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={cancelForm} className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800">Cancel</button>
                        <button onClick={handleUpdate} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                          <Save className="w-3 h-3" /> {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{t.name}</td>
                  <td className="px-4 py-3 text-xs"><span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{t.eventType}</span></td>
                  <td className="px-4 py-3 text-center"><ChannelIcon channel={t.channel} /></td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500 dark:text-gray-400">{t.language}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 truncate max-w-[200px]">{t.subject || '-'}</td>
                  <td className="px-4 py-3 text-center">{t.active ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /> : <XCircle className="w-4 h-4 text-gray-400 mx-auto" />}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => startEdit(t)} className="p-1 text-gray-400 hover:text-blue-600 rounded" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
