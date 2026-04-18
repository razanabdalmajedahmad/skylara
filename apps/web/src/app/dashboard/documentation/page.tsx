'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  BookOpen,
  Settings,
  Code2,
  Plug,
  GitBranch,
  Database,
  AlertTriangle,
  Clock,
  ArrowRight,
  Star,
  History,
  X,
  FileText,
  Loader2,
} from 'lucide-react';

const NAV_LINKS = [
  { href: '/dashboard/documentation', label: 'Overview' },
  { href: '/dashboard/documentation/user-guides', label: 'User Guides' },
  { href: '/dashboard/documentation/operations', label: 'Operations' },
  { href: '/dashboard/documentation/api', label: 'API Reference' },
  { href: '/dashboard/documentation/integrations', label: 'Integrations' },
  { href: '/dashboard/documentation/process-flows', label: 'Process Flows' },
  { href: '/dashboard/documentation/troubleshooting', label: 'Troubleshooting' },
  { href: '/dashboard/documentation/changelog', label: 'Changelog' },
];

interface RecentArticle {
  title: string;
  href: string;
  section: string;
  visitedAt: string;
}

const CATEGORIES = [
  {
    title: 'User Guides',
    description: 'Role-based guides for admins, manifest staff, instructors, and athletes.',
    icon: BookOpen,
    href: '/dashboard/documentation/user-guides',
    color: 'text-blue-500 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    articles: 0,
  },
  {
    title: 'Operations',
    description: 'Standard operating procedures, safety protocols, and daily checklists.',
    icon: Settings,
    href: '/dashboard/documentation/operations',
    color: 'text-emerald-500 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    articles: 0,
  },
  {
    title: 'API Reference',
    description: 'RESTful API endpoints, authentication, request/response schemas.',
    icon: Code2,
    href: '/dashboard/documentation/api',
    color: 'text-violet-500 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    articles: 0,
  },
  {
    title: 'Integrations',
    description: 'Connect Stripe, SendGrid, Twilio, weather APIs, and more.',
    icon: Plug,
    href: '/dashboard/documentation/integrations',
    color: 'text-orange-500 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    articles: 0,
  },
  {
    title: 'Process Flows',
    description: 'Visual workflows for onboarding, manifesting, load lifecycle, and AFF progression.',
    icon: GitBranch,
    href: '/dashboard/documentation/process-flows',
    color: 'text-pink-500 dark:text-pink-400',
    bg: 'bg-pink-50 dark:bg-pink-950/40',
    articles: 0,
  },
  {
    title: 'Data Model',
    description: 'Entity relationships, database schema, and field-level documentation.',
    icon: Database,
    href: '/dashboard/documentation/process-flows',
    color: 'text-cyan-500 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    articles: 0,
  },
  {
    title: 'Troubleshooting',
    description: 'Common issues, error codes, and step-by-step resolution guides.',
    icon: AlertTriangle,
    href: '/dashboard/documentation/troubleshooting',
    color: 'text-amber-500 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    articles: 0,
  },
  {
    title: 'Changelog',
    description: 'Version history, release notes, and platform updates.',
    icon: Clock,
    href: '/dashboard/documentation/changelog',
    color: 'text-gray-500 dark:text-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-950/40',
    articles: 0,
  },
];

const POPULAR_DOCS = [
  { title: 'Creating a Load Manifest', href: '/dashboard/documentation/user-guides', section: 'Manifest Staff' },
  { title: 'Tandem Customer Workflow', href: '/dashboard/documentation/process-flows', section: 'Process Flows' },
  { title: 'Stripe Payment Setup', href: '/dashboard/documentation/integrations', section: 'Integrations' },
  { title: 'Daily Operations Checklist', href: '/dashboard/documentation/operations', section: 'Operations' },
  { title: 'AFF Student Progression', href: '/dashboard/documentation/process-flows', section: 'Process Flows' },
  { title: 'Authentication & JWT Tokens', href: '/dashboard/documentation/api', section: 'API Reference' },
  { title: 'Weather Decision Matrix', href: '/dashboard/documentation/operations', section: 'Operations' },
  { title: 'Load Lifecycle States', href: '/dashboard/documentation/process-flows', section: 'Process Flows' },
];

