'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import {
  FileText,
  Plus,
  Loader2,
  RefreshCw,
  Inbox,
  Eye,
  EyeOff,
  Pencil,
  X,
  Check,
} from 'lucide-react';

interface WebPage {
  id: string;
  type: string;
  title: string;
  slug: string;
  published: boolean;
  updatedAt: string;
}

const PAGE_TYPE_COLORS: Record<string, string> = {
  HOME: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ABOUT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  SERVICES: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  EVENTS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  CONTACT: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  CUSTOM: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const PAGE_TYPES = ['HOME', 'ABOUT', 'SERVICES', 'EVENTS', 'CONTACT', 'CUSTOM'];

export default function WebsitePagesPage() {
  const router = useRouter();
  const [pages, setPages] = useState<WebPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [newPage, setNewPage] = useState({ type: 'CUSTOM', title: '', slug: '' });

  const fetchPages = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ success: boolean; data: WebPage[] }>('/website/pages');
      setPages(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newPage.title.trim() || !newPage.slug.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await apiPost<{ success: boolean; data: WebPage }>('/website/pages', newPage);
      setPages((prev) => [...prev, res.data]);
      setShowModal(false);
      setNewPage({ type: 'CUSTOM', title: '', slug: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to create page');
    } finally {
      setCreating(false);
    }
  };

  const handleTogglePublish = async (page: WebPage) => {
    setToggling(page.id);
    try {
      const res = await apiPatch<{ success: boolean; data: WebPage }>(`/website/pages/${page.id}`, {
        published: !page.published,
      });
      setPages((prev) => prev.map((p) => (p.id === page.id ? res.data : p)));
    } catch (err: any) {
      setError(err.message || 'Failed to update page');
    } finally {
      setToggling(null);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  useEffect(() => {
    fetchPages();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading pages...</span>
      </div>
    );
  }

  if (error && pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        <button onClick={fetchPages} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Website Pages</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Page
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        {pages.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No pages yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create your first page to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {pages.map((page) => (
              <div key={page.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <FileText className="w-5 h-5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{page.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${PAGE_TYPE_COLORS[page.type] || PAGE_TYPE_COLORS.CUSTOM}`}>
                        {page.type}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">/{page.slug}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button
                    onClick={() => handleTogglePublish(page)}
                    disabled={toggling === page.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      page.published
                        ? 'text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20'
                        : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {toggling === page.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : page.published ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                    {page.published ? 'Published' : 'Draft'}
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/website/pages/${page.id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Page Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create Page</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Page Type</label>
                <select
                  value={newPage.type}
                  onChange={(e) => setNewPage((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {PAGE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={newPage.title}
                  onChange={(e) => setNewPage((prev) => ({ ...prev, title: e.target.value, slug: generateSlug(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Page title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug</label>
                <div className="flex items-center">
                  <span className="text-sm text-gray-400 dark:text-gray-500 mr-1">/</span>
                  <input
                    type="text"
                    value={newPage.slug}
                    onChange={(e) => setNewPage((prev) => ({ ...prev, slug: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="page-slug"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newPage.title.trim() || !newPage.slug.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
