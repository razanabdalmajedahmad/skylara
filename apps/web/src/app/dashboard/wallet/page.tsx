'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Ticket,
  ChevronRight,
  Download,
  Plus,
  Loader2,
} from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'Credit' | 'Debit' | 'Refund';
  status: 'Completed' | 'Pending';
  reference: string;
}

interface TicketPack {
  id: string;
  name: string;
  remaining: number;
  total: number;
  purchaseDate: string;
}

type FilterType = 'All' | 'Credits' | 'Debits' | 'Refunds';

const FALLBACK_TRANSACTIONS: Transaction[] = [];

const FALLBACK_TICKET_PACKS: TicketPack[] = [];

const DZ_NAME = 'Skydive Arizona';

export default function WalletPage() {
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('All');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ticketPacks, setTicketPacks] = useState<TicketPack[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const [showPackModal, setShowPackModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  const fetchWalletData = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const [walletRes, txRes, ticketRes] = await Promise.all([
        apiGet<{ success: boolean; data: { userId: number; balance: number; currency: string } }>('/wallet').catch(() => null),
        apiGet<{ success: boolean; data: Array<{ id: number; uuid: string; type: string; amount: number; balanceAfter: number; description: string; createdAt: string }> }>('/transactions').catch(() => null),
        apiGet<{ success: boolean; data: Array<{ id: number; ticketType: string; remainingJumps: number; expiresAt: string; createdAt: string }> }>('/tickets').catch(() => null),
      ]);

      if (walletRes?.data) {
        setCurrentBalance((walletRes.data.balance ?? 0) / 100);
      } else {
        setCurrentBalance(0);
      }

      if (txRes?.data && Array.isArray(txRes.data)) {
        setTransactions(txRes.data.map((t) => ({
          id: String(t.id),
          type: t.type === 'CREDIT' ? 'Credit' as const : t.type === 'REFUND' ? 'Refund' as const : 'Debit' as const,
          amount: Math.abs((t.amount ?? 0) / 100),
          description: t.description || 'Transaction',
          date: t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : '',
          status: 'Completed' as const,
          reference: t.uuid || String(t.id),
        })));
      } else {
        setTransactions(FALLBACK_TRANSACTIONS);
      }

      if (ticketRes?.data && Array.isArray(ticketRes.data)) {
        setTicketPacks(ticketRes.data.map((t) => ({
          id: String(t.id),
          name: t.ticketType || 'Jump Pack',
          remaining: t.remainingJumps ?? 0,
          total: t.remainingJumps ?? 0,
          purchaseDate: t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : '',
        })));
      } else {
        setTicketPacks(FALLBACK_TICKET_PACKS);
      }
    } catch {
      setTransactions(FALLBACK_TRANSACTIONS);
      setTicketPacks(FALLBACK_TICKET_PACKS);
      setCurrentBalance(0);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      const matchesSearch =
        txn.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.reference.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesFilter = true;
      if (filterType === 'Credits') {
        matchesFilter = txn.type === 'Credit';
      } else if (filterType === 'Debits') {
        matchesFilter = txn.type === 'Debit';
      } else if (filterType === 'Refunds') {
        matchesFilter = txn.type === 'Refund';
      }

      return matchesSearch && matchesFilter;
    });
  }, [transactions, searchQuery, filterType]);

  const stats = useMemo(() => {
    const credits = transactions.filter((t) => t.type === 'Credit').reduce(
      (sum, t) => sum + t.amount,
      0
    );
    const debits = transactions.filter((t) => t.type === 'Debit').reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0
    );
    const pending = transactions.filter((t) => t.status === 'Pending').reduce(
      (sum, t) => sum + t.amount,
      0
    );
    const remainingTickets = ticketPacks.reduce((sum, p) => sum + p.remaining, 0);

    return { credits, debits, pending, remainingTickets };
  }, [transactions, ticketPacks]);

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'Credit':
        return 'text-emerald-600';
      case 'Debit':
        return 'text-red-600';
      case 'Refund':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'Credit':
        return <TrendingUp className="w-4 h-4" />;
      case 'Debit':
        return <TrendingDown className="w-4 h-4" />;
      case 'Refund':
        return <DollarSign className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Wallet</h1>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-300">Financial management and ticket inventory</p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
            <span className="ml-3 text-gray-600 dark:text-gray-400 font-medium">Loading wallet data...</span>
          </div>
        )}

        {!isLoading && (
        <>
        {/* Balance Card */}
        <div className="bg-gradient-to-r from-sky-600 to-sky-700 rounded-lg shadow-lg p-6 mb-8 text-white">
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="text-sky-100 text-sm font-semibold mb-2">Current Balance</p>
              <h2 className="text-4xl font-bold">${currentBalance.toFixed(2)}</h2>
            </div>
            <CreditCard className="w-12 h-12 text-sky-200" />
          </div>
          <p className="text-sky-100 text-sm">{DZ_NAME} Account</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Total Credits</p>
            <p className="text-2xl font-bold text-emerald-600">
              ${stats.credits.toFixed(2)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Total Debits</p>
            <p className="text-2xl font-bold text-red-600">
              ${stats.debits.toFixed(2)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Pending</p>
            <p className="text-2xl font-bold text-blue-600">
              ${stats.pending.toFixed(2)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Jump Tickets Remaining</p>
            <p className="text-2xl font-bold text-purple-600">{stats.remainingTickets}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mb-8 flex-wrap">
          <button
            onClick={() => setShowTopUpModal(true)}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Top Up Wallet
          </button>
          <button
            onClick={() => setShowPackModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <Ticket className="w-4 h-4" /> Buy Ticket Pack
          </button>
          <button
            onClick={() => { /* Balance transfer feature — requires wallet API endpoint */ }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
          >
            Transfer Balance
          </button>
        </div>

        {/* Ticket Packs Section */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Active Ticket Packs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ticketPacks.map((pack) => (
              <div
                key={pack.id}
                className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Ticket className="w-6 h-6 text-purple-600" />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{pack.name}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Purchased on {pack.purchaseDate}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-600">
                      {pack.remaining}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">of {pack.total}</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${(pack.remaining / pack.total) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Transaction History</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {filteredTransactions.length} of {transactions.length} transactions
                </p>
              </div>
              <button
                onClick={() => {
                  const csv = transactions.map(t => `${t.date},${t.type},${t.amount},${t.description}`).join('\n');
                  const blob = new Blob([`Date,Type,Amount,Description\n${csv}`], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'transactions.csv'; a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Export
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <input
                type="text"
                placeholder="Search by description or reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
              />

              <div className="flex gap-2 flex-wrap">
                {(['All', 'Credits', 'Debits', 'Refunds'] as FilterType[]).map(
                  (type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                        filterType === type
                          ? 'bg-sky-600 text-white'
                          : 'bg-gray-100 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      {type}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

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
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300">
                    Type
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">
                    Reference
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((txn) => (
                    <tr
                      key={txn.id}
                      className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {txn.date}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {txn.description}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`font-semibold flex items-center justify-end gap-2 ${getTransactionColor(
                            txn.type
                          )}`}
                        >
                          {getTransactionIcon(txn.type)}
                          {txn.type === 'Debit' ? '-' : '+'}${txn.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            txn.type === 'Credit'
                              ? 'bg-emerald-100 text-emerald-700'
                              : txn.type === 'Debit'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {txn.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            txn.status === 'Completed'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {txn.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          {txn.reference}
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}
      {/* Top Up Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowTopUpModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Top Up Wallet</h2>
              <button onClick={() => setShowTopUpModal(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 text-xl">&times;</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const amount = parseFloat((form.elements.namedItem('amount') as HTMLInputElement).value);
              if (!amount || amount <= 0) return;
              setIsTopUpLoading(true);
              try {
                const res = await apiPost<{ success: boolean; data: { transactionId: number; newBalance: number; amount: number } }>('/wallet/topup', { amount, paymentMethod: 'CREDIT_CARD' });
                if (res?.success && res.data) {
                  setCurrentBalance((res.data.newBalance ?? 0) / 100);
                }
                setShowTopUpModal(false);
                fetchWalletData();
              } catch {
                // Top-up failed -- modal stays open for retry
              } finally {
                setIsTopUpLoading(false);
              }
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (€)</label>
                <input name="amount" type="number" required min={1} step={0.01} placeholder="50.00" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-sky-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowTopUpModal(false)} disabled={isTopUpLoading} className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isTopUpLoading} className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {isTopUpLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : 'Top Up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Pack Modal */}
      {showPackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowPackModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Buy Ticket Pack</h2>
              <button onClick={() => setShowPackModal(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 text-xl">&times;</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const pack = (form.elements.namedItem('pack') as HTMLInputElement).value;
              const packPrices: Record<string, number> = { '5-Jump Pack': 125, '10-Jump Pack': 230, 'Season Pass': 1800 };
              const amount = packPrices[pack] ?? 0;
              if (!amount) return;
              try {
                await apiPost<{ success: boolean; data: any }>('/wallet/charge', {
                  amount,
                  description: `Purchase: ${pack}`,
                });
                setShowPackModal(false);
                fetchWalletData();
              } catch {
                // Charge failed (insufficient balance or API unavailable)
              }
            }} className="p-6 space-y-3">
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">
                <input type="radio" name="pack" value="5-Jump Pack" defaultChecked className="text-emerald-600" />
                <div><p className="font-semibold text-gray-900 dark:text-white">5-Jump Pack</p><p className="text-sm text-gray-500 dark:text-gray-400">€125</p></div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">
                <input type="radio" name="pack" value="10-Jump Pack" className="text-emerald-600" />
                <div><p className="font-semibold text-gray-900 dark:text-white">10-Jump Pack</p><p className="text-sm text-gray-500 dark:text-gray-400">€230</p></div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">
                <input type="radio" name="pack" value="Season Pass" className="text-emerald-600" />
                <div><p className="font-semibold text-gray-900 dark:text-white">Season Pass</p><p className="text-sm text-gray-500 dark:text-gray-400">€1,800</p></div>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPackModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm">Purchase</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
