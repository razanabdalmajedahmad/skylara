'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiGet } from '@/lib/api';
import { StatusBadge, SearchInput, FilterChips, PageLoading } from '@/components/onboarding/shared';
import type { OnboardingTemplate, FilterChip } from '@/lib/onboarding/types';
import { Plus, Copy, ExternalLink, Settings, Globe, Mail, Hash, Layers } from 'lucide-react';
import Link from 'next/link';

export default function TemplatesPage() {
  const [data, setData] = useState<OnboardingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filters: FilterChip[] = [{ label: 'All', value: 'all' }, { label: 'Active', value: 'ACTIVE' }, { label: 'Draft', value: 'DRAFT' }, { label: 'Archived', value: 'ARCHIVED' }];

  useEffect(() => {
    (async () => {
      try {
        const raw = await apiGet<OnboardingTemplate[]>('/onboarding/templates');
        setData(Array.isArray(raw) ? raw : []);
      } catch {
        setData([]);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let d = data;
    if (search) d = d.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
    if (filter !== 'all') d = d.filter((t) => t.status === filter);
    return d;
  }, [data, search, filter]);

  if (loading) return <PageLoading label="Loading templates..." />;

  const accessIcon = (mode: string) => {
    switch (mode) {
      case 'PUBLIC': return <Globe className="w-3.5 h-3.5 text-green-500" />;
      case 'INVITE_ONLY': return <Mail className="w-3.5 h-3.5 text-blue-500" />;
      case 'TOKEN': return <Hash className="w-3.5 h-3.5 text-purple-500" />;
      case 'INTERNAL_ONLY': return <Layers className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />;
      default: return null;
    }
  };

  const copyLink = (slug: string | null, flowKey: string) => {
    const url = slug ? `${window.location.origin}/join/skyhighdz/${slug}` : `${window.location.origin}/app/onboarding/${flowKey}`;
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="flex-1 max-w-md"><SearchInput value={search} onChange={setSearch} placeholder="Search templates..." /></div>
          <FilterChips chips={filters} active={filter} onToggle={setFilter} />
        </div>
        <Link href="/dashboard/onboarding/templates/create" className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors self-start">
          <Plus className="w-4 h-4" /> New Template
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((tpl) => (
          <div key={tpl.id} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4 flex flex-col">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/dashboard/onboarding/templates/${tpl.id}`} className="font-medium text-gray-900 dark:text-white text-sm truncate hover:text-blue-600 dark:hover:text-blue-400">{tpl.name}</Link>
                  <StatusBadge status={tpl.status === 'ACTIVE' ? 'green' : tpl.status === 'DRAFT' ? 'yellow' : 'gray'} label={tpl.status} />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status="blue" label={tpl.category} />
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">{accessIcon(tpl.accessMode)}<span>{tpl.accessMode.replace('_', ' ').toLowerCase()}</span></div>
                </div>
              </div>
              <span className="text-xs text-gray-400">v{tpl.version}</span>
            </div>
            <div className="flex-1 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-lg font-bold text-gray-900 dark:text-white">{tpl.applicationsCount}</p><p className="text-[11px] text-gray-500 dark:text-gray-400">Applications</p></div>
                <div><p className="text-lg font-bold text-gray-900 dark:text-white">{tpl.completionRate}%</p><p className="text-[11px] text-gray-500 dark:text-gray-400">Completion</p></div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button onClick={() => copyLink(tpl.externalSlug, tpl.flowKey)} className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"><Copy className="w-3.5 h-3.5" /> Copy Link</button>
              {tpl.externalSlug && (
                <a href={`/join/${tpl.externalSlug}/${tpl.flowKey}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"><ExternalLink className="w-3.5 h-3.5" /> Preview</a>
              )}
              <Link href={`/dashboard/onboarding/templates/${tpl.id}`} className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ml-auto"><Settings className="w-3.5 h-3.5" /> Edit</Link>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="col-span-3 text-center py-12 text-sm text-gray-500 dark:text-gray-400">No templates found</div>}
      </div>
    </div>
  );
}
