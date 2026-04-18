'use client';

import { useState, useEffect } from 'react';
import { Plus, ArrowRightCircle, Wrench } from 'lucide-react';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';

interface ManifestUserPick {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';

// Canonical gear condition states (replaces vague "Unknown")
type GearCondition =
  | 'PASS' | 'FAIL' | 'CONDITIONAL'
  | 'Ready' | 'Needs Inspection' | 'Needs Cleaning' | 'Needs Repair'
  | 'Reserve Due' | 'AAD Due' | 'Out of Service' | 'Retired' | 'Missing';

const CONDITION_COLORS: Record<string, string> = {
  PASS: 'text-emerald-700 bg-emerald-50',
  Ready: 'text-emerald-700 bg-emerald-50',
  CONDITIONAL: 'text-amber-700 bg-amber-50',
  'Needs Inspection': 'text-amber-700 bg-amber-50',
  'Needs Cleaning': 'text-yellow-700 bg-yellow-50',
  FAIL: 'text-red-700 bg-red-50',
  'Needs Repair': 'text-red-700 bg-red-50',
  'Reserve Due': 'text-orange-700 bg-orange-50',
  'AAD Due': 'text-orange-700 bg-orange-50',
  'Out of Service': 'text-red-700 bg-red-50',
  Retired: 'text-gray-500 dark:text-gray-400 bg-gray-100',
  Missing: 'text-red-800 bg-red-100',
};

interface GearItem {
  id: string;
  name: string;
  type: 'rig' | 'helmet' | 'altimeter' | 'jumpsuit';
  size: string;
  status: 'available' | 'rented' | 'maintenance';
  lastInspection: string;
  condition: GearCondition | string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  gearType?: string;
  owner?: string;
  nextRepackDue?: string;
  aadFiresRemaining?: number;
}

interface ActiveRental {
  id: string;
  /** Gear item id (inventory) */
  gearItemId: string;
  gearName: string;
  athleteName: string;
  athleteId: string;
  checkoutTime: string;
  expectedReturnTime: string;
  status: 'active' | 'overdue';
}

// ── API-response → local interface mappers ─────────────────────────
const GEAR_TYPE_MAP: Record<string, GearItem['type']> = {
  MAIN: 'rig', RESERVE: 'rig', CONTAINER: 'rig', AAD: 'altimeter',
  HELMET: 'helmet', ALTIMETER: 'altimeter', JUMPSUIT: 'jumpsuit',
};
const STATUS_MAP: Record<string, GearItem['status']> = {
  ACTIVE: 'available', GROUNDED: 'maintenance', IN_REPAIR: 'maintenance', RETIRED: 'maintenance',
};

function mapApiGear(g: any): GearItem {
  let condition: string = 'Needs Inspection';
  if (g.lastCheck?.result === 'PASS') condition = 'PASS';
  else if (g.lastCheck?.result === 'FAIL') condition = 'Needs Repair';
  else if (g.lastCheck?.result === 'CONDITIONAL') condition = 'CONDITIONAL';
  else if (g.status === 'GROUNDED') condition = 'Out of Service';
  else if (g.status === 'RETIRED') condition = 'Retired';
  else if (g.status === 'IN_REPAIR') condition = 'Needs Repair';
  if (g.nextRepackDue) {
    const repackDate = new Date(g.nextRepackDue);
    if (repackDate < new Date()) condition = 'Reserve Due';
  }
  return {
    id: String(g.id),
    name: `${g.manufacturer || ''} ${g.model || ''}`.trim() || g.serialNumber,
    type: GEAR_TYPE_MAP[g.gearType] || 'rig',
    size: 'Standard',
    status: g.owner ? 'rented' : (STATUS_MAP[g.status] || 'available'),
    lastInspection: g.lastCheck?.checkedAt
      ? new Date(g.lastCheck.checkedAt).toLocaleDateString()
      : 'Never inspected',
    condition,
    serialNumber: g.serialNumber,
    manufacturer: g.manufacturer,
    model: g.model,
    gearType: g.gearType,
    owner: g.owner,
    nextRepackDue: g.nextRepackDue,
    aadFiresRemaining: g.aadFiresRemaining,
  };
}

function mapApiRental(r: any): ActiveRental {
  return {
    id: String(r.id),
    gearItemId: String(r.gearItemId ?? ''),
    gearName: r.gear || 'Unknown Gear',
    athleteName: r.renter || 'Unknown',
    athleteId: String(r.userId ?? ''),
    checkoutTime: r.assignedAt
      ? new Date(r.assignedAt).toLocaleString()
      : 'N/A',
    expectedReturnTime: r.assignedAt
      ? new Date(new Date(r.assignedAt).getTime() + 8 * 60 * 60 * 1000).toLocaleString()
      : 'N/A',
    status: 'active',
  };
}

const GEAR_TYPE_COLORS: Record<string, string> = {
  rig: 'bg-sky-100 text-sky-700',
  helmet: 'bg-purple-100 text-purple-700',
  altimeter: 'bg-emerald-100 text-emerald-700',
  jumpsuit: 'bg-pink-100 text-pink-700',
};

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700',
  rented: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-amber-100 text-amber-700',
};

