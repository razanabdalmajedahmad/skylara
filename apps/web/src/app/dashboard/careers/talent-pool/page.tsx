'use client';

import { useState } from 'react';
import { apiPost } from '@/lib/api';
import {
  Search,
  Users,
  Loader2,
  Inbox,
  MapPin,
  Award,
  Plane,
  Shield,
  Globe,
  UserPlus,
  Filter,
  X,
  ChevronDown,
} from 'lucide-react';

interface TalentResult {
  id: string;
  name: string;
  email: string;
  role: string;
  roles: string[];
  totalJumps: number;
  licenseLevel: string;
  skills: string[];
  nationality: string;
  city: string;
  country: string;
  verified: boolean;
}

const ROLE_OPTIONS = [
  { value: 'TI', label: 'Tandem Instructor' },
  { value: 'AFFI', label: 'AFF Instructor' },
  { value: 'COACH', label: 'Coach' },
  { value: 'PILOT', label: 'Pilot' },
  { value: 'RIGGER', label: 'Rigger' },
  { value: 'MANIFEST_STAFF', label: 'Manifest Staff' },
  { value: 'DZ_MANAGER', label: 'DZ Manager' },
  { value: 'CAMERA', label: 'Camera' },
  { value: 'PACKER', label: 'Packer' },
];

const LICENSE_LEVELS = [
  { value: '', label: 'Any License' },
  { value: 'A', label: 'A License' },
  { value: 'B', label: 'B License' },
  { value: 'C', label: 'C License' },
  { value: 'D', label: 'D License' },
];

const SKILL_OPTIONS = [
  'Formation Skydiving',
  'Freefly',
  'Wingsuit',
  'CRW',
  'Speed Skydiving',
  'Tracking',
  'Canopy Piloting',
  'AFF',
  'Tandem',
  'Camera',
  'Packing',
  'Rigging',
  'Turbine Pilot',
  'Piston Pilot',
  'Manifest Operations',
];

const inputClasses = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';
const selectClasses = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

export default function TalentPoolPage() {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [minJumps, setMinJumps] = useState('');
  const [licenseLevel, setLicenseLevel] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [nationality, setNationality] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const [results, setResults] = useState<TalentResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const payload: Record<string, any> = {};
      if (selectedRoles.length > 0) payload.roles = selectedRoles;
      if (minJumps) payload.minJumps = Number(minJumps);
      if (licenseLevel) payload.licenseLevel = licenseLevel;
      if (selectedSkills.length > 0) payload.skills = selectedSkills;
      if (nationality) payload.nationality = nationality;
      if (verifiedOnly) payload.verifiedOnly = true;

      const res = await apiPost<{ data: TalentResult[] }>('/careers/talent-search', payload);
      setResults(res.data || []);
    } catch (err: any) {
      showToast(err.message || 'Search failed', 'error');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = (candidateId: string, candidateName: string) => {
    // Invite functionality not yet wired — button is disabled in the UI
  };

  const clearFilters = () => {
    setSelectedRoles([]);
    setMinJumps('');
    setLicenseLevel('');
    setSelectedSkills([]);
    setNationality('');
    setVerifiedOnly(false);
    setResults([]);
    setSearched(false);
  };

  const hasFilters = selectedRoles.length > 0 || minJumps || licenseLevel || selectedSkills.length > 0 || nationality || verifiedOnly;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Talent Search</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Search the platform for potential candidates matching your hiring needs
          </p>
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:text-gray-400">
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}
      </div>

      {/* Search Form */}
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6 space-y-5">
        {/* Roles */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Roles</label>
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTIONS.map((role) => {
              const isSelected = selectedRoles.includes(role.value);
              return (
                <button
                  key={role.value}
                  onClick={() => toggleRole(role.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                    isSelected
                      ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700'
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-slate-600 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {role.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Minimum Jumps */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Minimum Jumps</label>
            <input
              type="number"
              className={inputClasses}
              placeholder="e.g. 500"
              value={minJumps}
              onChange={(e) => setMinJumps(e.target.value)}
            />
          </div>

          {/* License Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">License Level</label>
            <div className="relative">
              <select className={selectClasses} value={licenseLevel} onChange={(e) => setLicenseLevel(e.target.value)}>
                {LICENSE_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Nationality */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nationality</label>
            <input
              type="text"
              className={inputClasses}
              placeholder="e.g. US, UK"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
            />
          </div>
        </div>

        {/* Skills */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Skills</label>
          <div className="flex flex-wrap gap-2">
            {SKILL_OPTIONS.map((skill) => {
              const isSelected = selectedSkills.includes(skill);
              return (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                    isSelected
                      ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700'
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-slate-600 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {skill}
                </button>
              );
            })}
          </div>
        </div>

        {/* Verified toggle + Search */}
        <div className="flex items-center justify-between pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 dark:border-slate-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Verified profiles only</span>
          </label>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search Talent
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-500 dark:text-gray-400">Searching talent pool...</span>
        </div>
      ) : searched && results.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 py-16 text-center">
          <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No matching candidates found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-1">Try broadening your search criteria</p>
        </div>
      ) : results.length > 0 ? (
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{results.length} candidate{results.length !== 1 ? 's' : ''} found</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((candidate) => (
              <div key={candidate.id} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-400">
                      {candidate.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">{candidate.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{candidate.role || candidate.roles?.join(', ') || 'Jumper'}</p>
                    </div>
                  </div>
                  {candidate.verified && (
                    <span className="flex items-center gap-0.5 text-[10px] font-medium text-green-600 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-full">
                      <Shield className="w-2.5 h-2.5" /> Verified
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  {candidate.totalJumps !== undefined && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Plane className="w-3.5 h-3.5 text-gray-400" />
                      <span>{candidate.totalJumps?.toLocaleString()} jumps</span>
                    </div>
                  )}
                  {candidate.licenseLevel && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Award className="w-3.5 h-3.5 text-gray-400" />
                      <span>{candidate.licenseLevel} License</span>
                    </div>
                  )}
                  {(candidate.city || candidate.country) && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>{[candidate.city, candidate.country].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {candidate.nationality && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Globe className="w-3.5 h-3.5 text-gray-400" />
                      <span>{candidate.nationality}</span>
                    </div>
                  )}
                </div>

                {candidate.skills && candidate.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {candidate.skills.slice(0, 4).map((skill) => (
                      <span key={skill} className="px-2 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                        {skill}
                      </span>
                    ))}
                    {candidate.skills.length > 4 && (
                      <span className="px-2 py-0.5 text-[10px] text-gray-400 rounded-full">
                        +{candidate.skills.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                <button
                  disabled
                  title="Invite to Apply will be available in a future update"
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-not-allowed opacity-60"
                >
                  <UserPlus className="w-4 h-4" /> Invite to Apply
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : !searched ? (
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 py-16 text-center">
          <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Search the talent pool</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-1">
            Use the filters above to find candidates matching your requirements
          </p>
        </div>
      ) : null}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
