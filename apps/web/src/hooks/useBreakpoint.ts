'use client';

import { useState, useEffect } from 'react';

/**
 * Tailwind breakpoint values in pixels.
 * Must stay in sync with tailwind.config.ts.
 */
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Returns the current active Tailwind breakpoint name.
 *
 * - 'base' → < 640px (phones)
 * - 'sm'   → 640–767px
 * - 'md'   → 768–1023px (tablets portrait)
 * - 'lg'   → 1024–1279px (tablets landscape / laptops)
 * - 'xl'   → 1280–1535px (desktops)
 * - '2xl'  → 1536px+ (large desktops)
 */
export type ActiveBreakpoint = 'base' | Breakpoint;

function getBreakpoint(width: number): ActiveBreakpoint {
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'base';
}

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<ActiveBreakpoint>('base');
  const [width, setWidth] = useState(0);

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      setWidth(w);
      setBreakpoint(getBreakpoint(w));
    }

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const isMobile = breakpoint === 'base' || breakpoint === 'sm';
  const isTablet = breakpoint === 'md';
  const isDesktop = breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl';

  return {
    breakpoint,
    width,
    isMobile,
    isTablet,
    isDesktop,
    /** True when width >= the given breakpoint */
    gte(bp: Breakpoint) {
      return width >= BREAKPOINTS[bp];
    },
    /** True when width < the given breakpoint */
    lt(bp: Breakpoint) {
      return width < BREAKPOINTS[bp];
    },
  };
}
