/**
 * Base URL for the web app (SkyLara Next.js), used for deep links to public forms.
 * Set EXPO_PUBLIC_WEB_URL in production (e.g. https://app.skylara.com).
 */
export function getWebAppOrigin(): string {
  const w = process.env.EXPO_PUBLIC_WEB_URL;
  if (w) return w.replace(/\/$/, '');
  const api = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';
  return api.replace(/\/api\/?$/, '').replace('3001', '3000');
}

export function coachRegisterUrl(dropzoneId?: number | null): string {
  const base = getWebAppOrigin();
  const path = '/onboarding/coaches/register';
  const q = dropzoneId != null ? `?dz=${dropzoneId}` : '';
  return `${base}${path}${q}`;
}

export function instructorRegisterUrl(dropzoneId?: number | null): string {
  const base = getWebAppOrigin();
  const path = '/onboarding/instructors/register';
  const q = dropzoneId != null ? `?dz=${dropzoneId}` : '';
  return `${base}${path}${q}`;
}
