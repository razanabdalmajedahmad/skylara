'use client';

import { ReactNode } from 'react';

interface ResponsiveContainerProps {
  children: ReactNode;
  /** Additional classes */
  className?: string;
  /** Max width constraint. Default: '7xl' (1280px) */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  /** Horizontal padding. Default: responsive (px-4 sm:px-6 lg:px-8) */
  noPadding?: boolean;
}

const maxWidthClasses: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

/**
 * Standard responsive page container with consistent padding and max-width.
 * Use this to wrap page content for consistent responsive behavior.
 */
export function ResponsiveContainer({
  children,
  className = '',
  maxWidth = '7xl',
  noPadding = false,
}: ResponsiveContainerProps) {
  return (
    <div
      className={`mx-auto w-full ${maxWidthClasses[maxWidth]} ${
        noPadding ? '' : 'px-4 sm:px-6 lg:px-8'
      } ${className}`}
    >
      {children}
    </div>
  );
}

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  /** Number of columns at each breakpoint. Default: 1 / 2 / 3 */
  cols?: {
    base?: 1 | 2 | 3 | 4;
    sm?: 1 | 2 | 3 | 4;
    md?: 1 | 2 | 3 | 4;
    lg?: 1 | 2 | 3 | 4 | 5 | 6;
    xl?: 1 | 2 | 3 | 4 | 5 | 6;
  };
  /** Gap between items. Default: 4 (1rem) */
  gap?: 2 | 3 | 4 | 5 | 6 | 8;
}

const colClasses: Record<string, Record<number, string>> = {
  base: { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' },
  sm: { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' },
  md: { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' },
  lg: {
    1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6',
  },
  xl: {
    1: 'xl:grid-cols-1', 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3',
    4: 'xl:grid-cols-4', 5: 'xl:grid-cols-5', 6: 'xl:grid-cols-6',
  },
};

const gapClasses: Record<number, string> = {
  2: 'gap-2', 3: 'gap-3', 4: 'gap-4', 5: 'gap-5', 6: 'gap-6', 8: 'gap-8',
};

/**
 * Responsive grid that automatically adjusts column count per breakpoint.
 */
export function ResponsiveGrid({
  children,
  className = '',
  cols = { base: 1, md: 2, lg: 3 },
  gap = 4,
}: ResponsiveGridProps) {
  const gridCols = Object.entries(cols)
    .map(([bp, count]) => colClasses[bp]?.[count] ?? '')
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`grid ${gridCols} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}