export default function GearPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'rentals' | 'maintenance'>(
    'inventory'
  );
  const [gearItems, setGearItems] = useState<GearItem[]>([]);
  const [rentals, setRentals] = useState<ActiveRental[]>([]);
  const [selectedGear, setSelectedGear] = useState<GearItem | null>(null);
  const [showAddGearModal, setShowAddGearModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [loadingGear, setLoadingGear] = useState(true);
  const [loadingRentals, setLoadingRentals] = useState(true);
  const [errorGear, setErrorGear] = useState<string | null>(null);
  const [errorRentals, setErrorRentals] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [checkoutUsers, setCheckoutUsers] = useState<ManifestUserPick[]>([]);
  const [checkoutUserId, setCheckoutUserId] = useState<string>('');
  const { isAuthenticated, user } = useAuth();

  // Shared fetch helpers so modals can re-fetch after mutations
  const fetchGearItems = async () => {
    setLoadingGear(true);
    setErrorGear(null);
    try {
      const res = await apiGet<{ success: boolean; data: any[] }>('/gear');
      if (res?.success !== false && Array.isArray(res.data)) {
        setGearItems(res.data.map(mapApiGear));
      } else {
        setGearItems([]);
        setErrorGear('Unexpected response from gear service.');
      }
    } catch (error) {
      logger.error('Gear API unavailable', { page: 'gear', error });
      setGearItems([]);
      setErrorGear('Could not load gear inventory. Check your connection and permissions.');
    } finally {
      setLoadingGear(false);
    }
  };

  const fetchRentals = async () => {
    setLoadingRentals(true);
    setErrorRentals(null);
    try {
      const res = await apiGet<{ success: boolean; data: any[] }>('/gear/rentals');
      if (res?.success !== false && Array.isArray(res.data)) {
        setRentals(res.data.map(mapApiRental));
      } else {
        setRentals([]);
        setErrorRentals('Unexpected response from rentals service.');
      }
    } catch (error) {
      logger.error('Rentals API unavailable', { page: 'gear', error });
      setRentals([]);
      setErrorRentals('Could not load rentals. Check your connection and permissions.');
    } finally {
      setLoadingRentals(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchGearItems();
      fetchRentals();
    } else {
      setLoadingGear(false);
      setLoadingRentals(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (!showCheckoutModal) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet<{ success?: boolean; data?: ManifestUserPick[] }>('/users?limit=50');
        if (cancelled) return;
        if (Array.isArray(res?.data)) setCheckoutUsers(res.data);
        else setCheckoutUsers([]);
      } catch {
        if (!cancelled) setCheckoutUsers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showCheckoutModal]);

  const inventoryStats = {
    total: gearItems.length,
    available: gearItems.filter((g) => g.status === 'available').length,
    rented: gearItems.filter((g) => g.status === 'rented').length,
    maintenance: gearItems.filter((g) => g.status === 'maintenance').length,
  };

  const maintenanceGear = gearItems.filter((g) => g.status === 'maintenance');

  return (
    <RouteGuard allowedRoles={ROLE_GROUPS.OPERATIONS}>
    <div className="p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Gear Rental & Management</h1>
            <p className="text-gray-600 dark:text-gray-400 dark:text-gray-300 mt-1 text-sm sm:text-base">Track equipment inventory and rentals</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setShowAddGearModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold transition-colors text-sm"
            >
              <Plus size={18} />
              Add Gear
            </button>
            {activeTab === 'rentals' && (
              <button
                onClick={() => {
                  setCheckoutUserId('');
                  setShowCheckoutModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors text-sm"
              >
                <ArrowRightCircle size={18} />
                Check Out
              </button>
            )}
          </div>
        </div>

        {/* API error banners */}
        {errorGear && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            {errorGear}
          </div>
        )}
        {errorRentals && activeTab === 'rentals' && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            {errorRentals}
          </div>
        )}
        {actionError && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {actionError}
            <button type="button" className="ml-2 underline" onClick={() => setActionError(null)}>
              Dismiss
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-lg p-4 shadow-md">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Total Items</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{inventoryStats.total}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-emerald-200 rounded-lg p-4 shadow-md">
            <div className="text-xs font-semibold text-emerald-600 mb-1">Available</div>
            <div className="text-2xl font-bold text-emerald-700">{inventoryStats.available}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-blue-200 rounded-lg p-4 shadow-md">
            <div className="text-xs font-semibold text-blue-600 mb-1">Rented</div>
            <div className="text-2xl font-bold text-blue-700">{inventoryStats.rented}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-amber-200 rounded-lg p-4 shadow-md">
            <div className="text-xs font-semibold text-amber-600 mb-1">Maintenance</div>
            <div className="text-2xl font-bold text-amber-700">{inventoryStats.maintenance}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 overflow-x-auto">
          {(['inventory', 'rentals', 'maintenance'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-semibold transition-colors border-b-2 ${
                activeTab === tab
                  ? 'text-sky-600 border-sky-600'
                  : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900'
              }`}
            >
              {tab === 'inventory'
                ? 'Inventory'
                : tab === 'rentals'
                  ? 'Active Rentals'
                  : 'Maintenance'}
            </button>
          ))}
        </div>

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
            {loadingGear ? (
              <div className="p-8 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-sky-600 border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading gear inventory...</p>
              </div>
            ) : gearItems.length === 0 ? (
              <div className="p-8 text-center">
                <Wrench size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400 dark:text-gray-300 font-semibold">No gear items found</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Add your first gear item to get started.</p>
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-slate-900">
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">
                      Item Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">
                      Size
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">
                      Condition
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">
                      Last Inspection
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {gearItems.map((gear) => (
                    <tr
                      key={gear.id}
                      className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 hover:bg-gray-50 dark:bg-slate-900"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 dark:text-white">{gear.name}</div>
                        {gear.serialNumber && <div className="text-xs text-gray-600 dark:text-gray-400">S/N: {gear.serialNumber}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${GEAR_TYPE_COLORS[gear.type]}`}
                        >
                          {gear.type.charAt(0).toUpperCase() + gear.type.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{gear.size}</td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[gear.status]}`}
                        >
                          {gear.status.charAt(0).toUpperCase() + gear.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${CONDITION_COLORS[gear.condition] || 'text-gray-600 dark:text-gray-400 bg-gray-100'}`}>
                          {gear.condition}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300 text-sm">{gear.lastInspection}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedGear(gear)}
                          className="px-3 py-1 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded text-xs font-semibold transition-colors"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        {/* Active Rentals Tab */}
        {activeTab === 'rentals' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
            {loadingRentals ? (
              <div className="p-8 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-sky-600 border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading active rentals...</p>
              </div>
            ) : rentals.length === 0 ? (
              <div className="p-8 text-center">
                <ArrowRightCircle size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400 dark:text-gray-300 font-semibold">No active rentals</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Check out gear to an athlete to see rentals here.</p>
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-slate-900">
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">
                      Gear Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">
                      Athlete
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">
                      Checkout Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">
                      Expected Return
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
                  {rentals.map((rental) => (
                    <tr
                      key={rental.id}
                      className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 hover:bg-gray-50 dark:bg-slate-900"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {rental.gearName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {rental.athleteName}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {rental.checkoutTime}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {rental.expectedReturnTime}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={async () => {
                            try {
                              await apiPost(`/gear/rentals/${rental.id}/return`, { conditionIn: 'Good' });
                              // Refresh both gear inventory and rentals
                              await Promise.all([fetchGearItems(), fetchRentals()]);
                            } catch (err) {
                              logger.error('Return rental failed', { page: 'gear' });
                            }
                          }}
                          className="px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded text-xs font-semibold transition-colors"
                        >
                          Return
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        {/* Maintenance Tab */}
        {activeTab === 'maintenance' && (
          <div>
            {maintenanceGear.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 text-center">
                <Wrench size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400 dark:text-gray-300 font-semibold">No items in maintenance</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-slate-900">
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">
                          Item Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">
                          Last Inspection
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">
                          Condition
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 dark:text-gray-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {maintenanceGear.map((gear) => (
                        <tr
                          key={gear.id}
                          className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 hover:bg-gray-50 dark:bg-slate-900"
                        >
                          <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                            {gear.name}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${GEAR_TYPE_COLORS[gear.type]}`}
                            >
                              {gear.type.charAt(0).toUpperCase() + gear.type.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                            {gear.lastInspection}
                          </td>
                          <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{gear.condition}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={async () => {
                                setActionError(null);
                                try {
                                  await apiPut(`/gear/${gear.id}/status`, { status: 'ACTIVE' });
                                  await fetchGearItems();
                                } catch (e) {
                                  logger.error('Mark gear ready failed', { page: 'gear', error: e });
                                  setActionError('Could not update gear status. Try again when online.');
                                }
                              }}
                              className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded text-xs font-semibold transition-colors"
                            >
                              Mark Ready
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    {/* GEAR DETAIL MODAL */}
    {selectedGear && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedGear(null)}>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedGear.name}</h2>
              <button onClick={() => setSelectedGear(null)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 text-2xl">&times;</button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {selectedGear.gearType || selectedGear.type}{selectedGear.serialNumber ? ` · S/N: ${selectedGear.serialNumber}` : ''}
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</label>
                <div className="mt-1">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[selectedGear.status]}`}>
                    {selectedGear.status.charAt(0).toUpperCase() + selectedGear.status.slice(1)}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Condition</label>
                <div className="mt-1">
                  <span className={`inline-block px-3 py-1 rounded text-xs font-semibold ${CONDITION_COLORS[selectedGear.condition] || 'text-gray-600 dark:text-gray-400 bg-gray-100'}`}>
                    {selectedGear.condition}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Manufacturer</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white dark:text-gray-100">{selectedGear.manufacturer || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Model</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white dark:text-gray-100">{selectedGear.model || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Inspection</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white dark:text-gray-100">{selectedGear.lastInspection}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Owner / Assigned</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white dark:text-gray-100">{selectedGear.owner || 'DZ Rental Pool'}</p>
              </div>
              {selectedGear.nextRepackDue && (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Next Repack Due</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white dark:text-gray-100">{new Date(selectedGear.nextRepackDue).toLocaleDateString()}</p>
                </div>
              )}
              {selectedGear.aadFiresRemaining != null && (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">AAD Fires Remaining</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white dark:text-gray-100">{selectedGear.aadFiresRemaining}</p>
                </div>
              )}
            </div>
            <div className="pt-4 border-t border-gray-200 dark:border-slate-700 flex gap-2">
              <button
                onClick={async () => {
                  if (!user?.id) {
                    setActionError('Session user id missing — refresh and sign in again.');
                    return;
                  }
                  setActionError(null);
                  try {
                    await apiPost(`/gear/${selectedGear.id}/check`, {
                      status: 'PASS',
                      checkedBy: user.id,
                      notes: 'Routine inspection — all clear',
                    });
                    await fetchGearItems();
                    setSelectedGear(null);
                  } catch (e) {
                    logger.error('Gear check failed', { page: 'gear', error: e });
                    setActionError('Could not log inspection. Verify API and your role (Operator / Gear Master).');
                  }
                }}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold"
              >
                Log Inspection (PASS)
              </button>
              <button
                onClick={() => setSelectedGear(null)}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Add Gear Modal */}
    {showAddGearModal && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddGearModal(false)}>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
          <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Gear Item</h2>
            <button onClick={() => setShowAddGearModal(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 text-xl">&times;</button>
          </div>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const serial = (form.elements.namedItem('serial') as HTMLInputElement).value;
            const mfr = (form.elements.namedItem('manufacturer') as HTMLInputElement).value;
            const model = (form.elements.namedItem('model') as HTMLInputElement).value;
            const type = (form.elements.namedItem('gearType') as HTMLSelectElement).value;
            try {
              const isRental = (form.elements.namedItem('isRental') as HTMLInputElement)?.checked ?? false;
              await apiPost('/gear', {
                make: mfr,
                model,
                serialNumber: serial,
                gearType: type,
                purchaseDate: new Date().toISOString(),
                isRental,
              });
              await fetchGearItems();
              setShowAddGearModal(false);
            } catch (err) {
              logger.error('Failed to add gear', { page: 'gear', error: err });
              setActionError('Could not add gear. Check serial uniqueness and permissions.');
            }
          }} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Serial Number</label>
              <input name="serial" required className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Manufacturer</label>
              <input name="manufacturer" required className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Model</label>
              <input name="model" required className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-sky-500" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" name="isRental" id="isRental" className="rounded border-gray-300" />
              <label htmlFor="isRental" className="text-sm text-gray-700 dark:text-gray-300">
                Rental pool (intended for check-out to athletes)
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select name="gearType" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-sky-500">
                <option value="CONTAINER">Container / Rig</option>
                <option value="MAIN">Main Canopy</option>
                <option value="RESERVE">Reserve Canopy</option>
                <option value="AAD">AAD</option>
                <option value="HELMET">Helmet</option>
                <option value="ALTIMETER">Altimeter</option>
                <option value="JUMPSUIT">Jumpsuit</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAddGearModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 font-medium text-sm">Cancel</button>
              <button type="submit" className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium text-sm">Add Gear</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Checkout Modal */}
    {showCheckoutModal && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCheckoutModal(false)}>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
          <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Check Out Gear</h2>
            <button onClick={() => setShowCheckoutModal(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 text-xl">&times;</button>
          </div>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const gearId = (form.elements.namedItem('gearId') as HTMLSelectElement).value;
            const uid = checkoutUserId || (form.elements.namedItem('userId') as HTMLSelectElement)?.value;
            if (!uid) {
              setActionError('Select a user to check gear out to.');
              return;
            }
            setActionError(null);
            try {
              await apiPost(`/gear/${gearId}/rent`, { userId: parseInt(uid, 10), conditionOut: 'Good' });
              await Promise.all([fetchGearItems(), fetchRentals()]);
              setShowCheckoutModal(false);
            } catch (err) {
              logger.error('Checkout failed', { page: 'gear', error: err });
              setActionError('Could not create rental. Gear must be ACTIVE, not already rented, and you need manifest or manager permissions.');
            }
          }} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Gear</label>
              <select name="gearId" required className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-emerald-500">
                {gearItems.filter((g) => g.status === 'available').map((g) => (
                  <option key={g.id} value={g.id}>{g.name} — {g.size}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Athlete / user</label>
              <select
                name="userId"
                value={checkoutUserId}
                onChange={(e) => setCheckoutUserId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select user…</option>
                {checkoutUsers.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email} (ID {u.id})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Users with a role at this dropzone (from directory search).</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCheckoutModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 font-medium text-sm">Cancel</button>
              <button type="submit" className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm">Check Out</button>
            </div>
          </form>
        </div>
      </div>
    )}
    </RouteGuard>
  );
}
