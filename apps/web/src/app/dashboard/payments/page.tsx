'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, CreditCard, ArrowUpRight, ArrowDownLeft, Loader2 } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/Toast';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'payment' | 'refund' | 'payout';
  method: 'cash' | 'card' | 'wallet';
  status: 'completed' | 'pending' | 'failed';
}

interface FilterOptions {
  dateStart: string;
  dateEnd: string;
  type: string;
  method: string;
}

const FALLBACK_TRANSACTIONS: Transaction[] = [];

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
};

const TYPE_COLORS: Record<string, string> = {
  payment: 'text-sky-600',
  refund: 'text-red-600',
  payout: 'text-purple-600',
};

const METHOD_COLORS: Record<string, string> = {
  card: 'bg-sky-100 text-sky-700',
  cash: 'bg-emerald-100 text-emerald-700',
  wallet: 'bg-purple-100 text-purple-700',
};

export default function PaymentsPage() {
  const [filters, setFilters] = useState<FilterOptions>({
    dateStart: '2026-04-01',
    dateEnd: '2026-04-07',
    type: 'all',
    method: 'all',
  });
  const { user } = useAuth();
  const { info } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  const mapApiType = (apiType: string): 'payment' | 'refund' | 'payout' => {
    if (apiType === 'REFUND') return 'refund';
    if (apiType === 'DEBIT') return 'payout';
    return 'payment';
  };

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: Array<{ id: number; uuid: string; type: string; amount: number; balanceAfter: number; description: string; createdAt: string }> }>('/transactions');
      if (res?.data && Array.isArray(res.data)) {
        setTransactions(res.data.map((t) => ({
          id: String(t.id),
          date: t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : '',
          description: t.description || 'Transaction',
          amount: Math.abs((t.amount ?? 0) / 100),
          type: mapApiType(t.type),
          method: 'wallet' as const,
          status: 'completed' as const,
        })));
      } else {
        setTransactions(FALLBACK_TRANSACTIONS);
      }
    } catch {
      setTransactions(FALLBACK_TRANSACTIONS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const filterTransactions = () => {
    return transactions.filter((txn) => {
      const dateMatch =
        txn.date >= filters.dateStart && txn.date <= filters.dateEnd;
      const typeMatch = filters.type === 'all' || txn.type === filters.type;
      const methodMatch =
        filters.method === 'all' || txn.method === filters.method;
      return dateMatch && typeMatch && methodMatch;
    });
  };

  const filteredTransactions = filterTransactions();

  const todayStr = new Date().toISOString().split('T')[0];

  const summary = {
    todayRevenue: filteredTransactions
      .filter((t) => t.type === 'payment' && t.date === todayStr)
      .reduce((sum, t) => sum + t.amount, 0),
    outstandingBalance: filteredTransactions
      .filter((t) => t.type === 'refund' && t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0),
    refunds: filteredTransactions
      .filter((t) => t.type === 'refund')
      .reduce((sum, t) => sum + t.amount, 0),
    pendingPayouts: filteredTransactions
      .filter((t) => t.type === 'payout' && t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0),
  };

  const chartData = [
    { day: 'Mon', amount: 3200 },
    { day: 'Tue', amount: 2400 },
    { day: 'Wed', amount: 4100 },
    { day: 'Thu', amount: 3800 },
    { day: 'Fri', amount: 5200 },
    { day: 'Sat', amount: 6100 },
    { day: 'Sun', amount: 4900 },
  ];

  const maxAmount = Math.max(...chartData.map((d) => d.amount));

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payments & Accounting</h1>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-300 mt-1">Track revenue, refunds, and payouts</p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
            <span className="ml-3 text-gray-600 dark:text-gray-400 font-medium">Loading payment data...</span>
          </div>
        )}

        {!isLoading && (
        <>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Today's Revenue</span>
              <DollarSign size={20} className="text-sky-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              ${summary.todayRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">From {filteredTransactions.filter(t => t.type === 'payment' && t.date === todayStr).length} payments</p>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Outstanding Refunds</span>
              <ArrowDownLeft size={20} className="text-red-600" />
            </div>
            <div className="text-3xl font-bold text-red-600">
              ${summary.outstandingBalance.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Pending refunds</p>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Refunded</span>
              <CreditCard size={20} className="text-amber-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              ${summary.refunds.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{filteredTransactions.filter(t => t.type === 'refund').length} refund(s)</p>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Pending Payouts</span>
              <ArrowUpRight size={20} className="text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-purple-600">
              ${summary.pendingPayouts.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">To be processed</p>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-lg p-6 shadow-md mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Weekly Revenue</h2>
          <div className="flex items-end gap-2 h-64">
            {chartData.map((data, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-gradient-to-t from-sky-500 to-sky-400 rounded-t"
                  style={{ height: `${(data.amount / maxAmount) * 100}%`, minHeight: '8px' }}
                />
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{data.day}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <span className="text-xs text-gray-600 dark:text-gray-400">Revenue Scale: $1000 - ${maxAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-lg p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={filters.dateStart}
                onChange={(e) => setFilters({ ...filters, dateStart: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={filters.dateEnd}
                onChange={(e) => setFilters({ ...filters, dateEnd: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Transaction Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
              >
                <option value="all">All Types</option>
                <option value="payment">Payment</option>
                <option value="refund">Refund</option>
                <option value="payout">Payout</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Payment Method
              </label>
              <select
                value={filters.method}
                onChange={(e) => setFilters({ ...filters, method: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
              >
                <option value="all">All Methods</option>
                <option value="card">Card</option>
                <option value="cash">Cash</option>
                <option value="wallet">Wallet</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button onClick={() => info('Payout processing requires Stripe integration — configure in Settings → Integrations')} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors">
            <ArrowUpRight size={18} />
            Process Payout
          </button>
          <button onClick={() => info('Refund processing requires Stripe integration — configure in Settings → Integrations')} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors">
            <ArrowDownLeft size={18} />
            Issue Refund
          </button>
        </div>

        {/* Transactions Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-slate-900">
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 dark:text-gray-300">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">
                    Method
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
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((txn) => (
                    <React.Fragment key={txn.id}>
                    <tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 hover:bg-gray-50 dark:bg-slate-900">
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{txn.date}</td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {txn.description}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-bold ${TYPE_COLORS[txn.type]}`}>
                          {txn.type === 'refund' ? '-' : '+'}${txn.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          txn.type === 'payment'
                            ? 'bg-sky-100 text-sky-700'
                            : txn.type === 'refund'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {txn.type.charAt(0).toUpperCase() + txn.type.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${METHOD_COLORS[txn.method]}`}>
                          {txn.method.charAt(0).toUpperCase() + txn.method.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[txn.status]}`}>
                          {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setSelectedTxn(selectedTxn?.id === txn.id ? null : txn)} className="px-3 py-1 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded text-xs font-semibold transition-colors">
                          {selectedTxn?.id === txn.id ? 'Close' : 'View'}
                        </button>
                      </td>
                    </tr>
                    {selectedTxn?.id === txn.id && (
                      <tr className="bg-sky-50 dark:bg-sky-900/20">
                        <td colSpan={7} className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><span className="text-xs text-gray-500 dark:text-gray-400 block">Transaction ID</span>{txn.id}</div>
                            <div><span className="text-xs text-gray-500 dark:text-gray-400 block">Date</span>{txn.date}</div>
                            <div><span className="text-xs text-gray-500 dark:text-gray-400 block">Method</span>{txn.method}</div>
                            <div><span className="text-xs text-gray-500 dark:text-gray-400 block">Status</span>{txn.status}</div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold mb-1">Showing</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{filteredTransactions.length}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">transactions</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold mb-1">Total</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              ${filteredTransactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold mb-1">Completed</div>
            <div className="text-2xl font-bold text-emerald-600">
              {filteredTransactions.filter(t => t.status === 'completed').length}
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold mb-1">Pending</div>
            <div className="text-2xl font-bold text-amber-600">
              {filteredTransactions.filter(t => t.status === 'pending').length}
            </div>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
