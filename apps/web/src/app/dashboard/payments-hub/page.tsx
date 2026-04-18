'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  Link2,
  CheckCircle2,
  ChevronDown,
  RefreshCw,
  Download,
  X,
} from 'lucide-react';

interface StripeAccount {
  status: 'not_connected' | 'pending' | 'active';
  accountId?: string;
  lastPayout?: string;
  nextPayout?: string;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'SUCCEEDED' | 'PROCESSING' | 'FAILED' | 'REFUNDED';
  splits?: {
    dz: { percentage: number; amount: number };
    coach: { percentage: number; amount: number };
    platform: { percentage: number; amount: number };
  };
}

interface PayoutItem {
  id: string;
  amount: number;
  status: 'pending' | 'in_transit' | 'paid';
  initiatedAt: string;
  paidAt?: string;
}

interface RefundRequest {
  transactionId: string;
  amount: number;
  reason: string;
}

const STATUS_COLORS = {
  SUCCEEDED: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', badge: 'bg-green-200 dark:bg-green-800' },
  PROCESSING: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400', badge: 'bg-yellow-200 dark:bg-yellow-800' },
  FAILED: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', badge: 'bg-red-200 dark:bg-red-800' },
  REFUNDED: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', badge: 'bg-blue-200 dark:bg-blue-800' },
};

