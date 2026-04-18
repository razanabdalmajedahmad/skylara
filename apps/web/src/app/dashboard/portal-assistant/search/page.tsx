'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api';
import { PortalAssistantNav } from '../page';
import Link from 'next/link';
import {
  Search,
  X,
  Clock,
  Loader2,
  AlertCircle,
  Users,
  GraduationCap,
  FileText,
  Plane,
  Calendar,
  UserCheck,
  Shield,
  Wrench,
  BookOpen,
  Tag,
  ExternalLink,
  Command,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SearchResult {
  id: string;
  entityType: string;
  title: string;
  subtitle: string;
  status?: string;
  link: string;
}

type CategoryKey =
  | 'All'
  | 'Athletes'
  | 'Students'
  | 'Waivers'
  | 'Loads'
  | 'Bookings'
  | 'Events'
  | 'Staff'
  | 'Aircraft'
  | 'Gear'
  | 'Incidents'
  | 'Documents';

/* ------------------------------------------------------------------ */
/*  Category config                                                    */
/* ------------------------------------------------------------------ */

const CATEGORIES: { key: CategoryKey; icon: React.ElementType }[] = [
  { key: 'All', icon: Search },
  { key: 'Athletes', icon: Users },
  { key: 'Students', icon: GraduationCap },
  { key: 'Waivers', icon: FileText },
  { key: 'Loads', icon: Plane },
  { key: 'Bookings', icon: Calendar },
  { key: 'Events', icon: Calendar },
  { key: 'Staff', icon: UserCheck },
  { key: 'Aircraft', icon: Plane },
  { key: 'Gear', icon: Wrench },
  { key: 'Incidents', icon: Shield },
  { key: 'Documents', icon: BookOpen },
];

const ENTITY_COLOR: Record<string, string> = {
  Athletes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Students: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  Waivers: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Loads: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  Bookings: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Events: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Staff: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  Aircraft: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  Gear: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  Incidents: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  Documents: 'bg-gray-100 text-gray-700 dark:text-gray-300 dark:bg-gray-700 dark:text-gray-300',
};

const STATUS_COLOR: Record<string, string> = {
  Active: 'text-emerald-600 dark:text-emerald-400',
  Signed: 'text-emerald-600 dark:text-emerald-400',
  Open: 'text-blue-600 dark:text-blue-400',
  Boarding: 'text-amber-600 dark:text-amber-400',
  Confirmed: 'text-emerald-600 dark:text-emerald-400',
  Pending: 'text-amber-600 dark:text-amber-400',
  Investigating: 'text-red-600 dark:text-red-400',
  Resolved: 'text-gray-500 dark:text-gray-400',
  Expired: 'text-red-600 dark:text-red-400',
  Valid: 'text-emerald-600 dark:text-emerald-400',
  'In Progress': 'text-blue-600 dark:text-blue-400',
  Airworthy: 'text-emerald-600 dark:text-emerald-400',
};

/* ------------------------------------------------------------------ */
/*  Fallback (used only when API is unreachable)                       */
/* ------------------------------------------------------------------ */

const FALLBACK_RESULTS: SearchResult[] = [];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const RECENT_KEY = 'portal-assistant-recent-searches';

export default function UniversalSearchPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryKey>('All');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Keyboard shortcut (Cmd+K)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const saveRecent = (q: string) => {
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 8);
    setRecentSearches(updated);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  };

  const handleSearch = useCallback(async (searchQuery?: string) => {
    const q = (searchQuery ?? query).trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    saveRecent(q);

    try {
      const res = await apiPost<{
        success: boolean;
        data: {
          response?: string;
          results?: SearchResult[];
          queryId?: string;
        };
      }>('/portal-assistant/query', {
        query: q,
        role: user?.roles?.[0] || undefined,
        currentRoute: '/dashboard/portal-assistant/search',
      });

      if (res.success && res.data?.results && Array.isArray(res.data.results)) {
        // Map API results to SearchResult interface
        const mapped: SearchResult[] = res.data.results.map((item: any, idx: number) => ({
          id: item.id || `result-${idx}`,
          entityType: item.entityType || item.type || 'Unknown',
          title: item.title || item.name || 'Unknown',
          subtitle: item.subtitle || item.description || '',
          status: item.status,
          link: item.link || item.url || '#',
        }));
        setResults(mapped);
      } else if (res.success && res.data?.response) {
        // AI returned a text response rather than structured results
        // Create a single result entry from the response
        setResults([{
          id: res.data.queryId || 'ai-response',
          entityType: 'Documents',
          title: 'Assistant Response',
          subtitle: res.data.response.slice(0, 200),
          link: '#',
        }]);
      } else {
        setResults(FALLBACK_RESULTS);
      }
    } catch {
      setError('Search failed. Please try again.');
      setResults(FALLBACK_RESULTS);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, user?.roles]);

  const filteredResults =
    category === 'All' ? results : results.filter((r) => r.entityType === category);

  const clearRecent = (s: string) => {
    const updated = recentSearches.filter((rs) => rs !== s);
    setRecentSearches(updated);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PortalAssistantNav current="/dashboard/portal-assistant/search" />

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Universal Search</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Search across all platform entities
      </p>

      {/* Search input */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          placeholder="Search athletes, loads, waivers, bookings, events..."
          className="w-full pl-12 pr-24 py-4 text-lg rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700 dark:border-gray-600 rounded px-1.5 py-0.5">
            <Command className="w-3 h-3" />K
          </kbd>
          <button
            onClick={() => handleSearch()}
            disabled={!query.trim() || loading}
            className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </div>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const active = category === c.key;
          const count = c.key === 'All' ? results.length : results.filter((r) => r.entityType === c.key).length;
          return (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border transition-colors ${
                active
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-200 dark:border-slate-700 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {c.key}
              {searched && <span className="ml-1 text-xs opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Recent searches (before any search) */}
      {!searched && recentSearches.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> Recent Searches
          </h3>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((s) => (
              <div
                key={s}
                className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1 text-sm text-gray-700 dark:text-gray-300"
              >
                <button onClick={() => { setQuery(s); handleSearch(s); }} className="hover:text-blue-600 dark:hover:text-blue-400">
                  {s}
                </button>
                <button onClick={() => clearRecent(s)} className="ml-1 text-gray-400 hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-500 dark:text-gray-400">Searching...</span>
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} found
          </p>

          {filteredResults.length === 0 ? (
            <div className="text-center py-16">
              <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-1">Try a different search term or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredResults.map((r) => (
                <Link
                  key={r.id}
                  href={r.link}
                  className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 hover:shadow-md transition-shadow group"
                >
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${ENTITY_COLOR[r.entityType] || 'bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-300'}`}>
                    {r.entityType}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {r.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{r.subtitle}</p>
                  </div>
                  {r.status && (
                    <span className={`text-xs font-medium whitespace-nowrap ${STATUS_COLOR[r.status] || 'text-gray-500'}`}>
                      {r.status}
                    </span>
                  )}
                  <ExternalLink className="w-4 h-4 text-gray-300 dark:text-gray-600 dark:text-gray-400 group-hover:text-blue-500 flex-shrink-0 mt-0.5" />
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Empty state before search */}
      {!searched && !loading && recentSearches.length === 0 && (
        <div className="text-center py-20">
          <Search className="w-16 h-16 text-gray-200 dark:text-gray-700 dark:text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-1">Search everything</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Find athletes, students, waivers, loads, bookings, events, staff, aircraft, gear, incidents, and documents from one place.
          </p>
        </div>
      )}
    </div>
  );
}
