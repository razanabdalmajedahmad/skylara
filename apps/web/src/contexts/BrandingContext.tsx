'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiGet } from '@/lib/api';

// ============================================================================
// BRANDING CONTEXT — Tenant-aware white-label theming
// ============================================================================

export interface BrandProfile {
  brandName: string;
  shortName: string | null;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  iconUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  successColor: string;
  warningColor: string;
  dangerColor: string;
  backgroundColor: string;
  surfaceColor: string;
  navColor: string;
  cardStyle: 'flat' | 'soft' | 'outlined' | 'elevated';
  borderRadius: 'sm' | 'md' | 'lg' | 'xl';
  navStyle: 'sidebar' | 'topbar';
  layoutMode: 'default' | 'clean' | 'premium' | 'compact' | 'enterprise';
  fontFamily: string | null;
  headerTitle: string | null;
  loginTitle: string;
  loginSubtitle: string;
  welcomeMessage: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  footerText: string | null;
  textOverrides: Record<string, string>;
  isPublished: boolean;
  isDefault: boolean;
}

const DEFAULT_BRAND: BrandProfile = {
  brandName: 'SkyLara',
  shortName: null,
  logoUrl: null,
  logoDarkUrl: null,
  iconUrl: null,
  faviconUrl: null,
  primaryColor: '#1A4F8A',
  secondaryColor: '#0EA5E9',
  accentColor: '#F59E0B',
  successColor: '#10B981',
  warningColor: '#F59E0B',
  dangerColor: '#EF4444',
  backgroundColor: '#F0F4F8',
  surfaceColor: '#FFFFFF',
  navColor: '#0B1E38',
  cardStyle: 'soft',
  borderRadius: 'md',
  navStyle: 'sidebar',
  layoutMode: 'default',
  fontFamily: null,
  headerTitle: null,
  loginTitle: 'SkyLara',
  loginSubtitle: 'Skydiving DZ Management',
  welcomeMessage: null,
  supportEmail: null,
  supportPhone: null,
  footerText: null,
  textOverrides: {},
  isPublished: false,
  isDefault: true,
};

interface BrandingContextType {
  brand: BrandProfile;
  isLoading: boolean;
  refreshBranding: () => Promise<void>;
  getLabel: (key: string, fallback: string) => string;
}

const BrandingContext = createContext<BrandingContextType>({
  brand: DEFAULT_BRAND,
  isLoading: false,
  refreshBranding: async () => {},
  getLabel: (_, fb) => fb,
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [brand, setBrand] = useState<BrandProfile>(DEFAULT_BRAND);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBranding = async () => {
    try {
      const res = await apiGet<{ success: boolean; data: any }>('/branding');
      if (res?.data) {
        setBrand({ ...DEFAULT_BRAND, ...res.data });
      }
    } catch {
      // Keep defaults
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  // Apply CSS custom properties when brand changes
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', brand.primaryColor);
    root.style.setProperty('--brand-secondary', brand.secondaryColor);
    root.style.setProperty('--brand-accent', brand.accentColor);
    root.style.setProperty('--brand-success', brand.successColor);
    root.style.setProperty('--brand-warning', brand.warningColor);
    root.style.setProperty('--brand-danger', brand.dangerColor);
    root.style.setProperty('--brand-bg', brand.backgroundColor);
    root.style.setProperty('--brand-surface', brand.surfaceColor);
    root.style.setProperty('--brand-nav', brand.navColor);
    if (brand.fontFamily) {
      root.style.setProperty('--brand-font', brand.fontFamily);
    }
  }, [brand]);

  const getLabel = (key: string, fallback: string): string => {
    return brand.textOverrides[key] || fallback;
  };

  return (
    <BrandingContext.Provider value={{ brand, isLoading, refreshBranding: fetchBranding, getLabel }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}

export { DEFAULT_BRAND };
