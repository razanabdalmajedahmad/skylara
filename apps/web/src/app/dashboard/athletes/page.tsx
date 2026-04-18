'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CheckCircle2, XCircle, Eye, LogIn, Users, QrCode, X, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';
import { QRCode } from '@/components/QRCode';

interface Athlete {
  id: string;
  name: string;
  nationality: string;
  email: string;
  licenseType: 'A' | 'B' | 'C' | 'D' | 'Student' | 'Visitor';
  totalJumps: number;
  lastJumpDate: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  currencyStatus: 'current' | 'expiring' | 'expired';
  currencyDaysValid: number;
  waiverSigned: boolean;
}

const NATIONALITIES: Record<string, string> = {
  US: '🇺🇸',
  UK: '🇬🇧',
  CA: '🇨🇦',
  AU: '🇦🇺',
  DE: '🇩🇪',
  FR: '🇫🇷',
  JP: '🇯🇵',
  BR: '🇧🇷',
  IN: '🇮🇳',
  MX: '🇲🇽',
};

// Fallback data used only when the API is unreachable (e.g. local dev without backend).
// This will be removed once the backend is guaranteed available in all environments.
const FALLBACK_ATHLETES: Athlete[] = [];

/** Transform a raw API user record into the component's Athlete shape. */
function mapApiUserToAthlete(u: any): Athlete {
  return {
    id: String(u.id),
    name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
    email: u.email || '',
    nationality: u.nationality || '',
    licenseType: u.licenseType || 'Visitor',
    totalJumps: u.totalJumps ?? 0,
    lastJumpDate: u.lastJumpDate || null,
    status: u.status || 'ACTIVE',
    currencyStatus: u.currencyStatus || 'expired',
    currencyDaysValid: u.currencyDaysValid ?? 0,
    waiverSigned: u.waiverSigned ?? false,
  };
}

type FilterStatus = 'All' | 'Active' | 'Students' | 'Visitors' | 'Inactive';

