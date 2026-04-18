'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import {
  Newspaper,
  Plus,
  Loader2,
  Inbox,
  RefreshCw,
  X,
  Pin,
  PinOff,
  Image as ImageIcon,
} from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  body: string;
  category: string;
  imageUrl: string | null;
  isPinned: boolean;
  status: string;
  createdAt: string;
}

const CATEGORIES = ['ANNOUNCEMENT', 'EVENT', 'SAFETY', 'PROMOTION', 'COMMUNITY', 'UPDATE'] as const;

const CATEGORY_COLORS: Record<string, string> = {
  ANNOUNCEMENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  EVENT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  SAFETY: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  PROMOTION: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  COMMUNITY: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  UPDATE: 'bg-gray-100 text-gray-700 dark:text-gray-300 dark:bg-gray-700 dark:text-gray-300',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', category: 'ANNOUNCEMENT', imageUrl: '' });

  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ success: boolean; data: NewsItem[] }>('/marketing/news');
      setNews(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load news');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNews(); }, []);

  const filtered = filterCategory === 'ALL'
    ? news
    : news.filter((n) => n.category === filterCategory);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    setCreating(true);
    try {
      await apiPost('/marketing/news', {
        title: form.title,
        body: form.body,
        category: form.category,
        imageUrl: form.imageUrl || null,
      });
      setForm({ title: '', body: '', category: 'ANNOUNCEMENT', imageUrl: '' });
      setShowCreate(false);
      await fetchNews();
    } catch (err: any) {
      setError(err.message || 'Failed to create news item');
    } finally {
      setCreating(false);
    }
  };

  const handleTogglePin = async (id: string, isPinned: boolean) => {
    try {
      await apiPatch(`/marketing/news/${id}`, { isPinned: !isPinned });
      await fetchNews();
    } catch (err: any) {
      setError(err.message || 'Failed to update news item');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading news...</span>
      </div>
    );
  }

  if (error && news.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        <button onClick={fetchNews} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
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
          <Newspaper className="w-6 h-6 text-rose-600" /> Local News
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Post News
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['ALL', ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              filterCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {cat === 'ALL' ? 'All' : cat.charAt(0) + cat.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-12 text-center">
          <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No news items found</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-1">Post a news item to keep your community informed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.id} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5">
              <div className="flex items-start gap-4">
                {item.imageUrl && (
                  <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden shrink-0 relative">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      sizes="64px"
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {item.isPinned && <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.title}</h3>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full shrink-0 ${CATEGORY_COLORS[item.category] || 'bg-gray-100 text-gray-600'}`}>
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{item.body}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-2">{formatDate(item.createdAt)}</p>
                </div>
                <button
                  onClick={() => handleTogglePin(item.id, item.isPinned)}
                  className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                    item.isPinned
                      ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                      : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={item.isPinned ? 'Unpin' : 'Pin'}
                >
                  {item.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 pb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Post News Item</h2>
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
                  placeholder="News headline"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Write the news content"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Image URL</label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" aria-hidden />
                    <input
                      type="url"
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://..."
                    />
                  </div>
                </div>
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
                  Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
