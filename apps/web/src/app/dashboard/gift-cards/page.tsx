'use client';

import { useState, useEffect, useCallback } from 'react';
import { Gift, Send, Copy, RefreshCw, XCircle } from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface GiftCard {
  id: number;
  uuid: string;
  code: string;
  amountCents: number;
  balanceCents: number;
  recipientName: string;
  recipientEmail?: string;
  status: 'ACTIVE' | 'REDEEMED' | 'EXPIRED' | 'CANCELLED';
  message?: string;
  issuedBy?: { id: number; firstName: string; lastName: string };
  redeemedBy?: { id: number; firstName: string; lastName: string } | null;
  redeemedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

interface GiftCardStats {
  totalIssued: number;
  totalRedeemed: number;
  outstandingBalance: number;
  totalCards: number;
  activeCards: number;
  redeemedCards: number;
  expiredCards: number;
}

interface GiftCardForm {
  amountCents: number;
  recipientName: string;
  recipientEmail: string;
  message: string;
  expiresInDays: number;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  REDEEMED: 'bg-gray-100 text-gray-700',
  EXPIRED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-amber-100 text-amber-700',
};

const AMOUNT_OPTIONS = [
  { label: 'AED 100', value: 10000 },
  { label: 'AED 250', value: 25000 },
  { label: 'AED 500', value: 50000 },
  { label: 'AED 750', value: 75000 },
  { label: 'AED 1,000', value: 100000 },
];

function formatCurrency(cents: number): string {
  return `AED ${(cents / 100).toLocaleString()}`;
}

export default function GiftCardsPage() {
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [stats, setStats] = useState<GiftCardStats>({
    totalIssued: 0, totalRedeemed: 0, outstandingBalance: 0,
    totalCards: 0, activeCards: 0, redeemedCards: 0, expiredCards: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<GiftCardForm>({
    amountCents: 25000,
    recipientName: '',
    recipientEmail: '',
    message: '',
    expiresInDays: 365,
  });
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchGiftCards = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiGet<{ success: boolean; data: { giftCards: GiftCard[]; stats: GiftCardStats } }>('/gift-cards');
      if (res?.data) {
        setGiftCards(res.data.giftCards || []);
        setStats((prev) => res.data.stats ?? prev);
      }
    } catch {
      setError('Failed to load gift cards');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGiftCards();
  }, [fetchGiftCards]);

  const handleFormChange = (field: keyof GiftCardForm, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleIssueGiftCard = useCallback(async () => {
    if (!formData.recipientName.trim()) {
      setError('Recipient name is required');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await apiPost('/gift-cards', {
        amountCents: formData.amountCents,
        recipientName: formData.recipientName.trim(),
        recipientEmail: formData.recipientEmail.trim() || undefined,
        message: formData.message.trim() || undefined,
        expiresInDays: formData.expiresInDays,
      });
      setFormData({ amountCents: 25000, recipientName: '', recipientEmail: '', message: '', expiresInDays: 365 });
      setShowForm(false);
      await fetchGiftCards();
    } catch {
      setError('Failed to issue gift card');
    } finally {
      setIsSaving(false);
    }
  }, [formData, fetchGiftCards]);

  const handleCancelCard = useCallback(async (id: number) => {
    try {
      await apiPatch(`/gift-cards/${id}/cancel`, {});
      await fetchGiftCards();
    } catch {
      setError('Failed to cancel gift card');
    }
  }, [fetchGiftCards]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gift Cards</h1>
            <p className="text-gray-600 dark:text-gray-400 dark:text-gray-300 mt-1">Manage gift card issuance and redemption</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchGiftCards}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold transition-colors"
            >
              <Gift size={18} />
              Issue Gift Card
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-lg p-6 shadow-md">
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Total Issued</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(stats.totalIssued)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-lg p-6 shadow-md">
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Total Redeemed</div>
            <div className="text-3xl font-bold text-emerald-600">
              {formatCurrency(stats.totalRedeemed)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-lg p-6 shadow-md">
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Outstanding Balance</div>
            <div className="text-3xl font-bold text-sky-600">
              {formatCurrency(stats.outstandingBalance)}
            </div>
          </div>
        </div>

        {/* Issue Gift Card Form */}
        {showForm && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Issue New Gift Card</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Gift Card Amount
                </label>
                <select
                  value={formData.amountCents}
                  onChange={(e) => handleFormChange('amountCents', Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                >
                  {AMOUNT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Recipient Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., John Doe"
                  value={formData.recipientName}
                  onChange={(e) => handleFormChange('recipientName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Recipient Email (optional)
                </label>
                <input
                  type="email"
                  placeholder="recipient@example.com"
                  value={formData.recipientEmail}
                  onChange={(e) => handleFormChange('recipientEmail', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Expires In (days)
                </label>
                <select
                  value={formData.expiresInDays}
                  onChange={(e) => handleFormChange('expiresInDays', Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                >
                  <option value={90}>90 days</option>
                  <option value={180}>6 months</option>
                  <option value={365}>1 year</option>
                  <option value={730}>2 years</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  placeholder="Add a personal message..."
                  rows={3}
                  value={formData.message}
                  onChange={(e) => handleFormChange('message', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleIssueGiftCard}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                <Send size={18} />
                {isSaving ? 'Issuing...' : 'Issue & Send'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 dark:text-gray-300 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && giftCards.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-12 text-center">
            <Gift size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No Gift Cards Yet</h3>
            <p className="text-gray-500 dark:text-gray-400">Issue your first gift card to get started.</p>
          </div>
        )}

        {/* Gift Cards List */}
        {!isLoading && giftCards.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-slate-900">
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">Gift Card Code</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">Recipient</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300">Original Amount</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">Issued</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {giftCards.map((gc) => (
                    <tr key={gc.id} className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 hover:bg-gray-50 dark:bg-slate-900">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{gc.code}</div>
                          <button
                            onClick={() => handleCopyCode(gc.code)}
                            className="p-1 hover:bg-gray-200 rounded text-gray-600 dark:text-gray-400 transition-colors"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                        {copiedCode === gc.code && (
                          <div className="text-xs text-emerald-600 font-semibold mt-1">Copied!</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 dark:text-white">{gc.recipientName}</div>
                        {gc.recipientEmail && <div className="text-xs text-gray-500 dark:text-gray-400">{gc.recipientEmail}</div>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(gc.amountCents)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-semibold ${gc.balanceCents > 0 ? 'text-emerald-600' : 'text-gray-600'}`}>
                          {formatCurrency(gc.balanceCents)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {new Date(gc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[gc.status] || 'bg-gray-100 text-gray-700'}`}>
                          {gc.status.charAt(0) + gc.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {gc.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleCancelCard(gc.id)}
                            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-semibold transition-colors"
                            title="Cancel gift card"
                          >
                            <XCircle size={14} className="inline mr-1" />
                            Cancel
                          </button>
                        )}
                        {gc.status === 'REDEEMED' && gc.redeemedBy && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            by {gc.redeemedBy.firstName} {gc.redeemedBy.lastName}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary Footer */}
        {!isLoading && giftCards.length > 0 && (
          <div className="mt-8 p-6 bg-gray-50 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-lg">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Gift Card Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400 dark:text-gray-300">Total Cards Issued</span>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalCards}</div>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400 dark:text-gray-300">Active Cards</span>
                <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.activeCards}</div>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400 dark:text-gray-300">Redeemed Cards</span>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.redeemedCards}</div>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400 dark:text-gray-300">Expired / Cancelled</span>
                <div className="text-2xl font-bold text-amber-600 mt-1">{stats.expiredCards}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
