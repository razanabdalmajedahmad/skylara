'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { Loader2, Plus, Warehouse, ArrowRight } from 'lucide-react';

interface VenueSpaceRow {
  id: number;
  name: string;
  slug: string;
  spaceType: string;
  useMode: string;
  status: string;
  capacity: number | null;
  updatedAt: string;
}

export default function VenueSpacesListPage() {
  const router = useRouter();
  const [rows, setRows] = useState<VenueSpaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<{ success: boolean; data: VenueSpaceRow[] }>('/venue-spaces');
        setRows(res.data || []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load venue spaces');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Warehouse className="w-7 h-7 text-sky-600" />
            Venue spaces
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Facility and event spaces (hangars, classrooms, pads, etc.) — separate from lodging stays.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard/commercial/venue-spaces/new')}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          <Plus className="w-4 h-4" />
          New space
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading…
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-800 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center text-gray-500">
          No venue spaces yet. Create one to start the booking pipeline.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/dashboard/commercial/venue-spaces/${r.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{r.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {r.spaceType.replace(/_/g, ' ')} · {r.useMode.replace(/_/g, ' ')} ·{' '}
                    <span className="uppercase">{r.status}</span>
                    {r.capacity != null ? ` · cap ${r.capacity}` : ''}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
