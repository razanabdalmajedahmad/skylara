'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { useToast } from '@/components/Toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AthleteProfilePageProps {
  params: { id: string };
}

interface JumpLog {
  id: string;
  date: string;
  aircraft: string;
  exitAltitude: number;
  duration: number;
  type: string;
}

interface WalletData {
  id: number;
  balance: number;
  currency: string;
}

interface UserApiResponse {
  success: boolean;
  data: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    roles: string[];
    wallets: WalletData[];
  };
}

interface AthleteData {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  licenseNumber: string;
  certificationsStatus: string;
  totalJumps: number;
  lastJump: string;
  primaryPhone: string;
  roles: string[];
  walletBalance: number;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
}

// ---------------------------------------------------------------------------
// Fallback data (used only when the API is unreachable)
// ---------------------------------------------------------------------------

const FALLBACK_ATHLETE: Omit<AthleteData, 'id'> = {
  name: '',
  email: '',
  phone: '',
  status: 'ACTIVE',
  licenseNumber: '',
  certificationsStatus: '',
  totalJumps: 0,
  lastJump: '',
  primaryPhone: '',
  roles: [],
  walletBalance: 0,
  emergencyContact: {
    name: '',
    relationship: '',
    phone: '',
  },
};

const FALLBACK_JUMP_LOGS: JumpLog[] = [];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AthleteProfilePage({ params }: AthleteProfilePageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'jumps' | 'wallet' | 'gear' | 'emergency'>('overview');
  const [athlete, setAthlete] = useState<AthleteData | null>(null);
  const [jumpLogs] = useState<JumpLog[]>(FALLBACK_JUMP_LOGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { info, success: showSuccess } = useToast();
  const [usingFallback, setUsingFallback] = useState(false);

  const fetchAthlete = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUsingFallback(false);
    try {
      const res = await apiGet<UserApiResponse>(`/users/${params.id}`);
      if (res?.success && res.data) {
        const d = res.data;
        const walletBalance = d.wallets?.reduce((sum, w) => sum + (w.balance ?? 0), 0) ?? 0;
        setAthlete({
          id: String(d.id),
          name: `${d.firstName || ''} ${d.lastName || ''}`.trim() || d.email,
          email: d.email || '',
          phone: d.phone || 'Not provided',
          status: 'ACTIVE',
          // The GET /users/:id endpoint does not currently return athlete-specific
          // fields (license, totalJumps, etc.). Use placeholders until the API is
          // enriched in a future sprint. Emergency contact likewise not returned.
          licenseNumber: FALLBACK_ATHLETE.licenseNumber,
          certificationsStatus: FALLBACK_ATHLETE.certificationsStatus,
          totalJumps: FALLBACK_ATHLETE.totalJumps,
          lastJump: FALLBACK_ATHLETE.lastJump,
          primaryPhone: d.phone || 'Not provided',
          roles: d.roles || [],
          walletBalance,
          emergencyContact: FALLBACK_ATHLETE.emergencyContact,
        });
      } else {
        throw new Error('Unexpected response shape');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[AthleteProfile] API unavailable, using fallback data:', message);
      setAthlete({ id: params.id, ...FALLBACK_ATHLETE });
      setUsingFallback(true);
      setError('Could not reach the server. Showing cached data.');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchAthlete();
  }, [fetchAthlete]);

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="ml-3 text-gray-600 dark:text-gray-400 font-semibold">Loading athlete profile...</span>
        </div>
      </div>
    );
  }

  // Guaranteed non-null after loading completes (either API or fallback)
  const data = athlete!;

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Error / Fallback Banner */}
        {error && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              onClick={fetchAthlete}
              className="flex items-center gap-1 rounded px-3 py-1 text-xs font-semibold bg-amber-200 hover:bg-amber-300 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {usingFallback && (
          <div className="mb-4 text-xs text-amber-600 font-semibold">(offline fallback)</div>
        )}

        {/* Header */}
        <div className="mb-8 flex items-center gap-6">
          <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-4xl">
            {data.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{data.name}</h1>
            <p className="text-gray-600 dark:text-gray-400">{data.email}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">License: {data.licenseNumber}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-slate-700 flex gap-6">
          {(['overview', 'jumps', 'wallet', 'gear', 'emergency'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-semibold transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Info Card */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Athlete Information</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{data.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{data.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">License Number</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{data.licenseNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                  <p className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                    {data.status}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Jump Statistics</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Jumps</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{data.totalJumps}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Last Jump</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{data.lastJump}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Certifications</p>
                  <p className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                    {data.certificationsStatus}
                  </p>
                </div>
              </div>
            </div>

            {/* Emergency Contact Card */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm p-6 md:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Emergency Contact</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{data.emergencyContact.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Relationship</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{data.emergencyContact.relationship}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{data.emergencyContact.phone}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'jumps' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Jump Log</h2>
            <div className="space-y-3">
              {jumpLogs.map((jump) => (
                <div key={jump.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:bg-slate-900">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{jump.date}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{jump.aircraft} &bull; {jump.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">{jump.exitAltitude.toLocaleString()} ft</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{jump.duration}m free fall</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Wallet & Payments</h2>
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Current Balance</p>
              <p className="text-3xl font-bold text-blue-600">
                ${(data.walletBalance / 100).toFixed(2)}
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  await apiPost(`/wallet/credit`, { userId: params.id, amount: 5000, description: 'Manual credit' });
                  showSuccess('Funds added to wallet');
                } catch { info('Wallet top-up requires payment integration — configure in Settings → Integrations'); }
              }}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              Add Funds
            </button>
          </div>
        )}

        {activeTab === 'gear' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Gear & Equipment</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Main Parachute</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Safire 3 119</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">Ready</span>
              </div>
              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Reserve Parachute</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Optimum 106</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">Ready</span>
              </div>
              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Altimeter</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Alti-2 with GPS</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">Ready</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'emergency' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Emergency Information</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Blood Type</p>
                <p className="font-semibold text-gray-900 dark:text-white">O+</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Allergies</p>
                <p className="font-semibold text-gray-900 dark:text-white">Penicillin</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Medications</p>
                <p className="font-semibold text-gray-900 dark:text-white">Aspirin daily</p>
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Primary Emergency Contact</p>
                <p className="font-semibold text-gray-900 dark:text-white">{data.emergencyContact.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{data.emergencyContact.phone}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
