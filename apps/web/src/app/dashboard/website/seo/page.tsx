'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import {
  Search,
  Loader2,
  RefreshCw,
  Save,
  CheckCircle,
  Inbox,
  Globe,
  Image,
} from 'lucide-react';

interface PageSeo {
  id: string;
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
}

export default function WebsiteSeoPage() {
  const [pages, setPages] = useState<PageSeo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const fetchPages = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ success: boolean; data: PageSeo[] }>('/website/pages');
      setPages(
        (res.data || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          metaTitle: p.metaTitle || '',
          metaDescription: p.metaDescription || '',
          ogImage: p.ogImage || '',
        }))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (page: PageSeo) => {
    setSaving(page.id);
    setSavedId(null);
    setError(null);
    try {
      await apiPatch(`/website/pages/${page.id}`, {
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        ogImage: page.ogImage,
      });
      setSavedId(page.id);
      setTimeout(() => setSavedId(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save SEO settings');
    } finally {
      setSaving(null);
    }
  };

  const updatePage = (id: string, field: keyof PageSeo, value: string) => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  useEffect(() => {
    fetchPages();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading SEO settings...</span>
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
    <div className="space-y-6 max-w-3xl">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">SEO Settings</h2>

      {pages.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-center py-12">
          <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No pages to configure</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create pages first in the Pages section</p>
        </div>
      ) : (
        pages.map((page) => (
          <div key={page.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{page.title}</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">/{page.slug}</p>
              </div>
              {savedId === page.id && (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle className="w-3.5 h-3.5" /> Saved
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Meta Title</label>
                <input
                  type="text"
                  value={page.metaTitle}
                  onChange={(e) => updatePage(page.id, 'metaTitle', e.target.value)}
                  maxLength={60}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Page title for search engines (max 60 chars)"
                />
                <p className="text-xs text-gray-400 mt-0.5">{page.metaTitle.length}/60</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Meta Description</label>
                <textarea
                  value={page.metaDescription}
                  onChange={(e) => updatePage(page.id, 'metaDescription', e.target.value)}
                  maxLength={160}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Brief description for search results (max 160 chars)"
                />
                <p className="text-xs text-gray-400 mt-0.5">{page.metaDescription.length}/160</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">OG Image URL</label>
                <input
                  type="url"
                  value={page.ogImage}
                  onChange={(e) => updatePage(page.id, 'ogImage', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Google Preview */}
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Google Preview
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-400 font-medium truncate">
                {page.metaTitle || page.title || 'Page Title'}
              </p>
              <p className="text-xs text-green-700 dark:text-green-500 truncate mt-0.5">
                yoursite.com/{page.slug}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                {page.metaDescription || 'No description set. Add a meta description to improve click-through rates.'}
              </p>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => handleSave(page)}
                disabled={saving === page.id}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving === page.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save SEO
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
