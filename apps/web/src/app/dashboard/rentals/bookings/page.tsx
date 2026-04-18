'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import {
  CalendarCheck,
  Loader2,
  AlertCircle,
  Inbox,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Home,
  Moon,
  DollarSign,
  RefreshCw,
} from 'lucide-react';

interface Booking {
  id: string;
  guestName: string;
  guestEmail: string;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPriceCents: number;
  status: string;
  createdAt: string;
}

type StatusFilter = 'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  CHECKED_IN: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-700',
  DECLINED: 'bg-red-100 text-red-600',
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  PENDING: Clock,
  CONFIRMED: CheckCircle,
  COMPLETED: CheckCircle,
  CANCELLED: XCircle,
  DECLINED: XCircle,
  CHECKED_IN: CalendarCheck,
};

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function calcNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function RentalsBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ success: boolean; data: any[] }>('/rentals/bookings/me');
      if (res.success && res.data) {
        setBookings(
          res.data.map((b: any) => ({
            id: b.id || b.uuid,
            guestName: b.guestName || b.guest?.name || b.guest?.firstName || 'Unknown Guest',
            guestEmail: b.guestEmail || b.guest?.email || '',
            listingTitle: b.listingTitle || b.listing?.title || 'Untitled',
            checkIn: b.checkIn || b.checkInDate || '',
            checkOut: b.checkOut || b.checkOutDate || '',
            nights: b.nights || calcNights(b.checkIn || b.checkInDate, b.checkOut || b.checkOutDate),
            totalPriceCents: b.totalPriceCents || 0,
            status: b.status || 'PENDING',
            createdAt: b.createdAt || '',
          }))
        );
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  const filtered = useMemo(() => {
    if (statusFilter === 'ALL') return bookings;
    return bookings.filter((b) => b.status === statusFilter);
  }, [bookings, statusFilter]);

  const handleAction = async (id: string, action: 'confirm' | 'decline' | 'cancel') => {
    setActionLoading(id);
    try {
      const statusMap = { confirm: 'CONFIRMED', decline: 'DECLINED', cancel: 'CANCELLED' };
      await apiPatch(`/rentals/bookings/${id}`, { status: statusMap[action] });
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: statusMap[action] } : b))
      );
    } catch (err: any) {
      // Toast notification would go here
    } finally {
      setActionLoading(null);
    }
  };

  const statusTabs: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'ALL', label: 'All', count: bookings.length },
    { value: 'PENDING', label: 'Pending', count: bookings.filter((b) => b.status === 'PENDING').length },
    { value: 'CONFIRMED', label: 'Confirmed', count: bookings.filter((b) => b.status === 'CONFIRMED').length },
    { value: 'COMPLETED', label: 'Completed', count: bookings.filter((b) => b.status === 'COMPLETED').length },
    { value: 'CANCELLED', label: 'Cancelled', count: bookings.filter((b) => ['CANCELLED', 'DECLINED'].includes(b.status)).length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading bookings...</span>
      </div>
    );
  }

  if (error && bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button onClick={fetchBookings} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rental Bookings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage guest reservations for your listings</p>
        </div>
        <button
          onClick={fetchBookings}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              statusFilter === tab.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full ${
                statusFilter === tab.value ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-12 text-center">
          <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No bookings found</p>
          <p className="text-sm text-gray-400 mt-1">
            {statusFilter === 'ALL' ? 'Bookings will appear here when guests make reservations' : `No ${statusFilter.toLowerCase()} bookings`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((booking) => {
            const StatusIcon = STATUS_ICONS[booking.status] || Clock;
            return (
              <div key={booking.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{booking.guestName}</span>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${STATUS_COLORS[booking.status] || 'bg-gray-100 text-gray-600'}`}>
                        <StatusIcon className="w-3 h-3" />
                        {formatStatus(booking.status)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Home className="w-3 h-3" /> {booking.listingTitle}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarCheck className="w-3 h-3" /> {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Moon className="w-3 h-3" /> {booking.nights} night{booking.nights !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                        <DollarSign className="w-3 h-3" /> {formatCurrency(booking.totalPriceCents)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {booking.status === 'PENDING' && (
                      <>
                        <button
                          disabled={actionLoading === booking.id}
                          onClick={() => handleAction(booking.id, 'confirm')}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-3 h-3" /> Confirm
                        </button>
                        <button
                          disabled={actionLoading === booking.id}
                          onClick={() => handleAction(booking.id, 'decline')}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3 h-3" /> Decline
                        </button>
                      </>
                    )}
                    {booking.status === 'CONFIRMED' && (
                      <button
                        disabled={actionLoading === booking.id}
                        onClick={() => handleAction(booking.id, 'cancel')}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3 h-3" /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
