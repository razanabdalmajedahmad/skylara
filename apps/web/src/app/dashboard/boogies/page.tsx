'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, Users, MapPin, Clock, ChevronRight, Search, Filter, Copy, Archive, Eye, Zap, Globe } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface Boogie {
  id: number;
  uuid: string;
  title: string;
  subtitle: string | null;
  eventType: string;
  discipline: string | null;
  country: string | null;
  city: string | null;
  startDate: string;
  endDate: string;
  status: string;
  maxParticipants: number;
  currentParticipants: number;
  currency: string;
  heroImageUrl: string | null;
  organizerName: string | null;
  _count?: { registrations: number; packages: number };
}

type Tab = 'overview' | 'calendar' | 'events';
type StatusFilter = 'all' | 'DRAFT' | 'PUBLISHED' | 'REGISTRATION_OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

const EVENT_TYPES: Record<string, { label: string; color: string }> = {
  BOOGIE: { label: 'Boogie', color: 'bg-purple-100 text-purple-700' },
  SKILLS_CAMP: { label: 'Skills Camp', color: 'bg-blue-100 text-blue-700' },
  COACH_CAMP: { label: 'Coach Camp', color: 'bg-sky-100 text-sky-700' },
  FREEFLY_CAMP: { label: 'Freefly Camp', color: 'bg-indigo-100 text-indigo-700' },
  ANGLE_CAMP: { label: 'Angle Camp', color: 'bg-teal-100 text-teal-700' },
  TRACKING_CAMP: { label: 'Tracking Camp', color: 'bg-cyan-100 text-cyan-700' },
  WINGSUIT_CAMP: { label: 'Wingsuit Camp', color: 'bg-violet-100 text-violet-700' },
  CANOPY_CAMP: { label: 'Canopy Camp', color: 'bg-orange-100 text-orange-700' },
  EXPEDITION: { label: 'Expedition', color: 'bg-amber-100 text-amber-700' },
  COMPETITION: { label: 'Competition', color: 'bg-red-100 text-red-700' },
  TANDEM_PROMO: { label: 'Tandem Promo', color: 'bg-pink-100 text-pink-700' },
  ORGANIZER_CAMP: { label: 'Organizer Camp', color: 'bg-emerald-100 text-emerald-700' },
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  PUBLISHED: 'bg-blue-100 text-blue-700',
  REGISTRATION_OPEN: 'bg-emerald-100 text-emerald-700',
  FULL: 'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-gray-200 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
  ARCHIVED: 'bg-slate-100 text-slate-500',
};

const FALLBACK_BOOGIES: Boogie[] = [];

export default function BoogiesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [boogies, setBoogies] = useState<Boogie[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  const fetchBoogies = async () => {
    setIsLoading(true);
    setUsingFallback(false);
    try {
      const res = await apiGet<{ success: boolean; data: any[] }>('/boogies');
      if (res?.data && Array.isArray(res.data)) {
        setBoogies(res.data.map((b: any) => ({
          ...b,
          startDate: b.startDate?.split('T')[0] || '',
          endDate: b.endDate?.split('T')[0] || '',
        })));
      }
    } catch {
      setBoogies(FALLBACK_BOOGIES);
      setUsingFallback(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBoogies();
  }, []);

  const filtered = useMemo(() => {
    return boogies.filter(b => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (search && !b.title.toLowerCase().includes(search.toLowerCase()) && !b.city?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [boogies, statusFilter, search]);

  const stats = {
    total: boogies.length,
    active: boogies.filter(b => ['PUBLISHED', 'REGISTRATION_OPEN', 'IN_PROGRESS'].includes(b.status)).length,
    registrations: boogies.reduce((sum, b) => sum + (b._count?.registrations || b.currentParticipants || 0), 0),
    upcoming: boogies.filter(b => new Date(b.startDate) > new Date()).length,
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
          <p className="text-gray-600 dark:text-gray-400 mt-3 text-sm">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Fallback banner */}
        {usingFallback && (
          <div className="mb-4 px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400 text-center">
            Unable to reach events API — showing sample data.
          </div>
        )}

        {/* Header */}
        <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Zap className="h-8 w-8 text-purple-600" />
              Boogies & Events
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage boogies, camps, competitions, and special events</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/boogies/new')}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
          >
            <Plus className="h-5 w-5" /> Create Boogie
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[
            { label: 'Total Events', value: stats.total, color: 'text-gray-900' },
            { label: 'Active', value: stats.active, color: 'text-emerald-700' },
            { label: 'Registrations', value: stats.registrations, color: 'text-purple-700' },
            { label: 'Upcoming', value: stats.upcoming, color: 'text-blue-700' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color} mt-1`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events..." className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm outline-none" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)} className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm">
            <option value="all">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="REGISTRATION_OPEN">Registration Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        {/* Event Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(boogie => {
            const typeConfig = EVENT_TYPES[boogie.eventType] || { label: boogie.eventType, color: 'bg-gray-100 text-gray-700' };
            const fillPct = boogie.maxParticipants > 0 ? Math.round((boogie.currentParticipants / boogie.maxParticipants) * 100) : 0;

            return (
              <div key={boogie.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden hover:shadow-lg transition-shadow group">
                {/* Hero */}
                <div className="h-40 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 relative">
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <div className="flex gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeConfig.color}`}>{typeConfig.label}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[boogie.status] || 'bg-gray-100'}`}>{boogie.status.replace(/_/g, ' ')}</span>
                    </div>
                    <h3 className="text-white font-bold text-lg leading-tight drop-shadow-sm">{boogie.title}</h3>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4">
                  {boogie.subtitle && <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{boogie.subtitle}</p>}
                  <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {formatDate(boogie.startDate)} — {formatDate(boogie.endDate)}</div>
                    {boogie.city && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {boogie.city}, {boogie.country}</div>}
                    {boogie.organizerName && <div className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> {boogie.organizerName}</div>}
                    <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> {boogie.currentParticipants}/{boogie.maxParticipants} registered</div>
                  </div>

                  {/* Fill bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>{fillPct}% filled</span>
                      <span>{boogie.maxParticipants - boogie.currentParticipants} spots left</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${fillPct >= 90 ? 'bg-red-500' : fillPct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${fillPct}%` }} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => router.push(`/dashboard/boogies/${boogie.id}`)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" /> View
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await apiPost(`/boogies/${boogie.id}/duplicate`, {});
                          await fetchBoogies();
                        } catch { /* duplicate failed */ }
                      }}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    {boogie.status === 'DRAFT' && (
                      <button
                        onClick={async () => {
                          try {
                            await apiPost(`/boogies/${boogie.id}/publish`, {});
                            await fetchBoogies();
                          } catch { /* publish failed */ }
                        }}
                        className="flex items-center justify-center gap-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Publish
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <Zap className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No events found</p>
            <p className="text-sm text-gray-400 mt-1">Create your first boogie to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
