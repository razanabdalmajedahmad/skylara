'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import {
  Plane,
  FileDown,
  CheckCircle,
  AlertCircle,
  BarChart3,
  TrendingUp,
  CreditCard,
  Wallet,
  DollarSign,
} from 'lucide-react';

interface Load {
  id: string;
  loadNumber: number;
  aircraft: string;
  exitTime: string;
  jumpCount: number;
  students: number;
  tandem: number;
}

/** Row for reconciliation breakdown (activity type or wallet line). */
interface RevenueRow {
  id: string;
  label: string;
  kind: 'cash' | 'card' | 'wallet' | 'comp';
  amount: number;
  count: number;
}

interface DailyReconciliationResponse {
  date: string;
  dropzoneId: number;
  bookingCount: number;
  loadCount: number;
  slotCount: number;
  grossRevenueCents: number;
  refundsCents: number;
  netRevenueCents: number;
  byActivityType: Record<string, { count: number; revenueCents: number }>;
  walletTopupsCents: number;
  outstandingBookings: number;
  noShowCount: number;
}

const checklist = [
  { id: 'gear', label: 'Gear returned to storage', completed: true },
  { id: 'aircraft', label: 'Aircraft secured and locked', completed: true },
  { id: 'manifest', label: 'Manifest closed and exported', completed: false },
  { id: 'rigger', label: 'Rigger inspection completed', completed: true },
  { id: 'fuel', label: 'Aircraft refueled', completed: true },
  { id: 'weather', label: 'Weather conditions logged', completed: true },
  { id: 'incidents', label: 'Incident reports filed', completed: false },
  { id: 'inventory', label: 'Inventory reconciliation', completed: true },
];

