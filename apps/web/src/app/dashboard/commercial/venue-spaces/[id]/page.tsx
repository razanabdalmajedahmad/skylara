'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiPatch, apiDelete } from '@/lib/api';
import { ArrowLeft, Loader2 } from 'lucide-react';

const SPACE_TYPES = [
  'HANGAR', 'CLASSROOM', 'MEETING_ROOM', 'OUTDOOR_PAD', 'VIP_AREA', 'BRIEFING_ROOM',
  'PACKING_AREA', 'RETAIL_CORNER', 'SPONSOR_BOOTH', 'TEMP_ACTIVATION', 'HOSPITALITY',
  'VIEWING_AREA', 'OTHER',
] as const;
const USE_MODES = ['OPERATIONAL_ONLY', 'CUSTOMER_RENTABLE', 'ADVERTISER_RENTABLE', 'MIXED_USE'] as const;

interface VenueSpace {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  spaceType: string;
  useMode: string;
  status: string;
  capacity: number | null;
  indoor: boolean;
  basePriceCents: number | null;
  currency: string;
}

export default function EditVenueSpacePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [row, setRow] = useState<VenueSpace | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [spaceType, setSpaceType] = useState('OTHER');
  const [useMode, setUseMode] = useState('MIXED_USE');
  const [capacity, setCapacity] = useState('');
  const [indoor, setIndoor] = useState(true);
  const [basePriceCents, setBasePriceCents] = useState('');
  const [status, setStatus] = useState('DRAFT');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<{ success: boolean; data: VenueSpace }>(`/venue-spaces/${id}`);
        const r = res.data;
        setRow(r);
        setName(r.name);
        setDescription(r.description || '');
        setSpaceType(r.spaceType);
        setUseMode(r.useMode);
        setCapacity(r.capacity != null ? String(r.capacity) : '');
        setIndoor(r.indoor);
        setBasePriceCents(r.basePriceCents != null ? String(r.basePriceCents) : '');
        setStatus(r.status);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Not found');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPatch(`/venue-spaces/${id}`, {
        name: name.trim(),
        description: description.trim() || null,
        spaceType,
        useMode,
        indoor,
        status,
        capacity: capacity ? parseInt(capacity, 10) : null,
        basePriceCents: basePriceCents ? parseInt(basePriceCents, 10) : null,
        currency: row?.currency || 'USD',
      });
      router.push('/dashboard/commercial/venue-spaces');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!confirm('Archive this space? You cannot archive while non-terminal bookings exist.')) return;
    setSaving(true);
    setError(null);
    try {
      await apiDelete(`/venue-spaces/${id}`);
      router.push('/dashboard/commercial/venue-spaces');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Archive failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (!row && error) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <button
        type="button"
        onClick={() => router.push('/dashboard/commercial/venue-spaces')}
        className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" /> Venue spaces
      </button>

      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Edit venue space</h1>
      <p className="text-xs text-gray-500">Slug: {row?.slug}</p>

      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
          <input
            required
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              value={spaceType}
              onChange={(e) => setSpaceType(e.target.value)}
            >
              {SPACE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Use mode</label>
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              value={useMode}
              onChange={(e) => setUseMode(e.target.value)}
            >
              {USE_MODES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Capacity</label>
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Base price (cents)</label>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              value={basePriceCents}
              onChange={(e) => setBasePriceCents(e.target.value)}
            />
          </div>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={indoor} onChange={(e) => setIndoor(e.target.checked)} />
          Indoor
        </label>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
          <button
            type="button"
            onClick={handleArchive}
            disabled={saving || status === 'ARCHIVED'}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Archive space
          </button>
        </div>
      </form>
    </div>
  );
}
