'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Edit3,
  Archive,
  BookOpen,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Filter,
  X,
  Check,
  ChevronDown,
  FileText,
  Clock,
  Tag,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api';

interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  module: string;
  status: 'active' | 'draft' | 'archived';
  lastUpdated: string;
  author: string;
}

type ArticleCategory = 'Manifest' | 'Safety' | 'Training' | 'Payments' | 'Events' | 'General';
type ArticleStatus = 'active' | 'draft' | 'archived';

const CATEGORIES: ArticleCategory[] = ['Manifest', 'Safety', 'Training', 'Payments', 'Events', 'General'];
const MODULES: string[] = ['Manifest', 'Check-in', 'Athletes', 'Bookings', 'Wallet', 'Incidents', 'Documents', 'Settings', 'General'];
const STATUSES: ArticleStatus[] = ['active', 'draft', 'archived'];

const FALLBACK_ARTICLES: KnowledgeArticle[] = [];

const STATUS_CONFIG: Record<ArticleStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  draft: { label: 'Draft', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  archived: { label: 'Archived', className: 'bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-400' },
};

export default function KnowledgeBasePage() {
  const { user } = useAuth();
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterModule, setFilterModule] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // New article form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<ArticleCategory>('General');
  const [newModule, setNewModule] = useState('General');
  const [newStatus, setNewStatus] = useState<ArticleStatus>('draft');

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        const response = await apiGet<{ data: KnowledgeArticle[] }>('/ai/knowledge');
        if (response?.data && Array.isArray(response.data)) {
          setArticles(response.data);
        } else {
          setArticles([]);
        }
      } catch {
        setArticles(FALLBACK_ARTICLES);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchesSearch =
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || article.category === filterCategory;
      const matchesStatus = filterStatus === 'all' || article.status === filterStatus;
      const matchesModule = filterModule === 'all' || article.module === filterModule;
      return matchesSearch && matchesCategory && matchesStatus && matchesModule;
    });
  }, [articles, searchQuery, filterCategory, filterStatus, filterModule]);

  const handleAddArticle = async () => {
    if (!newTitle.trim()) return;

    setSaving(true);
    try {
      const response = await apiPost<{ data: KnowledgeArticle }>('/ai/knowledge', {
        title: newTitle,
        content: newContent,
        category: newCategory,
        module: newModule,
        status: newStatus,
      });
      if (response?.data) {
        setArticles((prev) => [response.data, ...prev]);
      }
    } catch (err) {
      // Add locally as fallback
      const newArticle: KnowledgeArticle = {
        id: `ka_${Date.now()}`,
        title: newTitle,
        content: newContent,
        category: newCategory,
        module: newModule,
        status: newStatus,
        lastUpdated: new Date().toISOString(),
        author: user?.firstName ? `${user.firstName} ${user.lastName}` : 'You',
      };
      setArticles((prev) => [newArticle, ...prev]);
    } finally {
      setSaving(false);
      setShowAddForm(false);
      setNewTitle('');
      setNewContent('');
      setNewCategory('General');
      setNewModule('General');
      setNewStatus('draft');
    }
  };

  const handleArchive = async (articleId: string) => {
    try {
      await apiPost(`/ai/knowledge/${articleId}/archive`);
    } catch (err) {
      // ignore
    }
    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, status: 'archived' as const, lastUpdated: new Date().toISOString() } : a))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6">
        <Link
          href="/dashboard/ai"
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white dark:hover:text-white mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to AI Hub
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Knowledge Base</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-300">
                {articles.length} articles - {articles.filter((a) => a.status === 'active').length} active
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Article
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Inline Add Form */}
        {showAddForm && (
          <div className="bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">New Knowledge Article</h3>
              <button onClick={() => setShowAddForm(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Article title..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ArticleCategory)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Module</label>
                <select
                  value={newModule}
                  onChange={(e) => setNewModule(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {MODULES.map((mod) => (
                    <option key={mod} value={mod}>{mod}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ArticleStatus)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Article content..."
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddArticle}
                disabled={!newTitle.trim() || saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Article
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Modules</option>
            {MODULES.map((mod) => (
              <option key={mod} value={mod}>{mod}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Articles Table */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Module</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Updated</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredArticles.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{article.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">by {article.author}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                        <Tag className="w-3 h-3" />
                        {article.category}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{article.module}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${STATUS_CONFIG[article.status].className}`}>
                        {STATUS_CONFIG[article.status].label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        {new Date(article.lastUpdated).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingId(article.id === editingId ? null : article.id)}
                          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {article.status !== 'archived' && (
                          <button
                            onClick={() => handleArchive(article.id)}
                            className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg transition-colors"
                            title="Archive"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
            {filteredArticles.map((article) => (
              <div key={article.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-gray-900 dark:text-white flex-1">{article.title}</p>
                  <span className={`text-xs font-medium px-2 py-1 rounded ml-2 ${STATUS_CONFIG[article.status].className}`}>
                    {STATUS_CONFIG[article.status].label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">{article.category}</span>
                  <span className="text-gray-500 dark:text-gray-400">{article.module}</span>
                  <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400">{new Date(article.lastUpdated).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingId(article.id === editingId ? null : article.id)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Edit
                  </button>
                  {article.status !== 'archived' && (
                    <button
                      onClick={() => handleArchive(article.id)}
                      className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredArticles.length === 0 && (
            <div className="p-12 text-center">
              <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No articles found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Try adjusting your filters or add a new article
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
