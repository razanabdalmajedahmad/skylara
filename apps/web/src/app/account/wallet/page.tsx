'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, getAuthToken } from '@/lib/api';
import {
  Loader2,
  RefreshCw,
  Wallet,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Inbox,
} from 'lucide-react';

interface WalletData {
  balance: number;
  currency: string;
  transactions: {
    id: string;
    type: 'CREDIT' | 'DEBIT';
    amount: number;
    description: string;
    date: string;
    status: string;
  }[];
}

export default function AccountWalletPage() {
  const router = useRouter();
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const fetchWallet = async () => {
      try {
        const res = await apiGet<{ success: boolean; data: WalletData }>('/account/wallet');
        setData(res.data);
      } catch (err: any) {
        if (err.status === 401) {
          router.replace('/login');
          return;
        }
        setError(err.message || 'Failed to load wallet');
      } finally {
        setLoading(false);
      }
    };
    fetchWallet();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading wallet...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        <button
          onClick={() => router.refresh()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/account')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wallet</h1>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 text-white mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Wallet className="w-6 h-6" />
          <span className="text-sm text-blue-200">Available Balance</span>
        </div>
        <p className="text-3xl font-bold">
          {data?.currency || '$'}{(data?.balance ?? 0).toFixed(2)}
        </p>
      </div>

      {/* Transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
        </div>
        {!data?.transactions || data.transactions.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No transactions yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Your transaction history will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.transactions.map((txn) => (
              <div key={txn.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-lg ${
                    txn.type === 'CREDIT'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {txn.type === 'CREDIT' ? (
                      <ArrowDownLeft className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{txn.description}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(txn.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold shrink-0 ${
                  txn.type === 'CREDIT' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {txn.type === 'CREDIT' ? '+' : '-'}{data.currency || '$'}{txn.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
