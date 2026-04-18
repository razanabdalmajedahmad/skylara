'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import {
  Megaphone,
  Plus,
  Loader2,
  Inbox,
  RefreshCw,
  X,
  Play,
  Pause,
  Send,
  MousePointer,
  Eye,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  channel: string;
  description: string;
  status: string;
  sentCount: number;
  openCount: number;
  clickCount: number;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-300',
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PAUSED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  COMPLETED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const TABS = ['All', 'Draft', 'Published', 'Paused', 'Completed'] as const;
const CHANNELS = ['EMAIL', 'PUSH', 'SMS', 'IN_APP'] as const;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('All');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', channel: 'EMAIL', description: '' });

  const fetchCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ success: boolean; data: Campaign[] }>('/marketing/campaigns');
      setCampaigns(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const filtered = activeTab === 'All'
    ? campaigns
    : campaigns.filter((c) => c.status === activeTab.toUpperCase());

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      await apiPost('/marketing/campaigns', { name: form.name, channel: form.channel, description: form.description });
      setForm({ name: '', channel: 'EMAIL', description: '' });
      setShowCreate(false);
      await fetchCampaigns();
    } catch (err: any) {
      setError(err.message || 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await apiPatch(`/marketing/campaigns/${id}`, { status });
      await fetchCampaigns();
    } catch (err: any) {
      setError(err.message || 'Failed to update campaign');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading campaigns...</span>
      </div>
    );
  }

  if (error && campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        <button onClick={fetchCampaigns} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-blue-600" /> Campaigns
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Campaign
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-12 text-center">
          <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No campaigns found</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-1">Create a campaign to start engaging your audience</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{c.name}</h3>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-600'}`}>
                      {c.status}
                    </span>
                  </div>
                  {c.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{c.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400">
                    <span className="uppercase">{c.channel}</span>
                    <span>{formatDate(c.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4 shrink-0">
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 hidden sm:flex">
                    <span className="flex items-center gap-1"><Send className="w-3.5 h-3.5" /> {c.sentCount ?? 0}</span>
                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {c.openCount ?? 0}</span>
                    <span className="flex items-center gap-1"><MousePointer className="w-3.5 h-3.5" /> {c.clickCount ?? 0}</span>
                  </div>
                  <div className="flex gap-1">
                    {(c.status === 'DRAFT' || c.status === 'PAUSED') && (
                      <button
                        onClick={() => handleStatusChange(c.id, 'PUBLISHED')}
                        className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                        title="Publish"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    {(c.status === 'PUBLISHED' || c.status === 'ACTIVE') && (
                      <button
                        onClick={() => handleStatusChange(c.id, 'PAUSED')}
                        className="p-1.5 rounded-lg text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                        title="Pause"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 pb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Campaign</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="px-6 pb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Campaign Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter campaign name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Channel</label>
                <select
                  value={form.channel}
                  onChange={(e) => setForm({ ...form, channel: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {CHANNELS.map((ch) => (
                    <option key={ch} value={ch}>{ch.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Describe this campaign"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
