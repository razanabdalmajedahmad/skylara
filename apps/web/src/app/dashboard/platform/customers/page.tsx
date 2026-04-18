'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Inbox,
  Search,
  Users,
  ChevronDown,
  ChevronRight,
  Mail,
  Calendar,
  Wallet,
  Plane,
} from 'lucide-react';

interface Customer {
  id: number;
  name: string;
  email: string;
  roles: string[];
  totalJumps: number;
  walletBalance: number;
  lastLogin: string | null;
}

interface CustomerDetail {
  id: number;
  name: string;
  email: string;
  roles: string[];
  athleteData: { licenseNumber?: string; jumpCount?: number; rating?: string } | null;
  wallets: { facilityName: string; balance: number; currency: string }[];
  stats: { totalBookings: number; totalJumps: number; totalIncidents: number };
  recentBookings: { id: number; date: string; type: string; status: string; facilityName: string }[];
}

interface CustomerMeta {
  total: number;
  page: number;
  totalPages: number;
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meta, setMeta] = useState<CustomerMeta>({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCustomers = useCallback(async (query: string, page: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set('search', query);
      params.set('page', page.toString());
      const res = await apiGet<{ success: boolean; data: Customer[]; meta: CustomerMeta }>(
        `/platform/customers?${params.toString()}`
      );
      setCustomers(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch (err: any) {
      setError(err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => {
    setSearch(searchInput);
    setMeta((m) => ({ ...m, page: 1 }));
    setExpandedId(null);
    setDetail(null);
    fetchCustomers(searchInput, 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  useEffect(() => {
    fetchCustomers(search, meta.page);
  }, [meta.page]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDetail = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: CustomerDetail }>(`/platform/customers/${id}`);
      setDetail(res.data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <button onClick={handleSearch} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
          <Search className="w-4 h-4" /> Search
        </button>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="ml-3 text-gray-500 dark:text-gray-400">Searching...</span>
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 text-center py-16">
          <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {search ? 'No customers match your search' : 'Search for customers by name or email'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300 w-8"></th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Roles</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Jumps</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Wallet</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {customers.map((c) => (
                  <CustomerRow
                    key={c.id}
                    customer={c}
                    isExpanded={expandedId === c.id}
                    detail={expandedId === c.id ? detail : null}
                    detailLoading={expandedId === c.id && detailLoading}
                    onToggle={() => toggleDetail(c.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{meta.total} customers total</p>
          <div className="flex gap-2">
            <button onClick={() => setMeta((m) => ({ ...m, page: m.page - 1 }))} disabled={meta.page <= 1} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700">
              Previous
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-500">Page {meta.page} of {meta.totalPages}</span>
            <button onClick={() => setMeta((m) => ({ ...m, page: m.page + 1 }))} disabled={meta.page >= meta.totalPages} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomerRow({ customer, isExpanded, detail, detailLoading, onToggle }: {
  customer: Customer;
  isExpanded: boolean;
  detail: CustomerDetail | null;
  detailLoading: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr onClick={onToggle} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer">
        <td className="px-4 py-3">{isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}</td>
        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{customer.name}</td>
        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{customer.email}</td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {customer.roles.map((r) => (
              <span key={r} className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">{r}</span>
            ))}
          </div>
        </td>
        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{customer.totalJumps.toLocaleString()}</td>
        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">${customer.walletBalance.toFixed(2)}</td>
        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{customer.lastLogin ? new Date(customer.lastLogin).toLocaleDateString() : 'Never'}</td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={7} className="px-6 py-4 bg-gray-50 dark:bg-slate-700/30">
            {detailLoading ? (
              <div className="flex items-center gap-2 py-4 justify-center"><Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> Loading details...</div>
            ) : detail ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Profile</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {detail.email}</p>
                  {detail.athleteData && (
                    <>
                      {detail.athleteData.licenseNumber && <p className="text-sm text-gray-700 dark:text-gray-300">License: {detail.athleteData.licenseNumber}</p>}
                      {detail.athleteData.rating && <p className="text-sm text-gray-700 dark:text-gray-300">Rating: {detail.athleteData.rating}</p>}
                    </>
                  )}
                  <h4 className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 pt-2">Wallets</h4>
                  {detail.wallets?.length ? detail.wallets.map((w, i) => (
                    <p key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5" /> {w.facilityName}: {w.currency} {w.balance.toFixed(2)}
                    </p>
                  )) : <p className="text-xs text-gray-400">No wallets</p>}
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Stats</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-center">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{detail.stats.totalBookings}</p>
                      <p className="text-[10px] text-gray-400">Bookings</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-center">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{detail.stats.totalJumps}</p>
                      <p className="text-[10px] text-gray-400">Jumps</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-center">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{detail.stats.totalIncidents}</p>
                      <p className="text-[10px] text-gray-400">Incidents</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Recent Bookings</h4>
                  {detail.recentBookings?.length ? detail.recentBookings.map((b) => (
                    <div key={b.id} className="flex items-center gap-2 text-sm">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">{b.type}</span>
                      <span className="text-gray-400 dark:text-gray-500">at {b.facilityName}</span>
                      <span className={`ml-auto px-2 py-0.5 text-[10px] rounded-full font-medium ${b.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{b.status}</span>
                    </div>
                  )) : <p className="text-xs text-gray-400">No recent bookings</p>}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Failed to load details</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
