'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiGet } from '@/lib/api';

interface LocaleSettings {
  language: string;
  currency: string;
  dateFormat: string;
  weightUnit: string;
  altitudeUnit: string;
}

interface LocaleContextValue extends LocaleSettings {
  /** BCP-47 locale string derived from language (e.g. "en-US", "de-DE") */
  locale: string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number) => string;
  formatWeight: (lbs: number) => string;
  formatAltitude: (feet: number) => string;
  updateLocale: (settings: Partial<LocaleSettings>) => void;
}

const LANG_TO_LOCALE: Record<string, string> = {
  en: 'en-US', de: 'de-DE', fr: 'fr-FR', es: 'es-ES', it: 'it-IT',
  pt: 'pt-BR', nl: 'nl-NL', pl: 'pl-PL', cs: 'cs-CZ', da: 'da-DK',
  sv: 'sv-SE', fi: 'fi-FI', ar: 'ar-SA', he: 'he-IL', tr: 'tr-TR',
};

const DEFAULTS: LocaleSettings = {
  language: 'en',
  currency: 'USD',
  dateFormat: 'MM/DD/YYYY',
  weightUnit: 'lbs',
  altitudeUnit: 'feet',
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<LocaleSettings>(DEFAULTS);

  useEffect(() => {
    apiGet<{ data: any }>('/admin/settings')
      .then((res) => {
        if (res?.data) {
          setSettings((prev) => ({
            ...prev,
            language: res.data.language || prev.language,
            currency: res.data.currency || prev.currency,
            dateFormat: res.data.dateFormat || prev.dateFormat,
            weightUnit: res.data.weightUnit || prev.weightUnit,
            altitudeUnit: res.data.altitudeUnit || prev.altitudeUnit,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const locale = LANG_TO_LOCALE[settings.language] || 'en-US';

  const formatDate = useCallback(
    (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString(locale, options);
    },
    [locale],
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      value.toLocaleString(locale, options),
    [locale],
  );

  const formatCurrency = useCallback(
    (value: number) =>
      value.toLocaleString(locale, { style: 'currency', currency: settings.currency }),
    [locale, settings.currency],
  );

  const formatWeight = useCallback(
    (lbs: number) => {
      if (settings.weightUnit === 'kg') {
        return `${(lbs * 0.453592).toLocaleString(locale, { maximumFractionDigits: 1 })} kg`;
      }
      return `${lbs.toLocaleString(locale)} lbs`;
    },
    [locale, settings.weightUnit],
  );

  const formatAltitude = useCallback(
    (feet: number) => {
      if (settings.altitudeUnit === 'meters') {
        return `${(feet * 0.3048).toLocaleString(locale, { maximumFractionDigits: 0 })} m`;
      }
      return `${feet.toLocaleString(locale)} ft`;
    },
    [locale, settings.altitudeUnit],
  );

  const updateLocale = useCallback((partial: Partial<LocaleSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  return (
    <LocaleContext.Provider
      value={{
        ...settings,
        locale,
        formatDate,
        formatNumber,
        formatCurrency,
        formatWeight,
        formatAltitude,
        updateLocale,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
