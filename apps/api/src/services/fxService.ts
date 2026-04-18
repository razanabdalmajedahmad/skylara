// ============================================================================
// CENTRALIZED FX SERVICE — 10 supported currencies, AED as base
// ============================================================================
// All prices stored in AED (fils = minor units, 1 AED = 100 fils)
// Display conversion happens at the API response layer
// Rates refreshed from cache or fallback to hardcoded defaults
// ============================================================================

export const SUPPORTED_CURRENCIES = [
  'AED', 'USD', 'EUR', 'GBP', 'SAR', 'CHF', 'AUD', 'CAD', 'JPY', 'BRL'
] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export const CURRENCY_CONFIG: Record<SupportedCurrency, {
  code: string;
  symbol: string;
  name: string;
  decimalPlaces: number;
  symbolPosition: 'before' | 'after';
}> = {
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', decimalPlaces: 2, symbolPosition: 'before' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimalPlaces: 2, symbolPosition: 'before' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimalPlaces: 2, symbolPosition: 'before' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimalPlaces: 2, symbolPosition: 'before' },
  SAR: { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', decimalPlaces: 2, symbolPosition: 'before' },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', decimalPlaces: 2, symbolPosition: 'before' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimalPlaces: 2, symbolPosition: 'before' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimalPlaces: 2, symbolPosition: 'before' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimalPlaces: 0, symbolPosition: 'before' },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', decimalPlaces: 2, symbolPosition: 'before' },
};

// Default FX rates: 1 AED = X foreign currency
// AED is pegged to USD at ~3.6725 AED per 1 USD
const DEFAULT_RATES: Record<SupportedCurrency, number> = {
  AED: 1.0000,
  USD: 0.2723,  // 1 AED = 0.2723 USD
  EUR: 0.2510,  // 1 AED = 0.2510 EUR
  GBP: 0.2150,  // 1 AED = 0.2150 GBP
  SAR: 1.0206,  // 1 AED = 1.0206 SAR
  CHF: 0.2400,  // 1 AED = 0.2400 CHF
  AUD: 0.4180,  // 1 AED = 0.4180 AUD
  CAD: 0.3750,  // 1 AED = 0.3750 CAD
  JPY: 40.800,  // 1 AED = 40.80 JPY
  BRL: 1.4100,  // 1 AED = 1.41 BRL
};

const cachedRates: Record<SupportedCurrency, number> = { ...DEFAULT_RATES };
const lastFetchedAt: Date | null = null;

/**
 * Convert an amount from AED (base) to a target currency.
 * Amount is in minor units (fils for AED, cents for USD, etc.)
 */
export function convertFromAED(amountFils: number, toCurrency: SupportedCurrency): number {
  if (toCurrency === 'AED') return amountFils;
  const rate = cachedRates[toCurrency] || DEFAULT_RATES[toCurrency];
  const config = CURRENCY_CONFIG[toCurrency];
  if (config.decimalPlaces === 0) {
    // JPY — no minor units
    return Math.round((amountFils / 100) * rate);
  }
  return Math.round(amountFils * rate);
}

/**
 * Convert an amount from a foreign currency to AED (base).
 * Amount is in minor units of the source currency.
 */
export function convertToAED(amount: number, fromCurrency: SupportedCurrency): number {
  if (fromCurrency === 'AED') return amount;
  const rate = cachedRates[fromCurrency] || DEFAULT_RATES[fromCurrency];
  if (rate === 0) return 0;
  const config = CURRENCY_CONFIG[fromCurrency];
  if (config.decimalPlaces === 0) {
    return Math.round((amount / rate) * 100);
  }
  return Math.round(amount / rate);
}

/**
 * Format an amount in minor units for display.
 */
export function formatCurrency(amountMinor: number, currency: SupportedCurrency): string {
  const config = CURRENCY_CONFIG[currency];
  const major = config.decimalPlaces > 0
    ? (amountMinor / Math.pow(10, config.decimalPlaces)).toFixed(config.decimalPlaces)
    : String(amountMinor);

  return config.symbolPosition === 'before'
    ? `${config.symbol}${major}`
    : `${major} ${config.symbol}`;
}

/**
 * Get all supported currencies with their configs.
 */
export function getSupportedCurrencies() {
  return SUPPORTED_CURRENCIES.map(code => ({
    ...CURRENCY_CONFIG[code],
    rate: cachedRates[code],
  }));
}

/**
 * Get current FX rates (AED-based).
 */
export function getRates(): Record<SupportedCurrency, number> {
  return { ...cachedRates };
}

/**
 * Check if a currency code is supported.
 */
export function isSupportedCurrency(code: string): code is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(code as SupportedCurrency);
}
