'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import {
  Search,
  Loader2,
  Users,
  Globe,
  Award,
  Phone,
  Mail,
  Shield,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Hash,
  Star,
  BookOpen,
} from 'lucide-react';

// ── TYPES ────────────────────────────────────────────
interface Instructor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  bio?: string;
  ratingType: 'TI' | 'AFFI' | 'TI_AFFI';
  ratingDetails?: string;
  licenseNumber: string;
  licenseType: string;
  disciplines: string[];
  languages: string[];
  jumpCount: number;
  tandems?: number;
  affJumps?: number;
  availability: 'available' | 'busy' | 'unavailable';
  emergencyContact?: { name: string; phone: string; relation: string };
}

// ── RATING CONFIGS ────────────────────────────────────────
const RATING_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
  TI: {
    label: 'Tandem Instructor',
    color: 'text-violet-700 dark:text-violet-400',
    bg: 'bg-violet-100 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800',
  },
  AFFI: {
    label: 'AFF Instructor',
    color: 'text-sky-700 dark:text-sky-400',
    bg: 'bg-sky-100 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800',
  },
  TI_AFFI: {
    label: 'TI + AFFI',
    color: 'text-indigo-700 dark:text-indigo-400',
    bg: 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800',
  },
};

const RATING_BADGE_COLOR: Record<string, string> = {
  TI: 'bg-violet-600',
  AFFI: 'bg-sky-600',
  TI_AFFI: 'bg-indigo-600',
};

