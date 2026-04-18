'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Inbox,
  Wallet,
  ArrowRightLeft,
  DollarSign,
  CreditCard,
  X,
  Send,
} from 'lucide-react';

interface WalletStats {
  totalWallets: number;
  totalBalance: number;
  totalTransfers: number;
}

interface WalletEntry {
  id: number;
  userName: string;
  userEmail: string;
  dropzoneName: string;
  balance: number;
  currency: string;
  lastTransaction: string | null;
}

interface Transfer {
  id: number;
  sourceWalletId: number;
  targetWalletId: number;
  sourceName: string;
  targetName: string;
  amount: number;
  currency: string;
  reason: string;
  status: string;
  createdAt: string;
}

export default function WalletsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [wallets, setWallets] = useState<WalletEntry[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transfer form
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferForm, setTransferForm] = useState({ sourceWalletId: '', targetWalletId: '', amount: '', reason: '' });
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [walletsRes, transfersRes] = await Promise.allSettled([
        apiGet<{ success: boolean; data: { stats: WalletStats; wallets: WalletEntry[] } }>('/platform/wallets'),
        apiGet<{ success: boolean; data: Transfer[] }>('/platform/wallets/transfers'),
      ]);
      if (walletsRes.status === 'fulfilled') {
        setStats(walletsRes.value.data.stats);
        setWallets(walletsRes.value.data.wallets || []);
      }
      if (transfersRes.status === 'fulfilled') {
        setTransfers(transfersRes.value.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTransfer = async () => {
    if (!transferForm.sourceWalletId || !transferForm.targetWalletId || !transferForm.amount || !transferForm.reason) {
      setTransferError('All fields are required');
      return;
    }
    setTransferring(true);
    setTransferError(null);
    try {
      await apiPost('/platform/wallets/transfer', {
        sourceWalletId: parseInt(transferForm.sourceWalletId),
        targetWalletId: parseInt(transferForm.targetWalletId),
        amount: parseFloat(transferForm.amount),
        reason: transferForm.reason,
      });
      setShowTransfer(false);
      setTransferForm({ sourceWalletId: '', targetWalletId: '', amount: '', reason: '' });
      await fetchData();
    } catch (err: any) {
      setTransferError(err.message || 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading wallets...</span>
      </div>
    );
  }

  if (error && !wallets.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Retry</button>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Wallets', value: stats?.totalWallets ?? 0, icon: Wallet, color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30', fmt: (v: number) => v.toLocaleString() },
    { label: 'Total Balance', value: stats?.totalBalance ?? 0, icon: DollarSign, color: 'text-green-600 bg-green-100 dark:bg-green-900/30', fmt: (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { label: 'Total Transfers', value: stats?.totalTransfers ?? 0, icon: ArrowRightLeft, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30', fmt: (v: number) => v.toLocaleString() },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
              <div className={`inline-flex p-2.5 rounded-lg ${card.color} mb-3`}><Icon className="w-5 h-5" /></div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.fmt(card.value)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowTransfer(!showTransfer)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
        >
          <Send className="w-4 h-4" /> Transfer
        </button>
      </div>

      {/* Transfer Form */}
      {showTransfer && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-indigo-200 dark:border-indigo-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">New Transfer</h3>
            <button onClick={() => setShowTransfer(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><X className="w-4 h-4 text-gray-500" /></button>
          </div>
          {transferError && <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{transferError}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source Wallet ID</label>
              <select value={transferForm.sourceWalletId} onChange={(e) => setTransferForm((f) => ({ ...f, sourceWalletId: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                <option value="">Select source...</option>
                {wallets.map((w) => <option key={w.id} value={w.id}>{w.userName} - {w.dropzoneName} (${w.balance.toFixed(2)})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Wallet ID</label>
              <select value={transferForm.targetWalletId} onChange={(e) => setTransferForm((f) => ({ ...f, targetWalletId: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                <option value="">Select target...</option>
                {wallets.map((w) => <option key={w.id} value={w.id}>{w.userName} - {w.dropzoneName} (${w.balance.toFixed(2)})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
              <input type="number" step="0.01" min="0.01" value={transferForm.amount} onChange={(e) => setTransferForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
              <input type="text" value={transferForm.reason} onChange={(e) => setTransferForm((f) => ({ ...f, reason: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white" placeholder="Adjustment, refund..." />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowTransfer(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">Cancel</button>
            <button onClick={handleTransfer} disabled={transferring} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {transferring && <Loader2 className="w-4 h-4 animate-spin" />} Execute Transfer
            </button>
          </div>
        </div>
      )}

      {/* Wallet List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Wallets</h2>
        </div>
        {wallets.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No wallets found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">User</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Dropzone</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Balance</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Currency</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Last Transaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {wallets.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{w.userName}</p>
                      <p className="text-xs text-gray-400">{w.userEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{w.dropzoneName}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">${w.balance.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{w.currency}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{w.lastTransaction ? new Date(w.lastTransaction).toLocaleDateString() : '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transfer History */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Transfer History</h2>
        </div>
        {transfers.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No transfers recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">From</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">To</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Reason</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.sourceName}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.targetName}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{t.currency} {t.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{t.reason}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                        t.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : t.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>{t.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