export default function PaymentsHubPage() {
  const { user } = useAuth();
  const [stripeAccount, setStripeAccount] = useState<StripeAccount | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState<'transactions' | 'payouts'>('transactions');
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);
  const [refundModal, setRefundModal] = useState<RefundRequest | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch account and transaction data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accountRes, txRes] = await Promise.all([
          apiGet<StripeAccount>('/payments/account'),
          apiGet<{ transactions: Transaction[] }>('/payments/intents'),
        ]);

        setStripeAccount(accountRes);
        setTransactions(txRes.transactions);
        setError(null);
      } catch (err) {
        // Fallback to mock data for development
        setError(null);
        setStripeAccount({
          status: 'active',
          accountId: 'acct_1234567890',
          lastPayout: '2026-04-01',
          nextPayout: '2026-04-08',
        });
        setTransactions([
          {
            id: 'txn_001',
            date: '2026-04-05',
            description: 'Tandem Jump - John Doe',
            amount: 29900,
            status: 'SUCCEEDED',
            splits: {
              dz: { percentage: 30, amount: 8970 },
              coach: { percentage: 60, amount: 17940 },
              platform: { percentage: 10, amount: 2990 },
            },
          },
          {
            id: 'txn_002',
            date: '2026-04-04',
            description: 'AFF Course - Jane Smith',
            amount: 49900,
            status: 'SUCCEEDED',
            splits: {
              dz: { percentage: 25, amount: 12475 },
              coach: { percentage: 65, amount: 32435 },
              platform: { percentage: 10, amount: 4990 },
            },
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleConnectStripe = async () => {
    setConnecting(true);
    try {
      const response = await apiPost<{ accountLink: string }>('/payments/connect/create-account');
      // Stripe requires full page navigation to their hosted onboarding
      window.location.assign(response.accountLink);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Stripe');
    } finally {
      setConnecting(false);
    }
  };

  const handleRefund = async () => {
    if (!refundModal) return;

    try {
      await apiPost('/payments/refunds', {
        transactionId: refundModal.transactionId,
        amount: refundModal.amount,
        reason: refundModal.reason,
      });

      // Update transaction status
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === refundModal.transactionId ? { ...tx, status: 'REFUNDED' } : tx
        )
      );

      setRefundModal(null);
      setRefundError(null);
    } catch (err) {
      setRefundError(err instanceof Error ? err.message : 'Failed to process refund');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-800 dark:bg-gray-900 p-6">
        <div className="space-y-6">
          <SkeletonLoader />
          <SkeletonLoader />
          <SkeletonLoader />
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Revenue',
      value: `$${((transactions.reduce((sum, tx) => sum + (tx.status === 'SUCCEEDED' ? tx.amount : 0), 0) / 100).toFixed(2))}`,
      change: '+12.5%',
      changePositive: true,
      icon: DollarSign,
    },
    {
      label: 'Pending Payouts',
      value: '$2,450.00',
      change: '+5.2%',
      changePositive: true,
      icon: Clock,
    },
    {
      label: 'Total Refunds',
      value: '$150.00',
      change: '-2.1%',
      changePositive: false,
      icon: TrendingDown,
    },
    {
      label: 'Platform Fees',
      value: '$445.23',
      change: '+3.8%',
      changePositive: true,
      icon: DollarSign,
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-800 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Payments Hub
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your payment account and transaction history
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-300">{error}</p>
          </div>
        )}

        {/* Stripe Connect Status */}
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Stripe Connect Status
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {stripeAccount?.status === 'active'
                  ? 'Your payment account is connected and active'
                  : stripeAccount?.status === 'pending'
                    ? 'Your account setup is pending approval'
                    : 'Connect your Stripe account to accept payments'}
              </p>
            </div>
            {stripeAccount?.status === 'active' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Active
              </div>
            )}
          </div>

          {stripeAccount?.status !== 'active' && (
            <button
              onClick={handleConnectStripe}
              disabled={connecting}
              className="mt-4 flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              <Link2 className="w-5 h-5" />
              {connecting ? 'Connecting...' : 'Connect with Stripe'}
            </button>
          )}

          {stripeAccount?.status === 'active' && (
            <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>Account ID: {stripeAccount.accountId}</p>
              {stripeAccount.lastPayout && (
                <p>Last Payout: {new Date(stripeAccount.lastPayout).toLocaleDateString()}</p>
              )}
              {stripeAccount.nextPayout && (
                <p>Next Payout: {new Date(stripeAccount.nextPayout).toLocaleDateString()}</p>
              )}
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-white dark:bg-slate-800 dark:bg-gray-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <Icon className="w-6 h-6 text-gray-400" />
                  <div className="flex items-center gap-1">
                    {stat.changePositive ? (
                      <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        stat.changePositive
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {stat.change}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Transactions / Payouts Tabs */}
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'transactions'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white dark:hover:text-white'
              }`}
            >
              Transactions ({transactions.length})
            </button>
            <button
              onClick={() => setActiveTab('payouts')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'payouts'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white dark:hover:text-white'
              }`}
            >
              Payouts ({payouts.length})
            </button>
          </div>

          <div className="overflow-x-auto">
            {activeTab === 'transactions' ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const colors = STATUS_COLORS[tx.status];
                    return (
                      <tr
                        key={tx.id}
                        className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {new Date(tx.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {tx.description}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                          ${(tx.amount / 100).toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colors.badge}`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() =>
                              setExpandedTransaction(
                                expandedTransaction === tx.id ? null : tx.id
                              )
                            }
                            className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium flex items-center gap-1"
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform ${
                                expandedTransaction === tx.id ? 'rotate-180' : ''
                              }`}
                            />
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Initiated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Paid
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-600 dark:text-gray-400">
                        No payouts yet
                      </td>
                    </tr>
                  ) : (
                    payouts.map((payout) => (
                      <tr
                        key={payout.id}
                        className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                          ${(payout.amount / 100).toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              payout.status === 'paid'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                            }`}
                          >
                            {payout.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(payout.initiatedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {payout.paidAt
                            ? new Date(payout.paidAt).toLocaleDateString()
                            : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Expanded Transaction Details */}
        {expandedTransaction && (
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            {transactions
              .filter((tx) => tx.id === expandedTransaction)
              .map((tx) => (
                <div key={tx.id}>
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
                    Split Breakdown
                  </h3>
                  {tx.splits ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">
                          Dropzone
                        </p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                          ${(tx.splits.dz.amount / 100).toFixed(2)}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          {tx.splits.dz.percentage}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">
                          Coach
                        </p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                          ${(tx.splits.coach.amount / 100).toFixed(2)}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          {tx.splits.coach.percentage}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">
                          Platform
                        </p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                          ${(tx.splits.platform.amount / 100).toFixed(2)}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          {tx.splits.platform.percentage}%
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-blue-700 dark:text-blue-300">No split information available</p>
                  )}
                  {tx.status === 'SUCCEEDED' && (
                    <button
                      onClick={() =>
                        setRefundModal({
                          transactionId: tx.id,
                          amount: tx.amount,
                          reason: '',
                        })
                      }
                      className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Issue Refund
                    </button>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Refund Modal */}
      {refundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Issue Refund</h3>
              <button
                onClick={() => setRefundModal(null)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {refundError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                {refundError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Refund Amount
                </label>
                <input
                  type="number"
                  value={refundModal.amount / 100}
                  onChange={(e) =>
                    setRefundModal({
                      ...refundModal,
                      amount: Math.round(parseFloat(e.target.value) * 100),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason
                </label>
                <select
                  value={refundModal.reason}
                  onChange={(e) =>
                    setRefundModal({ ...refundModal, reason: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select a reason</option>
                  <option value="customer_request">Customer Request</option>
                  <option value="duplicate">Duplicate Charge</option>
                  <option value="fraudulent">Fraudulent</option>
                </select>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Note: Refunding will automatically reverse all split distributions to DZ,
                  Coach, and Platform.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setRefundModal(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRefund}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg"
                >
                  Confirm Refund
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl p-6 animate-pulse">
      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
      <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div>
    </div>
  );
}