const ALL_SEARCHABLE = [
  { title: 'Dashboard Overview & KPIs', section: 'User Guides', href: '/dashboard/documentation/user-guides' },
  { title: 'Creating a Load Manifest', section: 'User Guides', href: '/dashboard/documentation/user-guides' },
  { title: 'Daily Operations Checklist', section: 'Operations', href: '/dashboard/documentation/operations' },
  { title: 'Safety Protocols', section: 'Operations', href: '/dashboard/documentation/operations' },
  { title: 'Weather Decision Matrix', section: 'Operations', href: '/dashboard/documentation/operations' },
  { title: 'Authentication (JWT)', section: 'API Reference', href: '/dashboard/documentation/api' },
  { title: 'POST /api/loads', section: 'API Reference', href: '/dashboard/documentation/api' },
  { title: 'Stripe Payment Integration', section: 'Integrations', href: '/dashboard/documentation/integrations' },
  { title: 'SendGrid Email Setup', section: 'Integrations', href: '/dashboard/documentation/integrations' },
  { title: 'Tandem Customer Flow', section: 'Process Flows', href: '/dashboard/documentation/process-flows' },
  { title: 'AFF Student Progression', section: 'Process Flows', href: '/dashboard/documentation/process-flows' },
  { title: 'Manifest Not Loading', section: 'Troubleshooting', href: '/dashboard/documentation/troubleshooting' },
  { title: 'Payment Failed Errors', section: 'Troubleshooting', href: '/dashboard/documentation/troubleshooting' },
  { title: 'v2.0 Release Notes', section: 'Changelog', href: '/dashboard/documentation/changelog' },
  { title: 'Emergency Procedures', section: 'Operations', href: '/dashboard/documentation/operations' },
  { title: 'Gear Inspection Protocol', section: 'Operations', href: '/dashboard/documentation/operations' },
  { title: 'Athlete Registration Flow', section: 'Process Flows', href: '/dashboard/documentation/process-flows' },
  { title: 'WebSocket Real-Time Setup', section: 'Integrations', href: '/dashboard/documentation/integrations' },
  { title: 'USPA License Verification', section: 'Integrations', href: '/dashboard/documentation/integrations' },
  { title: 'Incident Reporting Process', section: 'Operations', href: '/dashboard/documentation/operations' },
];

export default function DocumentationPage() {
  const [search, setSearch] = useState('');
  const [recentArticles, setRecentArticles] = useState<RecentArticle[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem('skylara-docs-recent');
      if (stored) {
        setRecentArticles(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return ALL_SEARCHABLE.filter(
      (item) =>
        item.title.toLowerCase().includes(q) || item.section.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [search]);

  const trackVisit = (title: string, href: string, section: string) => {
    try {
      const entry: RecentArticle = { title, href, section, visitedAt: new Date().toISOString() };
      const existing = JSON.parse(localStorage.getItem('skylara-docs-recent') || '[]') as RecentArticle[];
      const filtered = existing.filter((a) => a.title !== title);
      const updated = [entry, ...filtered].slice(0, 5);
      localStorage.setItem('skylara-docs-recent', JSON.stringify(updated));
      setRecentArticles(updated);
    } catch {
      // ignore
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-800 bg-white dark:bg-slate-800 dark:bg-gray-900 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                  link.href === '/dashboard/documentation'
                    ? 'bg-gray-900 text-white dark:bg-white dark:bg-slate-800 dark:text-gray-900'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Documentation Center
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Everything you need to operate, configure, and extend your SkyLara dropzone management platform.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto mb-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search documentation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-10 py-3 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-base"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-800 dark:bg-gray-900 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl shadow-lg z-30 overflow-hidden">
              {searchResults.map((result, i) => (
                <Link
                  key={i}
                  href={result.href}
                  onClick={() => {
                    trackVisit(result.title, result.href, result.section);
                    setSearch('');
                  }}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900 dark:text-white">{result.title}</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                    {result.section}
                  </span>
                </Link>
              ))}
            </div>
          )}
          {search.trim() && searchResults.length === 0 && (
            <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-800 dark:bg-gray-900 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl shadow-lg z-30 p-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No results found for &quot;{search}&quot;</p>
            </div>
          )}
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.title}
                href={cat.href}
                onClick={() => trackVisit(cat.title, cat.href, 'Category')}
                className="group p-5 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-800 bg-white dark:bg-slate-800 dark:bg-gray-900 hover:shadow-md transition-all hover:border-gray-300 dark:border-slate-600 dark:hover:border-gray-700"
              >
                <div className={`w-10 h-10 rounded-lg ${cat.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${cat.color}`} />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {cat.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                  {cat.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400">{cat.articles} articles</span>
                  <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 dark:text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recently Viewed */}
          <div className="bg-white dark:bg-slate-800 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Recently Viewed</h2>
            </div>
            {recentArticles.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-8 h-8 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No recently viewed articles yet.</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-1">Articles you visit will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentArticles.map((article, i) => (
                  <Link
                    key={i}
                    href={article.href}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{article.title}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400">{article.section}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(article.visitedAt).toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Popular Docs */}
          <div className="bg-white dark:bg-slate-800 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-amber-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Popular Documentation</h2>
            </div>
            <div className="space-y-2">
              {POPULAR_DOCS.map((doc, i) => (
                <Link
                  key={i}
                  href={doc.href}
                  onClick={() => trackVisit(doc.title, doc.href, doc.section)}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-400 w-4">{i + 1}</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{doc.title}</p>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                    {doc.section}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
