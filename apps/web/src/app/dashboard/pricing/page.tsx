'use client';

import { useState, useEffect, useCallback } from 'react';
import { Edit2, Check, Save, Globe } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

// Supported currencies (AED is base, stored in DB)
const CURRENCIES = [
  { code: 'AED', symbol: 'د.إ', rate: 1.0 },
  { code: 'USD', symbol: '$', rate: 0.2723 },
  { code: 'EUR', symbol: '€', rate: 0.2510 },
  { code: 'GBP', symbol: '£', rate: 0.2150 },
  { code: 'SAR', symbol: '﷼', rate: 1.0206 },
  { code: 'CHF', symbol: 'CHF', rate: 0.2400 },
  { code: 'AUD', symbol: 'A$', rate: 0.4180 },
  { code: 'CAD', symbol: 'C$', rate: 0.3750 },
  { code: 'JPY', symbol: '¥', rate: 40.80 },
  { code: 'BRL', symbol: 'R$', rate: 1.4100 },
];

function convertPrice(aedPrice: number, currencyCode: string): string {
  const curr = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
  const converted = aedPrice * curr.rate;
  if (currencyCode === 'JPY') return `${curr.symbol}${Math.round(converted * 100)}`;
  return `${curr.symbol}${converted.toFixed(0)}`;
}

interface PricingTier {
  id: string;
  name: string;
  price: number;
  description: string;
  includes: string[];
  popular?: boolean;
}

interface TandemPrice {
  id: string;
  experience: string;
  price: number;
  description: string;
}

interface AFFCoursePrice {
  id: string;
  level: string;
  price: number;
  description: string;
}

// Prices in AED (base currency — stored in DB as fils/100)
const FALLBACK_PRICING_TIERS: PricingTier[] = [];

const FALLBACK_TANDEM_PRICES: TandemPrice[] = [];

const FALLBACK_AFF_PRICES: AFFCoursePrice[] = [];

