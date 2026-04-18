'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { StatusBadge, ChannelIcon, PageLoading } from '@/components/onboarding/shared';
import type { Campaign } from '@/lib/notifications/types';
import { Plus, X, Pencil, Trash2, Save, Play, Pause } from 'lucide-react';

const CHANNELS = ['EMAIL', 'PUSH', 'SMS', 'IN_APP'] as const;
const TRIGGER_TYPES = ['MANUAL', 'SCHEDULED', 'EVENT_DRIVEN', 'SEGMENT_BASED'] as const;
const STATUSES = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'] as const;

interface CampaignForm {
  name: string;
  description: string;
  channels: string[];
  triggerType: string;
  status: string;
}

const emptyForm: CampaignForm = { name: '', description: '', channels: ['EMAIL'], triggerType: 'MANUAL', status: 'DRAFT' };

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setCampaigns(await apiGet<Campaign[]>('/notifications/campaigns')); } catch { setCampaigns([]); }
  }, []);

  useEffect(() => { load().then(() => setLoading(false)); }, [load]);

  const toggleChannel = (ch: string) => {
    setForm(f => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch],
    }));
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.channels.length) return;
    setSaving(true);
    try {
      const created = await apiPost<Campaign>('/notifications/campaigns', {
        name: form.name,
        description: form.description,
        channels: form.channels,
        triggerType: form.triggerType,
      });
      setCampaigns(prev => [created, ...prev]);
      setShowCreate(false);
      setForm(emptyForm);
    } catch {}
    setSaving(false);
  };

  const startEdit = (c: Campaign) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      description: '',
      channels: c.channels,
      triggerType: c.triggerType,
      status: c.status,
    });
    setShowCreate(false);
  };

  const handleUpdate = async () => {
    if (!editingId || !form.name.trim()) return;
    setSaving(true);
    try {
      const updated = await apiPut<Campaign>(`/notifications/campaigns/${editingId}`, {
        name: form.name,
        channels: form.channels,
        triggerType: form.triggerType,
        status: form.status,
      });
      setCampaigns(prev => prev.map(c => c.id === editingId ? updated : c));
      setEditingId(null);
      setForm(emptyForm);
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (uuid: string) => {
    setSaving(true);
    try {
      await apiDelete(`/notifications/campaigns/${uuid}`);
      setCampaigns(prev => prev.filter(c => c.id !== uuid));
    } catch {}
    setSaving(false);
  };

  const handleToggleActivate = async (c: Campaign) => {
    setSaving(true);
    try {
      const updated = await apiPost<Campaign>(`/notifications/campaigns/${c.id}/activate`);
      setCampaigns(prev => prev.map(camp => camp.id === c.id ? updated : camp));
    } catch {}
    setSaving(false);
  };

  const cancelForm = () => {
    setShowCreate(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  if (loading) return <PageLoading label="Loading campaigns..." />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{campaigns.length} campaigns</h3>
        {!showCreate && !editingId && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        )}
      </div>

      {/* Inline Create Form */}
      {showCreate && (
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border-2 border-blue-500 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Create New Campaign</h4>
            <button onClick={cancelForm} className="text-gray-400 hover:text-gray-600 dark:text-gray-400"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Campaign Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Summer Re-engagement" className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Trigger Type</label>
              <select value={form.triggerType} onChange={e => setForm(f => ({ ...f, triggerType: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
                {TRIGGER_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Channels *</label>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map(ch => (
                <button key={ch} type="button" onClick={() => toggleChannel(ch)} className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${form.channels.includes(ch) ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/40 dark:border-blue-400 dark:text-blue-300' : 'bg-gray-50 border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400'}`}>
                  {ch.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={cancelForm} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">Cancel</button>
            <button onClick={handleCreate} disabled={saving || !form.name.trim() || !form.channels.length} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              <Save className="w-4 h-4" /> {saving ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </div>
      )}

      {/* Campaigns Table */}
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Campaign</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Channels</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Segment</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Sent</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Open Rate</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {campaigns.map((c) => (
              editingId === c.id ? (
                <tr key={c.id} className="bg-blue-50 dark:bg-blue-900/20">
                  <td className="px-4 py-3" colSpan={7}>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
                          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Trigger</label>
                          <select value={form.triggerType} onChange={e => setForm(f => ({ ...f, triggerType: e.target.value }))} className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white">
                            {TRIGGER_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
                          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white">
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Channels</label>
                        <div className="flex flex-wrap gap-2">
                          {CHANNELS.map(ch => (
                            <button key={ch} type="button" onClick={() => toggleChannel(ch)} className={`px-2.5 py-1 text-xs font-medium rounded-full border ${form.channels.includes(ch) ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/40 dark:border-blue-400 dark:text-blue-300' : 'bg-gray-50 border-gray-300 dark:border-slate-600 text-gray-500 dark:text-gray-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400'}`}>
                              {ch.replace(/_/g, ' ')}
                            </button>
                          ))}
                        </div>
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
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3"><p className="font-medium text-gray-900 dark:text-white">{c.name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{c.triggerType}</p></td>
                  <td className="px-4 py-3"><div className="flex items-center justify-center gap-1">{c.channels.map((ch) => <ChannelIcon key={ch} channel={ch} />)}</div></td>
                  <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">{c.segmentName}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{c.sent}</td>
                  <td className="px-4 py-3 text-right"><span className={`font-medium ${c.sent > 0 ? (c.opened / c.sent * 100 >= 50 ? 'text-green-600' : 'text-yellow-600') : 'text-gray-400'}`}>{c.sent > 0 ? `${Math.round(c.opened / c.sent * 100)}%` : '-'}</span></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleToggleActivate(c)} className={`p-1 rounded ${c.status === 'ACTIVE' ? 'text-yellow-500 hover:text-yellow-600' : 'text-green-500 hover:text-green-600'}`} title={c.status === 'ACTIVE' ? 'Pause' : 'Activate'}>
                        {c.status === 'ACTIVE' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => startEdit(c)} className="p-1 text-gray-400 hover:text-blue-600 rounded" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-1 text-gray-400 hover:text-red-600 rounded" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
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
