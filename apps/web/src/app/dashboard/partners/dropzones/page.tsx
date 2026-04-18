'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import {
  Search,
  Loader2,
  MapPin,
  Plane,
  Globe,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Package,
  ShieldCheck,
  Home,
  Wrench,
  Users,
  Mountain,
  Building2,
} from 'lucide-react';

// ── TYPES ────────────────────────────────────────────
interface Dropzone {
  id: string;
  name: string;
  city: string;
  country: string;
  status: 'PILOT_READY' | 'LIVE';
  aircraftTypes: string[];
  disciplines: string[];
  facilities: string[];
  altitudeOptions: string[];
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  description?: string;
  gearRental: boolean;
  packingService: boolean;
  studentGear: boolean;
  accommodation: boolean;
}

// ── STATUS CONFIG ────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  PILOT_READY: {
    label: 'Pilot Ready',
    color: 'text-purple-700 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    dot: 'bg-purple-500',
  },
  LIVE: {
    label: 'Live',
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    dot: 'bg-emerald-500',
  },
};

const DISCIPLINE_COLORS: Record<string, string> = {
  Tandem: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  AFF: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  'Fun Jumping': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Freefly: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  Wingsuit: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  CRW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Speed Star': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  'Big-Way': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

const FACILITY_ICONS: Record<string, { icon: typeof Package; label: string }> = {
  gearRental: { icon: Package, label: 'Gear Rental' },
  packingService: { icon: Wrench, label: 'Packing' },
  studentGear: { icon: ShieldCheck, label: 'Student Gear' },
  accommodation: { icon: Home, label: 'Accommodation' },
};

// ── EMPTY FALLBACK ────────────────────────────────────────
const FALLBACK_DROPZONES: Dropzone[] = [];

// ── MAIN COMPONENT ────────────────────────────────────────
export default function DropzoneDirectoryPage() {
  const { user } = useAuth();
  const [dropzones, setDropzones] = useState<Dropzone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchDropzones = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: any[] }>('/onboarding/dropzones?status=PILOT_READY');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: Dropzone[] = res.data.map((dz: any) => ({
          id: dz.id,
          name: dz.name || dz.dzName || '',
          city: dz.city || '',
          country: dz.country || '',
          status: dz.status || 'PILOT_READY',
          aircraftTypes: dz.aircraftTypes || [],
          disciplines: dz.disciplines || [],
          facilities: dz.facilities || [],
          altitudeOptions: dz.altitudeOptions || [],
          contactEmail: dz.contactEmail || dz.email || '',
          contactPhone: dz.contactPhone || dz.phone || '',
          website: dz.website || '',
          description: dz.description || '',
          gearRental: dz.gearRental ?? false,
          packingService: dz.packingService ?? false,
          studentGear: dz.studentGear ?? false,
          accommodation: dz.accommodation ?? false,
        }));
        setDropzones(mapped);
      } else {
        setDropzones([]);
      }
    } catch {
      setDropzones(FALLBACK_DROPZONES);
      // Error state is implicit — empty list triggers empty-state UI
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDropzones(); }, [fetchDropzones]);

  // ── FILTERING ────────────────────────────────────────
  const countries = Array.from(new Set(dropzones.map((d) => d.country))).sort();

  const filtered = dropzones.filter((dz) => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      dz.name.toLowerCase().includes(q) ||
      dz.city.toLowerCase().includes(q) ||
      dz.country.toLowerCase().includes(q) ||
      dz.disciplines.some((d) => d.toLowerCase().includes(q));
    const matchesCountry = !countryFilter || dz.country === countryFilter;
    return matchesSearch && matchesCountry;
  });

  return (
    <div className="p-4 lg:p-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Partner Dropzones</h1>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-sm font-semibold">
              {dropzones.length}
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Browse partner dropzones and their facilities</p>
        </div>

        {/* Search */}
        <div className="mb-4 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 dark:text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, city, country, or discipline..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* Country Filter */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setCountryFilter(null)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
              !countryFilter
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            All Countries
          </button>
          {countries.map((c) => (
            <button
              key={c}
              onClick={() => setCountryFilter(countryFilter === c ? null : c)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
                countryFilter === c
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Loading dropzones...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700">
            <Building2 size={48} className="text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">No dropzones found</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{search || countryFilter ? 'Try adjusting your search or filters' : 'Data will appear here once available.'}</p>
          </div>
        ) : (
          /* Card Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((dz) => {
              const isExpanded = expandedId === dz.id;
              const statusCfg = STATUS_CONFIG[dz.status] || STATUS_CONFIG.PILOT_READY;

              return (
                <div
                  key={dz.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="p-5">
                    {/* Name + Status */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg truncate">{dz.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                          <MapPin size={14} className="flex-shrink-0" />
                          <span className="truncate">{dz.city}, {dz.country}</span>
                        </div>
                      </div>
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${statusCfg.bg} ${statusCfg.color}`}>
                        <span className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Aircraft */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mb-3">
                      <Plane size={13} className="flex-shrink-0" />
                      <span className="truncate">{dz.aircraftTypes.join(', ')}</span>
                    </div>

                    {/* Disciplines */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {dz.disciplines.slice(0, 5).map((d) => (
                        <span
                          key={d}
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            DISCIPLINE_COLORS[d] || 'bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {d}
                        </span>
                      ))}
                      {dz.disciplines.length > 5 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-300">
                          +{dz.disciplines.length - 5}
                        </span>
                      )}
                    </div>

                    {/* Facilities Icons */}
                    <div className="flex gap-2 mb-4">
                      {dz.gearRental && (
                        <span title="Gear Rental" className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                          <Package size={16} />
                        </span>
                      )}
                      {dz.packingService && (
                        <span title="Packing Service" className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400">
                          <Wrench size={16} />
                        </span>
                      )}
                      {dz.studentGear && (
                        <span title="Student Gear" className="p-2 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400">
                          <ShieldCheck size={16} />
                        </span>
                      )}
                      {dz.accommodation && (
                        <span title="Accommodation" className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                          <Home size={16} />
                        </span>
                      )}
                    </div>

                    {/* Expand */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : dz.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      {isExpanded ? 'Hide Details' : 'View Details'}
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50 p-5 space-y-4">
                      {/* Description */}
                      {dz.description && (
                        <div>
                          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">About</h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{dz.description}</p>
                        </div>
                      )}

                      {/* Altitude */}
                      {dz.altitudeOptions.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Jump Altitude</h4>
                          <div className="flex gap-2">
                            {dz.altitudeOptions.map((alt) => (
                              <span
                                key={alt}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 dark:bg-slate-700 border border-gray-200 dark:border-slate-700 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300"
                              >
                                <Mountain size={14} className="text-gray-400" />
                                {alt}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* All Facilities */}
                      {dz.facilities.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Facilities</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {dz.facilities.map((f) => (
                              <span
                                key={f}
                                className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-300"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Contact */}
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Contact</h4>
                        <div className="space-y-1.5">
                          {dz.contactEmail && (
                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <Mail size={14} className="text-gray-400" />
                              <span>{dz.contactEmail}</span>
                            </div>
                          )}
                          {dz.contactPhone && (
                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <Phone size={14} className="text-gray-400" />
                              <span>{dz.contactPhone}</span>
                            </div>
                          )}
                          {dz.website && (
                            <a
                              href={dz.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <ExternalLink size={14} />
                              <span>{dz.website.replace(/^https?:\/\//, '')}</span>
                            </a>
                          )}
                        </div>
                      </div>
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
