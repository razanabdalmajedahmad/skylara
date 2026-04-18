/** API may return a raw array or `{ data: T[] }`. */
export function unwrapList<T>(r: unknown): T[] {
  if (Array.isArray(r)) return r as T[];
  if (r && typeof r === 'object' && 'data' in r) {
    const d = (r as { data: unknown }).data;
    if (Array.isArray(d)) return d as T[];
  }
  return [];
}

/** API may return a raw object or `{ data: object }`. */
export function unwrapObject<T>(r: unknown): T | null {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return null;
  const o = r as Record<string, unknown>;
  if ('data' in o && o.data && typeof o.data === 'object' && !Array.isArray(o.data)) {
    return o.data as T;
  }
  return r as T;
}
