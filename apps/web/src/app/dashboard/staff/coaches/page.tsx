'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import {
  Search,
  Loader2,
  Users,
  X,
  Globe,
  Wind,
  Award,
  Phone,
  Mail,
  Clock,
  Hash,
  ChevronDown,
  ChevronUp,
  Shield,
  Flame,
} from 'lucide-react';

// ── TYPES ────────────────────────────────────────────
interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  bio?: string;
  disciplines: string[];
  languages: string[];
  jumpCount: number;
  tunnelHours: number;
  availability: 'available' | 'busy' | 'unavailable';
  canTunnel: boolean;
  canCanopy: boolean;
  licenseNumber?: string;
  licenseType?: string;
  emergencyContact?: { name: string; phone: string; relation: string };
  photoUrl?: string;
}

// ── DISCIPLINES & COLORS ────────────────────────────────────────
const ALL_DISCIPLINES = ['Belly', 'Freefly', 'Wingsuit', 'CRW', 'Angle', 'Tracking', 'XRW', 'Hybrid'];

const DISCIPLINE_COLORS: Record<string, string> = {
  Belly: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Freefly: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  Wingsuit: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  CRW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Angle: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  Tracking: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  XRW: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  Hybrid: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

const AVAILABILITY_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  available: { label: 'Available', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  busy: { label: 'Busy', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  unavailable: { label: 'Unavailable', dot: 'bg-gray-400', text: 'text-gray-500 dark:text-gray-400' },
};

// ── EMPTY FALLBACK ────────────────────────────────────────
const FALLBACK_COACHES: Coach[] = [];

// ── MAIN COMPONENT ────────────────────────────────────────
export default function CoachDirectoryPage() {
  const { user } = useAuth();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchCoaches = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: any[] }>('/onboarding/coaches?status=APPROVED');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: Coach[] = res.data.map((c: any) => ({
          id: c.id,
          firstName: c.firstName || c.user?.firstName || '',
          lastName: c.lastName || c.user?.lastName || '',
          email: c.email || c.user?.email || '',
          phone: c.phone || c.user?.phone || '',
          bio: c.bio || '',
          disciplines: c.disciplines || [],
          languages: c.languages || [],
          jumpCount: c.jumpCount || 0,
          tunnelHours: c.tunnelHours || 0,
          availability: c.availability || 'available',
          canTunnel: c.canTunnel ?? false,
          canCanopy: c.canCanopy ?? false,
          licenseNumber: c.licenseNumber || '',
          licenseType: c.licenseType || '',
          emergencyContact: c.emergencyContact,
          photoUrl: c.photoUrl,
        }));
        setCoaches(mapped);
      } else {
        setCoaches([]);
      }
    } catch {
      setCoaches(FALLBACK_COACHES);
      // Error state is implicit — empty list triggers empty-state UI
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCoaches(); }, [fetchCoaches]);

  // ── FILTERING ────────────────────────────────────────
  const filtered = coaches.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.disciplines.some((d) => d.toLowerCase().includes(q)) ||
      c.languages.some((l) => l.toLowerCase().includes(q));
    const matchesDiscipline = !disciplineFilter || c.disciplines.includes(disciplineFilter);
    return matchesSearch && matchesDiscipline;
  });

  const getInitials = (first: string, last: string) =>
    `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

  const avatarColors = [
    'bg-blue-600', 'bg-violet-600', 'bg-rose-600', 'bg-amber-600',
    'bg-teal-600', 'bg-indigo-600', 'bg-sky-600', 'bg-emerald-600',
  ];
  const getAvatarColor = (id: string) => avatarColors[id.charCodeAt(1) % avatarColors.length];

  return (
    <div className="p-4 lg:p-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Coach Directory</h1>
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-sm font-semibold">
              {coaches.length}
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Browse approved coaches by discipline, language, or availability</p>
        </div>

        {/* Search */}
        <div className="mb-4 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 dark:text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, discipline, or language..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* Discipline Filter Chips */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setDisciplineFilter(null)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
              !disciplineFilter
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            All
          </button>
          {ALL_DISCIPLINES.map((d) => (
            <button
              key={d}
              onClick={() => setDisciplineFilter(disciplineFilter === d ? null : d)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
                disciplineFilter === d
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Loading coaches...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700">
            <Users size={48} className="text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">No coaches found</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{search || disciplineFilter ? 'Try adjusting your search or filters' : 'Data will appear here once available.'}</p>
          </div>
        ) : (
          /* Card Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((coach) => {
              const isExpanded = expandedId === coach.id;
              const avail = AVAILABILITY_CONFIG[coach.availability];
              return (
                <div
                  key={coach.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Card Body */}
                  <div className="p-5">
                    {/* Top Row: Avatar + Name + Availability */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${getAvatarColor(coach.id)}`}>
                        {getInitials(coach.firstName, coach.lastName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {coach.firstName} {coach.lastName}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className={`w-2 h-2 rounded-full ${avail.dot}`} />
                          <span className={`text-xs font-medium ${avail.text}`}>{avail.label}</span>
                        </div>
                      </div>
                      {/* Capability Icons */}
                      <div className="flex gap-1.5 flex-shrink-0">
                        {coach.canTunnel && (
                          <span title="Tunnel coaching" className="p-1.5 rounded-md bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                            <Wind size={14} />
                          </span>
                        )}
                        {coach.canCanopy && (
                          <span title="Canopy coaching" className="p-1.5 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                            <Flame size={14} />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Disciplines */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {coach.disciplines.map((d) => (
                        <span
                          key={d}
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            DISCIPLINE_COLORS[d] || 'bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {d}
                        </span>
                      ))}
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Jumps</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{coach.jumpCount.toLocaleString()}</div>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Tunnel hrs</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{coach.tunnelHours.toLocaleString()}</div>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Languages</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{coach.languages.length}</div>
                      </div>
                    </div>

                    {/* Languages */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mb-3">
                      <Globe size={13} className="flex-shrink-0" />
                      <span className="truncate">{coach.languages.join(', ')}</span>
                    </div>

                    {/* Expand Button */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : coach.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      {isExpanded ? 'Hide Details' : 'View Profile'}
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50 p-5 space-y-4">
                      {/* Bio */}
                      {coach.bio && (
                        <div>
                          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">About</h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{coach.bio}</p>
                        </div>
                      )}

                      {/* Contact */}
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Contact</h4>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <Mail size={14} className="text-gray-400" />
                            <span>{coach.email}</span>
                          </div>
                          {coach.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <Phone size={14} className="text-gray-400" />
                              <span>{coach.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* License */}
                      {coach.licenseNumber && (
                        <div>
                          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">License</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <Award size={14} className="text-gray-400" />
                            <span>{coach.licenseType} &mdash; {coach.licenseNumber}</span>
                          </div>
                        </div>
                      )}

                      {/* Emergency Contact */}
                      {coach.emergencyContact && (
                        <div>
                          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Emergency Contact</h4>
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-medium">{coach.emergencyContact.name}</span>
                            <span className="text-gray-500 dark:text-gray-400"> ({coach.emergencyContact.relation})</span>
                            <div className="flex items-center gap-2 mt-1">
                              <Phone size={13} className="text-gray-400" />
                              <span>{coach.emergencyContact.phone}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
