/**
 * SkyLara Mobile Design Tokens
 * Source of truth for all visual constants — extracted from Figma (SkyTripe).
 * Every component reads from here. Never hardcode colors, sizes, or spacing.
 */

import { Platform } from 'react-native';

// ─── Colors ──────────────────────────────────────────────────────────────────

export const colors = {
  brand: {
    primary: '#0EA5E9',     // Sky-500 — primary actions, tab bar active, links
    secondary: '#6366F1',   // Indigo-500 — secondary actions, ticket cards, badges
    accent: '#14B8A6',      // Teal-500 — success states, check-in confirmed
    danger: '#EF4444',      // Red-500 — destructive actions, grounding, emergency
    warning: '#F59E0B',     // Amber-500 — weather holds, expiring items
    success: '#22C55E',     // Green-500 — confirmed, OK status, check-in
    dark: '#0F172A',        // Slate-900 — splash bg, dark text
    muted: '#64748B',       // Slate-500 — secondary text, placeholders
  },
  sky: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#BAE6FD',
    300: '#7DD3FC',
    400: '#38BDF8',
    500: '#0EA5E9',
    600: '#0284C7',
    700: '#0369A1',
    800: '#075985',
    900: '#0C4A6E',
    950: '#082F49',
  },
  gray: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
  // Semantic aliases
  background: '#FFFFFF',
  surface: '#F8FAFC',       // gray.50 — card backgrounds, input fills
  border: '#E2E8F0',        // gray.200 — default borders
  borderFocus: '#0EA5E9',   // brand.primary — focused input borders
  text: {
    primary: '#0F172A',     // gray.900
    secondary: '#475569',   // gray.600
    tertiary: '#94A3B8',    // gray.400
    inverse: '#FFFFFF',
    link: '#0EA5E9',        // brand.primary
  },
  status: {
    filling: '#3B82F6',     // Blue-500
    locked: '#F59E0B',      // Amber-500
    boarding: '#22C55E',    // Green-500
    inFlight: '#8B5CF6',    // Violet-500
    completed: '#64748B',   // Slate-500
    cancelled: '#EF4444',   // Red-500
    error: '#EF4444',       // Alias for form/validation errors (same as brand.danger)
  },
  // Semantic tint palettes — bg/border/text triples for status indicators
  tint: {
    danger:  { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C' },
    success: { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D' },
    warning: { bg: '#FEFCE8', border: '#FEF08A', text: '#A16207' },
    info:    { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' },
    orange:  { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C' },
  },
  // Decorative / accent hex values used in data-driven configs
  accent: {
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32',
    star: '#F59E0B',
    emerald: '#10B981',
    orange: '#F97316',
    violet: '#7C3AED',
    deepRed: '#991B1B',
  },
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const typography = {
  fontFamily: {
    regular: undefined,     // System default on both platforms
    medium: undefined,
    semibold: undefined,
    bold: undefined,
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  lineHeight: {
    xs: 16,
    sm: 18,
    base: 22,
    lg: 24,
    xl: 28,
    '2xl': 32,
    '3xl': 36,
    '4xl': 40,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
} as const;

// ─── Border Radius ───────────────────────────────────────────────────────────

export const radii = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────

const makeShadow = (
  offsetY: number,
  opacity: number,
  radius: number,
  elevation: number,
) => {
  if (Platform.OS === 'web') {
    // Use boxShadow on web to avoid deprecation warning
    return {
      boxShadow: offsetY === 0
        ? 'none'
        : `0px ${offsetY}px ${radius}px rgba(0, 0, 0, ${opacity})`,
    } as any;
  }
  return {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };
};

export const shadows = {
  none: makeShadow(0, 0, 0, 0),
  sm: makeShadow(1, 0.05, 2, 1),
  md: makeShadow(2, 0.08, 4, 3),
  lg: makeShadow(4, 0.1, 8, 5),
  xl: makeShadow(8, 0.12, 16, 8),
};

// ─── Icon Sizes ──────────────────────────────────────────────────────────────

export const iconSizes = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  '2xl': 32,
  '3xl': 40,
} as const;

// ─── Hit Slop ────────────────────────────────────────────────────────────────
// Minimum 44×44 touch targets per Apple HIG / Android Material

export const hitSlop = {
  sm: { top: 8, bottom: 8, left: 8, right: 8 },
  md: { top: 12, bottom: 12, left: 12, right: 12 },
  lg: { top: 16, bottom: 16, left: 16, right: 16 },
} as const;

// ─── Animation Durations ─────────────────────────────────────────────────────

export const durations = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

// ─── Tab Bar ─────────────────────────────────────────────────────────────────

export const tabBar = {
  height: 60,
  paddingBottom: 8,
  paddingTop: 8,
  activeColor: colors.brand.primary,
  inactiveColor: colors.gray[400],
  backgroundColor: colors.background,
  borderColor: colors.border,
} as const;
