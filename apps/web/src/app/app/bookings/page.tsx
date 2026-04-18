'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import {
  Calendar,
  Loader2,
} from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  CONFIRMED: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  COMPLETED: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400',
  CANCELLED: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  NO_SHOW: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

interface BookingItem {
  id: number;
  uuid: string;
  bookingType: string;
  scheduledDate: string;
  scheduledTime: string | null;
  status: string;
  dropzoneName: string;
}

export default function AthleteBookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBookings() {
      try {
        const res = await apiGet('/booking/my-bookings');
        setBookings(res?.data?.bookings ?? []);
      } catch {
        setBookings([]);
      } finally {
        setLoading(false);
      }
    }
    fetchBookings();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 size={32} className="text-secondary-500 animate-spin" />
      </div>
    );
  }

  const upcoming = bookings.filter((b) => ['PENDING', 'CONFIRMED'].includes(b.status));
  const past = bookings.filter((b) => !['PENDING', 'CONFIRMED'].includes(b.status));

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <Calendar size={24} className="text-primary-500 dark:text-primary-400" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">My Bookings</h1>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <Calendar size={48} strokeWidth={1.5} className="mx-auto mb-4" />
            <p className="text-base">No bookings yet.</p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xs font-semibold text-primary-500 dark:text-primary-400 uppercase tracking-wide mb-3">
                  Upcoming
                </h2>
                <div className="flex flex-col gap-2">
                  {upcoming.map((b) => (
                    <div key={b.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <span className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">{b.bookingType}</span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${STATUS_STYLES[b.status] ?? STATUS_STYLES.PENDING}`}>
                          {b.status}
                        </span>
                      </div>
                      <div className="text-gray-500 dark:text-gray-400 text-sm">
                        {new Date(b.scheduledDate).toLocaleDateString()}
                        {b.scheduledTime ? ` at ${b.scheduledTime}` : ''}
                        {b.dropzoneName ? ` · ${b.dropzoneName}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Past
                </h2>
                <div className="flex flex-col gap-1.5">
                  {past.map((b) => (
                    <div key={b.id} className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700 flex items-center gap-3">
                      <div className="flex-1 text-sm text-gray-500 dark:text-gray-400">
                        {b.bookingType} · {new Date(b.scheduledDate).toLocaleDateString()}
                      </div>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${STATUS_STYLES[b.status] ?? STATUS_STYLES.COMPLETED}`}>
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
