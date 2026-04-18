'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import {
  ClipboardList,
  Plus,
  Loader2,
  Inbox,
  RefreshCw,
  X,
  BarChart3,
  Users,
  Star,
} from 'lucide-react';

interface Survey {
  id: string;
  title: string;
  type: string;
  description: string;
  status: string;
  responseCount: number;
  averageScore: number | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-300',
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CLOSED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const TYPE_LABELS: Record<string, string> = {
  NPS: 'Net Promoter Score',
  CSAT: 'Customer Satisfaction',
  GENERAL: 'General Survey',
};

const SURVEY_TYPES = ['NPS', 'CSAT', 'GENERAL'] as const;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'NPS' as string, description: '' });

  const fetchSurveys = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ success: boolean; data: Survey[] }>('/marketing/surveys');
      setSurveys(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load surveys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSurveys(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      await apiPost('/marketing/surveys', { title: form.title, type: form.type, description: form.description });
      setForm({ title: '', type: 'NPS', description: '' });
      setShowCreate(false);
      await fetchSurveys();
    } catch (err: any) {
      setError(err.message || 'Failed to create survey');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading surveys...</span>
      </div>
    );
  }

  if (error && surveys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        <button onClick={fetchSurveys} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
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
          <ClipboardList className="w-6 h-6 text-purple-600" /> Surveys
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Survey
        </button>
      </div>

      {surveys.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-12 text-center">
          <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No surveys created yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-1">Create a survey to collect feedback from your athletes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {surveys.map((s) => (
            <div key={s.id} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{s.title}</h3>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-600'}`}>
                      {s.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{TYPE_LABELS[s.type] || s.type}</p>
                </div>
              </div>
              {s.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{s.description}</p>
              )}
              <div className="flex items-center gap-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <Users className="w-3.5 h-3.5" />
                  <span>{s.responseCount ?? 0} responses</span>
                </div>
                {s.averageScore !== null && s.averageScore !== undefined && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {s.type === 'NPS' ? (
                      <BarChart3 className="w-3.5 h-3.5" />
                    ) : (
                      <Star className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {s.type === 'NPS' ? `NPS: ${s.averageScore}` : `Avg: ${s.averageScore.toFixed(1)}`}
                    </span>
                  </div>
                )}
                <span className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 ml-auto">{formatDate(s.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 pb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Survey</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="px-6 pb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter survey title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {SURVEY_TYPES.map((t) => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
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
                  placeholder="Describe the survey purpose"
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
