/**
 * Product analytics facade — wire to your provider in Phase 7+.
 * Never send secrets or raw payment payloads.
 */

export type AnalyticsPayload = Record<string, unknown>;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function enabled(): boolean {
  return process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true';
}

/**
 * Fire-and-forget event. No-ops when analytics disabled (default).
 */
export function trackEvent(name: string, payload?: AnalyticsPayload): void {
  if (!isBrowser() || !enabled()) return;
  // Replace with Segment, PostHog, GA4, etc.
  if (process.env.NODE_ENV === 'development') {
    console.debug('[analytics]', name, payload ?? {});
  }
}

export function trackPageView(path: string, title?: string): void {
  trackEvent('page_view', { path, title });
}
