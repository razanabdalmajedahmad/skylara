'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import {
  Globe,
  FileText,
  Search,
  Navigation,
  Palette,
  Loader2,
  RefreshCw,
  CheckCircle,
  Clock,
  ExternalLink,
  ArrowRight,
  Rocket,
} from 'lucide-react';

interface WebsiteSettings {
  id: string;
  status: 'PUBLISHED' | 'DRAFT';
  customDomain: string | null;
  pagesCount: number;
  publishedPagesCount: number;
  companyName: string;
  tagline: string;
  lastPublishedAt: string | null;
}

export default function WebsiteOverviewPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ success: boolean; data: WebsiteSettings }>('/website/settings');
      setSettings(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load website settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await apiPost<{ success: boolean; data: WebsiteSettings }>('/website/publish');
      setSettings(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to publish website');
    } finally {
      setPublishing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading website overview...</span>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const isPublished = settings?.status === 'PUBLISHED';

  const kpiCards = [
    { label: 'Total Pages', value: settings?.pagesCount ?? 0, icon: FileText, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Published Pages', value: settings?.publishedPagesCount ?? 0, icon: CheckCircle, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    {
      label: 'Custom Domain',
      value: settings?.customDomain ? 'Active' : 'Not set',
      icon: Globe,
      color: settings?.customDomain ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' : 'text-gray-500 bg-gray-100 dark:bg-gray-700',
    },
  ];

  const quickLinks = [
    { label: 'Content & Pages', description: 'Manage pages and content', href: '/dashboard/website/pages', icon: FileText },
    { label: 'SEO Settings', description: 'Meta tags, OG images, previews', href: '/dashboard/website/seo', icon: Search },
    { label: 'Branding & Settings', description: 'Colors, logos, analytics', href: '/dashboard/website/settings', icon: Palette },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Status Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${isPublished ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
              {isPublished ? <CheckCircle className="w-6 h-6 text-green-600" /> : <Clock className="w-6 h-6 text-amber-600" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {settings?.companyName || 'Your Website'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Status: <span className={isPublished ? 'text-green-600 dark:text-green-400 font-medium' : 'text-amber-600 dark:text-amber-400 font-medium'}>
                  {isPublished ? 'Published' : 'Draft'}
                </span>
                {settings?.lastPublishedAt && (
                  <span className="ml-2 text-gray-400 dark:text-gray-500">
                    Last published {new Date(settings.lastPublishedAt).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {settings?.customDomain && (
              <a
                href={`https://${settings.customDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Visit Site
              </a>
            )}
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              {isPublished ? 'Republish' : 'Publish'}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                    {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <button
              key={link.href}
              onClick={() => router.push(link.href)}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-left hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{link.label}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{link.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