export default function AthletesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterStatus>('All');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [qrAthlete, setQrAthlete] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const fetchAthletes = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUsingFallback(false);
    try {
      const res = await apiGet<{ success: boolean; data: any[] }>('/users?role=ATHLETE&limit=100');
      if (res?.success && res.data && Array.isArray(res.data)) {
        setAthletes(res.data.map(mapApiUserToAthlete));
      } else {
        throw new Error('Unexpected response shape');
      }
    } catch (err: any) {
      logger.warn('API unavailable, using fallback data', { page: 'athletes' });
      // FALLBACK: only used when the backend is unreachable
      setAthletes(FALLBACK_ATHLETES);
      setUsingFallback(true);
      setError('Could not reach the server. Showing cached data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAthletes();
  }, [fetchAthletes]);

  const handleCheckIn = useCallback(async (athlete: Athlete) => {
    if (checkingIn) return;
    setCheckingIn(athlete.id);
    try {
      await apiPost(`/users/${athlete.id}/checkin`, { qrCode: `skylara://athlete/${athlete.id}/${athlete.name}` });
      // Refresh the list after successful check-in
      await fetchAthletes();
    } catch (err: any) {
      logger.warn('Check-in failed', { page: 'athletes' });
    } finally {
      setCheckingIn(null);
    }
  }, [checkingIn, fetchAthletes]);

  const filteredAthletes = useMemo(() => {
    return athletes.filter((athlete) => {
      const matchesSearch =
        athlete.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        athlete.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        athlete.id.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesFilter = true;
      if (filterTab === 'Active') {
        matchesFilter = athlete.status === 'ACTIVE';
      } else if (filterTab === 'Students') {
        matchesFilter = athlete.licenseType === 'Student';
      } else if (filterTab === 'Visitors') {
        matchesFilter = athlete.licenseType === 'Visitor';
      } else if (filterTab === 'Inactive') {
        matchesFilter = athlete.status === 'INACTIVE' || athlete.status === 'SUSPENDED';
      }

      return matchesSearch && matchesFilter;
    });
  }, [athletes, searchQuery, filterTab]);

  const stats = {
    total: athletes.length,
    activeToday: athletes.filter(
      (a) => a.status === 'ACTIVE' && a.lastJumpDate === '2026-04-06'
    ).length,
    students: athletes.filter((a) => a.licenseType === 'Student').length,
    visitors: athletes.filter((a) => a.licenseType === 'Visitor').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-100 text-emerald-700';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-700';
      case 'SUSPENDED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getLicenseColor = (license: string) => {
    switch (license) {
      case 'A':
        return 'bg-emerald-100 text-emerald-700';
      case 'B':
        return 'bg-sky-100 text-sky-700';
      case 'C':
        return 'bg-amber-100 text-amber-700';
      case 'D':
        return 'bg-purple-100 text-purple-700';
      case 'Student':
        return 'bg-blue-100 text-blue-700';
      case 'Visitor':
        return 'bg-pink-100 text-pink-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getCurrencyColor = (status: string) => {
    switch (status) {
      case 'current':
        return 'text-emerald-600';
      case 'expiring':
        return 'text-amber-600';
      case 'expired':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Athletes</h1>
            <button onClick={() => router.push('/dashboard/checkin')} className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold transition-colors w-full sm:w-auto text-center">
              + Register New Athlete
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Professional athlete registry and management</p>
        </div>

        {/* Error / Fallback Banner */}
        {error && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              onClick={fetchAthletes}
              className="flex items-center gap-1 rounded px-3 py-1 text-xs font-semibold bg-amber-200 hover:bg-amber-300 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Total Athletes</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Active Today</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.activeToday}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Students</p>
            <p className="text-2xl font-bold text-blue-600">{stats.students}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Visitors</p>
            <p className="text-2xl font-bold text-pink-600">{stats.visitors}</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or license #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex gap-2 flex-wrap">
              {(['All', 'Active', 'Students', 'Visitors', 'Inactive'] as FilterStatus[]).map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilterTab(tab)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      filterTab === tab
                        ? 'bg-sky-600 text-white'
                        : 'bg-gray-100 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {tab}
                  </button>
                )
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  viewMode === 'table'
                    ? 'bg-sky-100 text-sky-700'
                    : 'bg-gray-100 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  viewMode === 'card'
                    ? 'bg-sky-100 text-sky-700'
                    : 'bg-gray-100 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                Cards
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {filteredAthletes.length} of {athletes.length} athletes
          {usingFallback && <span className="ml-2 text-amber-600 text-xs font-semibold">(offline fallback)</span>}
        </p>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
            <span className="ml-3 text-gray-600 dark:text-gray-400 font-semibold">Loading athletes...</span>
          </div>
        )}

        {/* Table View */}
        {!loading && viewMode === 'table' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">
                      Athlete
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300">
                      License
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300">
                      Jumps
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300">
                      Last Jump
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300">
                      Currency
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300">
                      Waiver
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAthletes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        No athletes found
                      </td>
                    </tr>
                  ) : (
                    filteredAthletes.map((athlete) => (
                      <tr
                        key={athlete.id}
                        className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{NATIONALITIES[athlete.nationality] || '🌍'}</span>
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  {athlete.name}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">{athlete.email}</div>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getLicenseColor(
                              athlete.licenseType
                            )}`}
                          >
                            {athlete.licenseType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-gray-900 dark:text-white">
                            {athlete.totalJumps}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-400">
                          {athlete.lastJumpDate ? athlete.lastJumpDate : '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                              athlete.currencyStatus === 'current'
                                ? 'bg-emerald-100 text-emerald-700'
                                : athlete.currencyStatus === 'expiring'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {athlete.currencyStatus === 'current' && (
                              <>
                                <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                                {athlete.currencyDaysValid}d
                              </>
                            )}
                            {athlete.currencyStatus === 'expiring' && (
                              <>
                                <div className="w-2 h-2 bg-amber-600 rounded-full"></div>
                                {athlete.currencyDaysValid}d
                              </>
                            )}
                            {athlete.currencyStatus === 'expired' && (
                              <>
                                <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                                Expired
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {athlete.waiverSigned ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                              athlete.status
                            )}`}
                          >
                            {athlete.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => router.push(`/dashboard/athletes/${athlete.id}`)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition-colors" title="View Profile">
                              <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                            <button onClick={() => setQrAthlete(athlete)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition-colors" title="QR Code">
                              <QrCode className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                            <button
                              onClick={() => handleCheckIn(athlete)}
                              disabled={checkingIn === athlete.id}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                              title="Check In"
                            >
                              {checkingIn === athlete.id ? (
                                <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />
                              ) : (
                                <LogIn className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                              )}
                            </button>
                            <button onClick={() => router.push('/dashboard/manifest')} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition-colors" title="Add to Load">
                              <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Card View */}
        {!loading && viewMode === 'card' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAthletes.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                No athletes found
              </div>
            ) : (
              filteredAthletes.map((athlete) => (
                <div
                  key={athlete.id}
                  className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-2xl">{NATIONALITIES[athlete.nationality] || '🌍'}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{athlete.name}</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{athlete.email}</p>
                      </div>
                    </div>
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        athlete.status
                      )}`}
                    >
                      {athlete.status}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">License</span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-full text-xs ${getLicenseColor(
                          athlete.licenseType
                        )}`}
                      >
                        {athlete.licenseType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Total Jumps</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{athlete.totalJumps}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Last Jump</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {athlete.lastJumpDate || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Currency</span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
                          athlete.currencyStatus === 'current'
                            ? 'bg-emerald-100 text-emerald-700'
                            : athlete.currencyStatus === 'expiring'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {athlete.currencyStatus === 'expired'
                          ? 'Expired'
                          : `${athlete.currencyDaysValid}d`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Waiver</span>
                      {athlete.waiverSigned ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-slate-700">
                    <button onClick={() => router.push(`/dashboard/athletes/${athlete.id}`)} className="flex-1 px-2 py-2 text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-700 rounded transition-colors flex items-center justify-center gap-1">
                      <Eye className="w-3 h-3" /> Profile
                    </button>
                    <button
                      onClick={() => handleCheckIn(athlete)}
                      disabled={checkingIn === athlete.id}
                      className="flex-1 px-2 py-2 text-xs font-semibold bg-gray-50 hover:bg-gray-100 text-gray-700 dark:text-gray-300 rounded transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      {checkingIn === athlete.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <LogIn className="w-3 h-3" />
                      )}{' '}
                      Check In
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {qrAthlete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setQrAthlete(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Athlete ID</h3>
              <button onClick={() => setQrAthlete(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="flex justify-center mb-4">
              <QRCode data={`skylara://athlete/${qrAthlete.id}/${qrAthlete.name}`} size={180} />
            </div>
            <div className="font-semibold text-gray-900 dark:text-white text-lg">{qrAthlete.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              License: {qrAthlete.licenseType} &bull; {qrAthlete.totalJumps} jumps
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-2">{qrAthlete.email}</div>
            <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-3">
              Scan at check-in to identify this athlete
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
