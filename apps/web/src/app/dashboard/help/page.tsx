'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Search, Lightbulb } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';

interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  shortAnswer: string;
  category: string;
  roles: string[];
  views: number;
}

const HELP_CATEGORIES = [
  { id: 'getting-started', label: 'Getting Started', icon: '🚀', count: 0 },
  { id: 'manifest', label: 'Manifest', icon: '📋', count: 0 },
  { id: 'checkin', label: 'Check-in', icon: '✓', count: 0 },
  { id: 'athletes', label: 'Athletes', icon: '👥', count: 0 },
  { id: 'wallet', label: 'Wallet', icon: '💰', count: 0 },
  { id: 'incidents', label: 'Incidents', icon: '⚠️', count: 0 },
  { id: 'emergency', label: 'Emergency', icon: '🚨', count: 0 },
  { id: 'offline', label: 'Offline Mode', icon: '📴', count: 0 },
];

const HELP_ARTICLES: HelpArticle[] = [];

export default function HelpPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [articles, setArticles] = useState<HelpArticle[]>(HELP_ARTICLES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setIsLoading(true);
        const response = await apiGet('/help/articles');
        if (response && Array.isArray(response)) {
          setArticles(response);
        } else {
          setArticles(HELP_ARTICLES);
        }
      } catch (error) {
        console.error('Failed to fetch help articles, using fallback:', error);
        setArticles(HELP_ARTICLES);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticles();
  }, []);

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchesSearch =
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.shortAnswer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || article.category === selectedCategory;
      const userRoles = (user?.roles || []).map((r) => r.toLowerCase());
      const isAdmin = userRoles.some((r) => r.includes('admin') || r.includes('manager') || r.includes('operator'));
      const userCanAccess = !user || isAdmin || userRoles.some((r) => article.roles.includes(r));

      return matchesSearch && matchesCategory && userCanAccess;
    });
  }, [searchQuery, selectedCategory, user, articles]);

  const visibleCategories = useMemo(() => {
    if (!user) return HELP_CATEGORIES;
    return HELP_CATEGORIES.filter((cat) =>
      articles.some((art) => art.category === cat.id && (user.roles || []).some((r) => art.roles.includes(r)))
    );
  }, [user, articles]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Help Center</h1>
        <p className="text-gray-600 dark:text-gray-400 dark:text-gray-300">Find answers to common questions</p>
      </div>

      <div className="flex">
        {/* Sidebar - Categories */}
        <aside className="w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6 sticky top-0 h-[calc(100vh-120px)] overflow-y-auto">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Categories</h2>
          <div className="space-y-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                selectedCategory === null
                  ? 'bg-[#2E86C1] text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100'
              }`}
            >
              All Articles
            </button>
            {visibleCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors flex items-center justify-between ${
                  selectedCategory === cat.id
                    ? 'bg-[#2E86C1] text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                }`}
              >
                <span>
                  {cat.icon} {cat.label}
                </span>
                <span className={`text-xs font-semibold ${selectedCategory === cat.id ? 'bg-white dark:bg-slate-800 bg-opacity-20' : 'bg-gray-200'} px-2 py-1 rounded`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E86C1] focus:border-transparent"
              />
            </div>
          </div>

          {/* Articles Grid */}
          {filteredArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/dashboard/help/${article.slug}`}
                  className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5 hover:shadow-lg hover:border-[#2E86C1] transition-all duration-200 group"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2 group-hover:text-[#2E86C1] transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                    {article.shortAnswer}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 flex-wrap">
                      {article.roles.slice(0, 2).map((role) => (
                        <span
                          key={role}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded"
                        >
                          {role}
                        </span>
                      ))}
                      {article.roles.length > 2 && (
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          +{article.roles.length - 2}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{article.views} views</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Search size={48} className="text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No articles match your search
              </h3>
              <p className="text-gray-600 dark:text-gray-400 dark:text-gray-300 text-center max-w-md mb-6">
                Try adjusting your search terms or explore other categories
              </p>
              <Link
                href="/dashboard/ideas/new"
                className="flex items-center gap-2 px-4 py-2 bg-[#2E86C1] text-white rounded-lg hover:bg-[#1B4F72] transition-colors"
              >
                <Lightbulb size={18} />
                Submit an idea
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
