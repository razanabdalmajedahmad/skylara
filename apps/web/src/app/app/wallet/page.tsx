'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import {
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Plus,
} from 'lucide-react';

interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

export default function AthleteWalletPage() {
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);

  useEffect(() => {
    async function fetchWallet() {
      try {
        const [walletRes, txRes] = await Promise.all([
          apiGet('/payments/wallet'),
          apiGet('/payments/transactions?limit=20'),
        ]);
        setBalance(walletRes?.data?.balance ?? 0);
        setCurrency(walletRes?.data?.currency ?? 'USD');
        setTransactions(txRes?.data?.transactions ?? []);
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    fetchWallet();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 size={32} className="text-secondary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-2xl mx-auto">
        {/* Balance card */}
        <div className="bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl p-6 text-white mb-6">
          <div className="text-sm opacity-85 mb-1">Wallet Balance</div>
          <div className="text-3xl sm:text-4xl font-bold">
            ${(balance / 100).toFixed(2)}
            <span className="text-base opacity-70 ml-1.5">{currency}</span>
          </div>
          <button
            onClick={() => setShowTopUp(!showTopUp)}
            className="mt-4 px-5 py-2.5 rounded-lg border border-white/30 bg-white/15 text-white font-semibold text-sm inline-flex items-center gap-1.5 hover:bg-white/25 transition-colors"
          >
            <Plus size={16} /> Top Up
          </button>
          {showTopUp && (
            <div className="mt-3 p-3 bg-white/10 rounded-lg text-sm text-white/90">
              To add funds to your wallet, please visit the front desk or contact your dropzone operator.
            </div>
          )}
        </div>

        {/* Transaction history */}
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Recent Transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-center py-8">No transactions yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {transactions.map((tx) => {
              const isCredit = tx.type === 'CREDIT' || tx.type === 'REFUND';
              return (
                <div key={tx.id} className="flex items-center gap-3 p-3 sm:p-3.5 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                  <div className={`p-2 rounded-lg ${isCredit ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                    {isCredit
                      ? <ArrowDownRight size={16} className="text-emerald-500" />
                      : <ArrowUpRight size={16} className="text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{tx.description}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={`font-semibold text-sm ${isCredit ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`}>
                    {isCredit ? '+' : '-'}${(Math.abs(tx.amount) / 100).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