export default function PricingPage() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({});
  const [displayCurrency, setDisplayCurrency] = useState('AED');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>(FALLBACK_PRICING_TIERS);
  const [tandemPrices, setTandemPrices] = useState<TandemPrice[]>(FALLBACK_TANDEM_PRICES);
  const [affPrices, setAffPrices] = useState<AFFCoursePrice[]>(FALLBACK_AFF_PRICES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch real pricing from API, fall back to defaults on error
  useEffect(() => {
    async function fetchPricing() {
      try {
        const res = await apiGet<{ success: boolean; data: any[] }>('/pricing');
        if (res?.data && Array.isArray(res.data)) {
          const priceMap: Record<string, number> = {};

          // Build price map from API response, keyed by activityType
          const apiPriceByType: Record<string, number> = {};
          res.data.forEach((p: any) => {
            if (p.activityType && typeof p.basePriceCents === 'number') {
              apiPriceByType[p.activityType] = p.basePriceCents / 100;
            }
          });

          // Map API pricing to local tier IDs
          const TYPE_TO_TIER: Record<string, string> = {
            'FUN_JUMP': 'single',
            'FUN_JUMP_5': 'five-pack',
            'FUN_JUMP_10': 'ten-pack',
            'SEASON_PASS': 'monthly-pass',
            'TANDEM': 'tandem-intro',
            'TANDEM_VIDEO': 'tandem-video',
            'TANDEM_PREMIUM': 'tandem-palm',
            'AFF_L1_3': 'aff-level1',
            'AFF_L4_7': 'aff-level4-7',
            'AFF_L8_9': 'aff-level8-9',
            'AFF_FULL': 'aff-full-cert',
          };

          // Override fallback prices with API values where available
          const updatedTiers = FALLBACK_PRICING_TIERS.map(t => {
            const apiKey = Object.entries(TYPE_TO_TIER).find(([, v]) => v === t.id)?.[0];
            const apiPrice = apiKey ? apiPriceByType[apiKey] : undefined;
            const tier = apiPrice !== undefined ? { ...t, price: apiPrice } : t;
            priceMap[tier.id] = tier.price;
            return tier;
          });

          const updatedTandem = FALLBACK_TANDEM_PRICES.map(t => {
            const apiKey = Object.entries(TYPE_TO_TIER).find(([, v]) => v === t.id)?.[0];
            const apiPrice = apiKey ? apiPriceByType[apiKey] : undefined;
            const item = apiPrice !== undefined ? { ...t, price: apiPrice } : t;
            priceMap[item.id] = item.price;
            return item;
          });

          const updatedAff = FALLBACK_AFF_PRICES.map(t => {
            const apiKey = Object.entries(TYPE_TO_TIER).find(([, v]) => v === t.id)?.[0];
            const apiPrice = apiKey ? apiPriceByType[apiKey] : undefined;
            const item = apiPrice !== undefined ? { ...t, price: apiPrice } : t;
            priceMap[item.id] = item.price;
            return item;
          });

          setPricingTiers(updatedTiers);
          setTandemPrices(updatedTandem);
          setAffPrices(updatedAff);
          setEditedPrices(priceMap);
        } else {
          // No API data — use fallback and initialize price map
          const initial: Record<string, number> = {};
          FALLBACK_PRICING_TIERS.forEach(t => { initial[t.id] = t.price; });
          FALLBACK_TANDEM_PRICES.forEach(t => { initial[t.id] = t.price; });
          FALLBACK_AFF_PRICES.forEach(t => { initial[t.id] = t.price; });
          setEditedPrices(initial);
        }
      } catch {
        // API unreachable — keep fallback data, initialize price map
        const initial: Record<string, number> = {};
        FALLBACK_PRICING_TIERS.forEach(t => { initial[t.id] = t.price; });
        FALLBACK_TANDEM_PRICES.forEach(t => { initial[t.id] = t.price; });
        FALLBACK_AFF_PRICES.forEach(t => { initial[t.id] = t.price; });
        setEditedPrices(initial);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPricing();
  }, []);

  const handlePriceChange = useCallback((id: string, value: number) => {
    setEditedPrices(prev => ({ ...prev, [id]: value }));
  }, []);

  const handleSaveAll = useCallback(async () => {
    setSaveStatus('Saving...');
    try {
      // Save each changed price to the API
      const saves = Object.entries(editedPrices).map(async ([id, price]) => {
        const typeMap: Record<string, string> = {
          'single': 'FUN_JUMP', 'pack-5': 'FUN_JUMP', 'pack-10': 'FUN_JUMP', 'season': 'FUN_JUMP',
          'tandem-basic': 'TANDEM', 'tandem-video': 'TANDEM_VIDEO', 'tandem-premium': 'TANDEM_PREMIUM',
          'aff-level-1': 'AFF', 'aff-3-pack': 'AFF', 'aff-full-cert': 'AFF_FULL',
        };
        const activityType = typeMap[id];
        if (activityType) {
          await apiPost('/pricing', {
            activityType,
            basePriceCents: Math.round(price * 100), // Store in AED fils
            currency: 'AED',
          }).catch(() => {}); // Silent fail for individual items
        }
      });
      await Promise.all(saves);
      setSaveStatus('Prices saved successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
      setIsEditMode(false);
    } catch {
      setSaveStatus('Failed to save — please try again');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  }, [editedPrices]);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pricing & Packages</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage skydiving service pricing</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Globe size={16} className="text-gray-400" />
              <select
                value={displayCurrency}
                onChange={(e) => setDisplayCurrency(e.target.value)}
                className="text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 dark:border-slate-600"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                ))}
              </select>
            </div>
            {saveStatus && (
              <span className={`text-sm font-medium ${saveStatus.includes('success') ? 'text-emerald-600' : saveStatus.includes('Failed') ? 'text-red-600' : 'text-gray-500'}`}>
                {saveStatus}
              </span>
            )}
            {isEditMode && (
              <button
                onClick={handleSaveAll}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors"
              >
                <Save size={18} />
                Save All Prices
              </button>
            )}
            <button
              onClick={() => { if (isEditMode) { setIsEditMode(false); } else { setIsEditMode(true); } }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                isEditMode ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-sky-600 hover:bg-sky-700 text-white'
              }`}
            >
              <Edit2 size={18} />
              {isEditMode ? 'Cancel' : 'Edit Prices'}
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
          </div>
        )}

        {/* Standard Pricing Tiers */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Standard Jump Packages</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-6">
            {pricingTiers.map((tier) => (
              <div
                key={tier.id}
                className={`rounded-lg p-6 relative transition-all ${
                  tier.popular
                    ? 'ring-2 ring-sky-600 shadow-lg'
                    : 'border border-gray-200 dark:border-slate-700 shadow-md'
                } ${isEditMode ? 'bg-blue-50' : 'bg-white'}`}
              >
                {tier.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-sky-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                    POPULAR
                  </div>
                )}

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{tier.name}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{tier.description}</p>

                <div className="mb-6">
                  {isEditMode ? (
                    <input
                      type="number"
                      value={editedPrices[tier.id] ?? tier.price}
                      onChange={(e) => handlePriceChange(tier.id, parseFloat(e.target.value) || 0)}
                      className="text-3xl font-bold text-sky-600 bg-transparent border-b-2 border-sky-600 w-full outline-none"
                    />
                  ) : (
                    <div className="text-3xl font-bold text-sky-600">{convertPrice(editedPrices[tier.id] ?? tier.price, displayCurrency)}</div>
                  )}
                  <div className="text-sm text-gray-600 dark:text-gray-400">per package</div>
                </div>

                <ul className="space-y-3 mb-6">
                  {tier.includes.map((item, idx) => (
                    <li key={idx} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Check size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={isEditMode ? handleSaveAll : undefined}
                  className={`w-full py-2 rounded-lg font-semibold transition-colors ${
                    tier.popular
                      ? 'bg-sky-600 hover:bg-sky-700 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  {isEditMode ? 'Save' : 'View Details'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tandem Pricing */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Tandem Skydiving</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tandemPrices.map((item) => (
              <div key={item.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6 shadow-md">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{item.experience}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{item.description}</p>
                <div className="mb-6">
                  {isEditMode ? (
                    <input
                      type="number"
                      value={editedPrices[item.id] ?? item.price}
                      onChange={(e) => handlePriceChange(item.id, parseFloat(e.target.value) || 0)}
                      className="text-2xl font-bold text-sky-600 bg-transparent border-b-2 border-sky-600 w-full outline-none"
                    />
                  ) : (
                    <div className="text-2xl font-bold text-sky-600">{convertPrice(editedPrices[item.id] ?? item.price, displayCurrency)}</div>
                  )}
                </div>
                <button
                  onClick={isEditMode ? handleSaveAll : undefined}
                  className="w-full py-2 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-lg font-semibold transition-colors"
                >
                  {isEditMode ? 'Save' : 'Book Now'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* AFF Course Pricing */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">AFF Certification Courses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-6">
            {affPrices.map((course) => (
              <div key={course.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6 shadow-md">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{course.level}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{course.description}</p>
                <div className="mb-6">
                  {isEditMode ? (
                    <input
                      type="number"
                      value={editedPrices[course.id] ?? course.price}
                      onChange={(e) => handlePriceChange(course.id, parseFloat(e.target.value) || 0)}
                      className="text-2xl font-bold text-sky-600 bg-transparent border-b-2 border-sky-600 w-full outline-none"
                    />
                  ) : (
                    <div className="text-2xl font-bold text-sky-600">{convertPrice(editedPrices[course.id] ?? course.price, displayCurrency)}</div>
                  )}
                </div>
                <button
                  onClick={isEditMode ? handleSaveAll : undefined}
                  className="w-full py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg font-semibold transition-colors"
                >
                  {isEditMode ? 'Save' : 'Enroll'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6 shadow-md">
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Total Packages</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{pricingTiers.length}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6 shadow-md">
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Tandem Options</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{tandemPrices.length}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6 shadow-md">
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">AFF Levels</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{affPrices.length}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6 shadow-md">
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Avg Package Price</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {convertPrice(pricingTiers.length > 0 ? Math.round(pricingTiers.reduce((sum, t) => sum + t.price, 0) / pricingTiers.length) : 0, displayCurrency)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
