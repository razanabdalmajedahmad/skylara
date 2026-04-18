'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, getAuthToken } from '@/lib/api';
import {
  Loader2,
  RefreshCw,
  Calendar,
  Inbox,
  Clock,
  ArrowLeft,
} from 'lucide-react';

interface Booking {
  id: string;
  type: string;
  status: string;
  date: string;
  time: string;
  jumpType: string;
  notes: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  COMPLETED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  NO_SHOW: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

export default function AccountBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const fetchBookings = async () => {
      try {
        const res = await apiGet<{ success: boolean; data: Booking[] }>('/account/bookings');
        setBookings(res.data || []);
      } catch (err: any) {
        if (err.status === 401) {
          router.replace('/login');
          return;
        }
        setError(err.message || 'Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading bookings...</span>
      </div>
    );
  }

  if (error && bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        <button
          onClick={() => router.refresh()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/account')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Bookings</h1>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400 mb-6">
          {error}
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-center py-16">
          <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No bookings yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Your upcoming and past bookings will appear here</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {bookings.map((booking) => {
              const statusColor = STATUS_COLORS[booking.status] || STATUS_COLORS.PENDING;
              return (
                <div key={booking.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {booking.jumpType || booking.type}
                        </h3>
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${statusColor}`}>
                          {booking.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(booking.date).toLocaleDateString()}
                        </span>
                        {booking.time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {booking.time}
                          </span>
                        )}
                      </div>
                      {booking.notes && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{booking.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