const AVAILABILITY_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  available: { label: 'Available', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  busy: { label: 'Busy', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  unavailable: { label: 'Unavailable', dot: 'bg-gray-400', text: 'text-gray-500 dark:text-gray-400' },
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Ratings' },
  { value: 'TI', label: 'TI' },
  { value: 'AFFI', label: 'AFFI' },
];

// ── EMPTY FALLBACK ────────────────────────────────────────
const FALLBACK_INSTRUCTORS: Instructor[] = [];

// ── MAIN COMPONENT ────────────────────────────────────────
export default function InstructorDirectoryPage() {
  const { user } = useAuth();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchInstructors = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: any[] }>('/onboarding/instructors?status=APPROVED');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: Instructor[] = res.data.map((i: any) => ({
          id: i.id,
          firstName: i.firstName || i.user?.firstName || '',
          lastName: i.lastName || i.user?.lastName || '',
          email: i.email || i.user?.email || '',
          phone: i.phone || i.user?.phone || '',
          bio: i.bio || '',
          ratingType: i.ratingType || i.applicationType || 'TI',
          ratingDetails: i.ratingDetails || '',
          licenseNumber: i.licenseNumber || '',
          licenseType: i.licenseType || '',
          disciplines: i.disciplines || [],
          languages: i.languages || [],
          jumpCount: i.jumpCount || 0,
          tandems: i.tandems || 0,
          affJumps: i.affJumps || 0,
          availability: i.availability || 'available',
          emergencyContact: i.emergencyContact,
        }));
        setInstructors(mapped);
      } else {
        setInstructors([]);
      }
    } catch {
      setInstructors(FALLBACK_INSTRUCTORS);
      // Error state is implicit — empty list triggers empty-state UI
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchInstructors(); }, [fetchInstructors]);

  // ── FILTERING ────────────────────────────────────────
  const filtered = instructors.filter((inst) => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      `${inst.firstName} ${inst.lastName}`.toLowerCase().includes(q) ||
      inst.licenseNumber.toLowerCase().includes(q) ||
      inst.languages.some((l) => l.toLowerCase().includes(q));
    const matchesRating = ratingFilter === 'all' ||
      inst.ratingType === ratingFilter ||
      (ratingFilter === 'TI' && inst.ratingType === 'TI_AFFI') ||
      (ratingFilter === 'AFFI' && inst.ratingType === 'TI_AFFI');
    return matchesSearch && matchesRating;
  });

  const getInitials = (first: string, last: string) =>
    `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

  return (
    <div className="p-4 lg:p-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Instructor Directory</h1>
            <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-sm font-semibold">
              {instructors.length}
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Approved tandem and AFF instructors</p>
        </div>

        {/* Search */}
        <div className="mb-4 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 dark:text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, license number, or language..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* Rating Filter */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRatingFilter(opt.value)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
                ratingFilter === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Loading instructors...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700">
            <Users size={48} className="text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">No instructors found</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{search || ratingFilter !== 'all' ? 'Try adjusting your search or filters' : 'Data will appear here once available.'}</p>
          </div>
        ) : (
          /* Card Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((inst) => {
              const isExpanded = expandedId === inst.id;
              const avail = AVAILABILITY_CONFIG[inst.availability];
              const rating = RATING_DISPLAY[inst.ratingType] || RATING_DISPLAY.TI;
              const badgeColor = RATING_BADGE_COLOR[inst.ratingType] || 'bg-violet-600';

              return (
                <div
                  key={inst.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Rating Banner */}
                  <div className={`px-4 py-2 border-b ${rating.bg}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GraduationCap size={16} className={rating.color} />
                        <span className={`text-sm font-bold ${rating.color}`}>{rating.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${avail.dot}`} />
                        <span className={`text-xs font-medium ${avail.text}`}>{avail.label}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    {/* Name + Avatar */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${badgeColor}`}>
                        {getInitials(inst.firstName, inst.lastName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {inst.firstName} {inst.lastName}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          <Hash size={12} />
                          <span>{inst.licenseNumber}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Total Jumps</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{inst.jumpCount.toLocaleString()}</div>
                      </div>
                      {inst.tandems !== undefined && inst.tandems > 0 && (
                        <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                          <div className="text-xs text-gray-500 dark:text-gray-400">Tandems</div>
                          <div className="text-sm font-bold text-gray-900 dark:text-white">{inst.tandems.toLocaleString()}</div>
                        </div>
                      )}
                      {inst.affJumps !== undefined && inst.affJumps > 0 && (
                        <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                          <div className="text-xs text-gray-500 dark:text-gray-400">AFF Jumps</div>
                          <div className="text-sm font-bold text-gray-900 dark:text-white">{inst.affJumps.toLocaleString()}</div>
                        </div>
                      )}
                      {(!inst.tandems || inst.tandems === 0) && (!inst.affJumps || inst.affJumps === 0) && (
                        <>
                          <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Languages</div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white">{inst.languages.length}</div>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                            <div className="text-xs text-gray-500 dark:text-gray-400">License</div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white">{inst.licenseType.replace(' License', '')}</div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Languages */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mb-3">
                      <Globe size={13} className="flex-shrink-0" />
                      <span className="truncate">{inst.languages.join(', ')}</span>
                    </div>

                    {/* Rating Details Preview */}
                    {inst.ratingDetails && (
                      <div className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400 mb-3">
                        <BookOpen size={13} className="flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{inst.ratingDetails}</span>
                      </div>
                    )}

                    {/* Expand */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : inst.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      {isExpanded ? 'Hide Details' : 'View Profile'}
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50 p-5 space-y-4">
                      {inst.bio && (
                        <div>
                          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">About</h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{inst.bio}</p>
                        </div>
                      )}

                      {inst.ratingDetails && (
                        <div>
                          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Rating Details</h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{inst.ratingDetails}</p>
                        </div>
                      )}

                      <div>
                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Contact</h4>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <Mail size={14} className="text-gray-400" />
                            <span>{inst.email}</span>
                          </div>
                          {inst.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <Phone size={14} className="text-gray-400" />
                              <span>{inst.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">License</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <Award size={14} className="text-gray-400" />
                          <span>{inst.licenseType} &mdash; {inst.licenseNumber}</span>
                        </div>
                      </div>

                      {inst.emergencyContact && (
                        <div>
                          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Emergency Contact</h4>
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-medium">{inst.emergencyContact.name}</span>
                            <span className="text-gray-500 dark:text-gray-400"> ({inst.emergencyContact.relation})</span>
                            <div className="flex items-center gap-2 mt-1">
                              <Phone size={13} className="text-gray-400" />
                              <span>{inst.emergencyContact.phone}</span>
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
