'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { Loader2, ClipboardList } from 'lucide-react';

interface VenueSpaceOpt {
  id: number;
  name: string;
}

interface BookingRow {
  id: number;
  title: string;
  status: string;
  startAt: string;
  endAt: string;
  venueSpace: { id: number; name: string; slug: string };
}

function toLocalDatetimeValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function VenueBookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [spaces, setSpaces] = useState<VenueSpaceOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [venueSpaceId, setVenueSpaceId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [startLocal, setStartLocal] = useState('');
  const [endLocal, setEndLocal] = useState('');
  const [initialStatus, setInitialStatus] = useState<'AWAITING_APPROVAL' | 'DRAFT_INQUIRY'>('AWAITING_APPROVAL');

  async function load() {
    const [b, s] = await Promise.all([
      apiGet<{ success: boolean; data: BookingRow[] }>('/venue-bookings'),
      apiGet<{ success: boolean; data: { id: number; name: string; status: string }[] }>('/venue-spaces?status=ACTIVE'),
    ]);
    setBookings(b.data || []);
    setSpaces((s.data || []).map((x) => ({ id: x.id, name: x.name })));
    if (s.data?.length && venueSpaceId === '') setVenueSpaceId(s.data[0].id);
  }

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function createBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!venueSpaceId || !startLocal || !endLocal) return;
    setCreating(true);
    setError(null);
    try {
      const startAt = new Date(startLocal).toISOString();
      const endAt = new Date(endLocal).toISOString();
      await apiPost('/venue-bookings', {
        venueSpaceId,
        title: title.trim() || 'Booking',
        organizerEmail: organizerEmail.trim() || undefined,
        startAt,
        endAt,
        initialStatus,
      });
      setTitle('');
      setOrganizerEmail('');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  }

  async function transition(id: number, action: string, quotedAmountCents?: number) {
    setError(null);
    try {
      await apiPost(`/venue-bookings/${id}/transition`, {
        action,
        ...(quotedAmountCents != null ? { quotedAmountCents } : {}),
      });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <ClipboardList className="w-7 h-7 text-sky-600" />
          Venue bookings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Request → approve/reject → quote → confirm pipeline (Phase 1 — no payments yet).
        </p>
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

      {!loading && (
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 bg-white dark:bg-gray-900/40">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">New booking</h2>
          <form onSubmit={createBooking} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="md:col-span-2">
              <label className="block text-gray-600 dark:text-gray-400 mb-1">Space (active only)</label>
              <select
                required
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2"
                value={venueSpaceId}
                onChange={(e) => setVenueSpaceId(parseInt(e.target.value, 10))}
              >
                <option value="">Select…</option>
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-600 dark:text-gray-400 mb-1">Title</label>
              <input
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Corporate team event"
              />
            </div>
            <div>
              <label className="block text-gray-600 dark:text-gray-400 mb-1">Organizer email (optional)</label>
              <input
                type="email"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2"
                value={organizerEmail}
                onChange={(e) => setOrganizerEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-gray-600 dark:text-gray-400 mb-1">Initial state</label>
              <select
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2"
                value={initialStatus}
                onChange={(e) =>
                  setInitialStatus(e.target.value as 'AWAITING_APPROVAL' | 'DRAFT_INQUIRY')
                }
              >
                <option value="AWAITING_APPROVAL">Awaiting approval</option>
                <option value="DRAFT_INQUIRY">Draft inquiry</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-600 dark:text-gray-400 mb-1">Start</label>
              <input
                required
                type="datetime-local"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-gray-600 dark:text-gray-400 mb-1">End</label>
              <input
                required
                type="datetime-local"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2"
                value={endLocal}
                onChange={(e) => setEndLocal(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={creating || spaces.length === 0}
                className="rounded-lg bg-sky-600 px-4 py-2 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create booking'}
              </button>
              {spaces.length === 0 && (
                <p className="text-xs text-amber-600 mt-2">Create at least one active venue space first.</p>
              )}
            </div>
          </form>
        </section>
      )}

      {!loading && bookings.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Pipeline</h2>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50">
            {bookings.map((b) => (
              <li key={b.id} className="p-4 space-y-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{b.title}</p>
                    <p className="text-xs text-gray-500">
                      {b.venueSpace.name} · {new Date(b.startAt).toLocaleString()} –{' '}
                      {new Date(b.endAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs font-semibold uppercase px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                    {b.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {b.status === 'DRAFT_INQUIRY' && (
                    <button
                      type="button"
                      onClick={() => transition(b.id, 'submit')}
                      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Submit
                    </button>
                  )}
                  {b.status === 'AWAITING_APPROVAL' && (
                    <>
                      <button
                        type="button"
                        onClick={() => transition(b.id, 'approve')}
                        className="text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => transition(b.id, 'reject')}
                        className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {b.status === 'APPROVED' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const cents = window.prompt('Quote amount (cents)?', '50000');
                          if (cents == null) return;
                          transition(b.id, 'quote', parseInt(cents, 10) || 0);
                        }}
                        className="text-xs px-2 py-1 rounded bg-amber-500 text-white hover:bg-amber-600"
                      >
                        Set quote
                      </button>
                      <button
                        type="button"
                        onClick={() => transition(b.id, 'confirm')}
                        className="text-xs px-2 py-1 rounded bg-sky-600 text-white hover:bg-sky-700"
                      >
                        Confirm
                      </button>
                    </>
                  )}
                  {b.status === 'QUOTED' && (
                    <>
                      <button
                        type="button"
                        onClick={() => transition(b.id, 'confirm')}
                        className="text-xs px-2 py-1 rounded bg-sky-600 text-white hover:bg-sky-700"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => transition(b.id, 'mark_paid_partial')}
                        className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600"
                      >
                        Mark paid (partial)
                      </button>
                    </>
                  )}
                  {b.status === 'CONFIRMED' && (
                    <>
                      <button
                        type="button"
                        onClick={() => transition(b.id, 'mark_paid_partial')}
                        className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600"
                      >
                        Mark paid (partial)
                      </button>
                      <button
                        type="button"
                        onClick={() => transition(b.id, 'complete')}
                        className="text-xs px-2 py-1 rounded bg-gray-800 text-white hover:bg-gray-900"
                      >
                        Complete
                      </button>
                    </>
                  )}
                  {b.status === 'PAID_PARTIAL' && (
                    <button
                      type="button"
                      onClick={() => transition(b.id, 'complete')}
                      className="text-xs px-2 py-1 rounded bg-gray-800 text-white hover:bg-gray-900"
                    >
                      Complete
                    </button>
                  )}
                  {!['COMPLETED', 'CANCELLED', 'REJECTED'].includes(b.status) && (
                    <button
                      type="button"
                      onClick={() => transition(b.id, 'cancel')}
                      className="text-xs px-2 py-1 rounded text-gray-500 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && bookings.length === 0 && (
        <p className="text-sm text-gray-500">No bookings yet.</p>
      )}
    </div>
  );
}