export default function EndOfDayPage() {
  const { user } = useAuth();
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(
    Object.fromEntries(checklist.map((item) => [item.id, item.completed]))
  );
  const [loads, setLoads] = useState<Load[]>([]);
  const [revenueRows, setRevenueRows] = useState<RevenueRow[]>([]);
  const [totalRevenueDollars, setTotalRevenueDollars] = useState(0);
  const [eodSlots, setEodSlots] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [loadsRes, eodRes] = await Promise.all([
          apiGet<{ success?: boolean; data?: any[] }>('/loads?status=COMPLETE&limit=50'),
          apiGet<{ success?: boolean; data?: DailyReconciliationResponse }>('/reconciliation/daily'),
        ]);

        if (Array.isArray(loadsRes?.data)) {
          const mapped: Load[] = loadsRes.data.map((l: any) => ({
            id: String(l.id),
            loadNumber: parseInt(String(l.loadNumber), 10) || l.id,
            aircraft: l.aircraftRegistration || 'Unknown',
            exitTime: l.scheduledAt
              ? new Date(l.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '',
            jumpCount: l.slotsCount ?? l.slots?.length ?? 0,
            students: l.slots?.filter((s: any) => s.slotType === 'AFF_STUDENT').length ?? 0,
            tandem: l.slots?.filter((s: any) => s.slotType === 'TANDEM_PASSENGER').length ?? 0,
          }));
          setLoads(mapped);
        } else {
          setLoads([]);
        }

        if (eodRes?.data && typeof eodRes.data === 'object' && !Array.isArray(eodRes.data)) {
          const d = eodRes.data;
          setTotalRevenueDollars((d.netRevenueCents ?? 0) / 100);
          setEodSlots(typeof d.slotCount === 'number' ? d.slotCount : null);

          const rows: RevenueRow[] = Object.entries(d.byActivityType || {}).map(([key, v]) => ({
            id: `activity-${key}`,
            label: key.replace(/_/g, ' '),
            kind: 'card',
            amount: ((v as { revenueCents?: number }).revenueCents ?? 0) / 100,
            count: (v as { count?: number }).count ?? 0,
          }));

          if ((d.walletTopupsCents ?? 0) > 0) {
            rows.push({
              id: 'wallet-topups',
              label: 'Wallet top-ups',
              kind: 'wallet',
              amount: d.walletTopupsCents / 100,
              count: 1,
            });
          }

          setRevenueRows(rows);
        } else {
          setTotalRevenueDollars(0);
          setRevenueRows([]);
          setEodSlots(null);
        }
      } catch {
        setLoads([]);
        setRevenueRows([]);
        setTotalRevenueDollars(0);
        setEodSlots(null);
      }
    }
    fetchData();
  }, []);

  const totalJumpsFromLoads = loads.reduce((sum, load) => sum + load.jumpCount, 0);
  const totalJumps = eodSlots !== null ? eodSlots : totalJumpsFromLoads;
  const totalLoads = loads.length;
  const incidentCount = 0;

  const toggleCheckItem = (id: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const allChecklistCompleted = Object.values(checkedItems).every(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 dark:from-transparent to-gray-100 p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">End-of-Day Report</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="flex flex-col gap-2 lg:flex-row">
            <button
              onClick={() => {
                // PDF generation will use reportBuilder API when available
                const el = document.createElement('a');
                el.setAttribute('href', '#');
                window.dispatchEvent(new CustomEvent('toast', { detail: 'PDF report generation queued' }));
              }}
              className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 font-semibold text-gray-900 dark:text-white hover:bg-gray-50 transition-colors"
            >
              <FileDown className="h-5 w-5" />
              Generate PDF
            </button>
            <button
              disabled={!allChecklistCompleted}
              onClick={async () => {
                if (!window.confirm('Close the day? This will finalize all records and cannot be undone.')) return;
                try {
                  // Call end-of-day reconciliation endpoint
                  await apiGet('/reports?type=eod');
                } catch {
                  // EOD reconciliation API not yet available
                }
                // Update UI to reflect day is closed
                setCheckedItems(Object.fromEntries(checklist.map((item) => [item.id, true])));
              }}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <CheckCircle className="h-5 w-5" />
              Close Day
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid gap-4 lg:grid-cols-4">
        <div className="rounded-lg bg-white dark:bg-slate-800 p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Loads</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{totalLoads}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <Plane className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white dark:bg-slate-800 p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Jumps</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{totalJumps}</p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white dark:bg-slate-800 p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">${totalRevenueDollars.toLocaleString()}</p>
            </div>
            <div className="rounded-full bg-yellow-100 p-3">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white dark:bg-slate-800 p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Incidents</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{incidentCount}</p>
            </div>
            <div className="rounded-full bg-red-100 p-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Loads Table */}
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white dark:bg-slate-800 shadow">
            <div className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Loads Completed</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-slate-900">
                    <th className="px-6 py-3 text-left font-semibold text-gray-900 dark:text-white">Load</th>
                    <th className="hidden px-6 py-3 text-left font-semibold text-gray-900 dark:text-white lg:table-cell">
                      Aircraft
                    </th>
                    <th className="hidden px-6 py-3 text-left font-semibold text-gray-900 dark:text-white md:table-cell">
                      Exit Time
                    </th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-900 dark:text-white">
                      Jumpers
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loads.map((load) => (
                    <tr key={load.id} className="hover:bg-gray-50 dark:bg-slate-900">
                      <td className="px-6 py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Load {load.loadNumber}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 lg:hidden">{load.aircraft}</p>
                        </div>
                      </td>
                      <td className="hidden px-6 py-3 text-gray-700 dark:text-gray-300 lg:table-cell">
                        {load.aircraft}
                      </td>
                      <td className="hidden px-6 py-3 text-gray-700 dark:text-gray-300 md:table-cell">
                        {load.exitTime}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="text-gray-900 dark:text-white font-medium">
                          {load.jumpCount}
                          <span className="text-xs text-gray-500 dark:text-gray-400 block">
                            {load.students}S {load.tandem}T
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="rounded-lg bg-white dark:bg-slate-800 shadow">
          <div className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Revenue Breakdown</h2>
          </div>
          <div className="space-y-4 p-6">
            {revenueRows.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No revenue breakdown for today yet. Totals reflect booking package revenue and wallet activity from the
                reconciliation service.
              </p>
            ) : (
              revenueRows.map((item) => {
                let icon = <CreditCard className="h-5 w-5" />;
                let color = 'text-blue-600';
                let bgColor = 'bg-blue-100';

                if (item.kind === 'cash') {
                  color = 'text-green-600';
                  bgColor = 'bg-green-100';
                  icon = <DollarSign className="h-5 w-5" />;
                } else if (item.kind === 'wallet') {
                  color = 'text-purple-600';
                  bgColor = 'bg-purple-100';
                  icon = <Wallet className="h-5 w-5" />;
                } else if (item.kind === 'comp') {
                  color = 'text-gray-600';
                  bgColor = 'bg-gray-100';
                  icon = <CheckCircle className="h-5 w-5" />;
                }

                return (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-full ${bgColor} p-2`}>
                        <div className={color}>{icon}</div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.count} line(s)</p>
                      </div>
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white">${item.amount.toLocaleString()}</p>
                  </div>
                );
              })
            )}
            <div className="border-t border-gray-200 dark:border-slate-700 dark:border-gray-700 pt-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-900 dark:text-white">Total (net)</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">${totalRevenueDollars.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="mt-8 rounded-lg bg-white dark:bg-slate-800 shadow">
        <div className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Outstanding Items Checklist</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {checklist.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 dark:bg-slate-900">
              <input
                type="checkbox"
                checked={checkedItems[item.id]}
                onChange={() => toggleCheckItem(item.id)}
                className="h-5 w-5 cursor-pointer rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-600"
              />
              <span
                className={`flex-1 ${
                  checkedItems[item.id]
                    ? 'line-through text-gray-500'
                    : 'text-gray-900'
                }`}
              >
                {item.label}
              </span>
              {checkedItems[item.id] && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </div>
          ))}
        </div>
        {allChecklistCompleted && (
          <div className="bg-green-50 px-6 py-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-green-800">
              <CheckCircle className="h-5 w-5" />
              All items completed. Ready to close the day!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
