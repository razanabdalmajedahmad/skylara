'use client';

import { useState, useEffect, useCallback } from 'react';
import { CreditCard, Check, Star, Users, Zap, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { apiGet } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubscriptionApiResponse {
  success: boolean;
  data: SubscriptionData | null;
}

interface SubscriptionData {
  id: number;
  uuid: string;
  userId: number;
  subscriptionTier: 'FREE' | 'PRO' | 'TEAM' | 'EVENT_PASS';
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE' | 'TRIALING';
  startsAt: string;
  endsAt: string | null;
  sourceType: string | null;
  sourceRef: string | null;
  stripeSubId: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TierConfig {
  name: string;
  key: string;
  price: string;
  period: string;
  color: string;
  headerBg: string;
  icon: typeof CreditCard;
  popular?: boolean;
  features: string[];
}

// ---------------------------------------------------------------------------
// Tier definitions (static — these mirror the backend VALID_SUBSCRIPTION_TIERS)
// ---------------------------------------------------------------------------

const FALLBACK_TIERS: TierConfig[] = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function statusBadgeColor(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-100 text-emerald-700';
    case 'TRIALING':
      return 'bg-blue-100 text-blue-700';
    case 'PAST_DUE':
      return 'bg-amber-100 text-amber-700';
    case 'CANCELLED':
    case 'EXPIRED':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SubscriptionsPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<SubscriptionApiResponse>('/learning/subscription');
      if (res?.success !== undefined) {
        setSubscription(res.data ?? null);
      } else {
        throw new Error('Unexpected response shape');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Subscriptions] Failed to fetch subscription:', message);
      setSubscription(null);
      setError('Could not load subscription data. Showing tier preview only.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const activeTierKey = subscription?.subscriptionTier ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscriptions</h1>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={fetchSubscription}
            className="flex items-center gap-1 rounded px-3 py-1 text-xs font-semibold bg-amber-200 hover:bg-amber-300 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="ml-3 text-gray-600 dark:text-gray-400 font-semibold">Loading subscription...</span>
        </div>
      )}

      {!loading && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          {/* Current Subscription Summary */}
          {subscription ? (
            <div className="mb-6 p-4 rounded-lg border border-emerald-200 bg-emerald-50">
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-emerald-800">
                    Active Subscription
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">{subscription.subscriptionTier}</span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadgeColor(subscription.status)}`}>
                      {subscription.status}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                    <p>Started: {formatDate(subscription.startsAt)}</p>
                    {subscription.endsAt && <p>Renews: {formatDate(subscription.endsAt)}</p>}
                    {subscription.sourceType && <p>Source: {subscription.sourceType}</p>}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg mb-6">
              <CreditCard className="w-5 h-5 text-[#1B4F72] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#1B4F72]">No Active Subscription</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  You are currently on the Free tier. Upgrade below to unlock more features.
                  Stripe Billing integration is coming in Phase 2.
                </p>
              </div>
            </div>
          )}

          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Subscription Tiers</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {FALLBACK_TIERS.map((tier) => {
              const Icon = tier.icon;
              const isActive = activeTierKey === tier.key;

              return (
                <div
                  key={tier.key}
                  className={`relative rounded-xl border-2 overflow-hidden ${
                    isActive ? 'border-emerald-500 ring-2 ring-emerald-200' : tier.color
                  }`}
                >
                  {tier.popular && !isActive && (
                    <div className="absolute top-0 right-0 bg-[#1B4F72] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase">
                      Popular
                    </div>
                  )}
                  {isActive && (
                    <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase">
                      Current Plan
                    </div>
                  )}
                  <div className={`${isActive ? 'bg-emerald-50' : tier.headerBg} px-4 py-5 text-center`}>
                    <Icon className="w-8 h-8 mx-auto text-gray-600 dark:text-gray-400 mb-2" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{tier.name}</h3>
                    <div className="mt-1">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">{tier.price}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{tier.period}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <ul className="space-y-2.5">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
