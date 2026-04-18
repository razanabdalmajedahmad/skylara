'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  ChevronRight,
  CreditCard,
} from 'lucide-react';

interface Booking {
  id: string;
  customerName: string;
  type: 'tandem' | 'aff' | 'fun';
  date: string;
  timeSlot: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  paymentStatus: 'paid' | 'pending' | 'failed';
  notes?: string;
  priceCents?: number;
}

/**
 * Map API booking response to the component's Booking shape.
 * API returns: { id, uuid, status, bookingType, scheduledDate, scheduledTime, user: { name }, package: { name, priceCents }, notes }
 * Component expects: { id, customerName, type, date, timeSlot, status, paymentStatus, notes }
 */
function mapApiBooking(b: any): Booking {
  const statusMap: Record<string, string> = {
    CONFIRMED: 'confirmed',
    PENDING: 'pending',
    CANCELLED: 'cancelled',
    COMPLETED: 'confirmed',
    NO_SHOW: 'cancelled',
    CHECKED_IN: 'confirmed',
  };

  const typeMap: Record<string, string> = {
    TANDEM: 'tandem',
    TANDEM_VIDEO: 'tandem',
    AFF: 'aff',
    FUN: 'fun',
    FUN_PACK: 'fun',
    COACHING: 'fun',
  };

  const scheduledDate = b.scheduledDate
    ? new Date(b.scheduledDate).toISOString().split('T')[0]
    : '';

  return {
    id: String(b.id || b.uuid || ''),
    customerName: b.customerName || b.user?.name || b.user?.email || 'Unknown',
    type: (typeMap[b.bookingType] || 'fun') as Booking['type'],
    date: scheduledDate,
    timeSlot: b.scheduledTime || b.timeSlot || '',
    status: (statusMap[b.status] || b.status?.toLowerCase() || 'pending') as Booking['status'],
    paymentStatus: b.paymentIntentId ? 'paid' : 'pending',
    notes: b.notes || undefined,
    priceCents: b.package?.priceCents,
  };
}

type FilterType = 'all' | 'confirmed' | 'pending' | 'cancelled';
type TypeFilterType = 'all' | 'tandem' | 'aff' | 'fun';

export default function BookingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilterType>('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showNewBooking, setShowNewBooking] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await apiGet<{ success?: boolean; data?: unknown[] }>('/bookings');
        if (res && Array.isArray(res.data)) {
          setBookings(res.data.map(mapApiBooking));
        } else {
          setBookings([]);
        }
      } catch {
        setBookings([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const weekEnd = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const todaysBookings = bookings.filter(
      (b) => b.date === today && b.status !== 'cancelled'
    ).length;

    const thisWeek = bookings.filter(
      (b) => b.date >= today && b.date <= weekEnd && b.status !== 'cancelled'
    ).length;

    const pendingConfirmation = bookings.filter(
      (b) => b.status === 'pending'
    ).length;

    return { todaysBookings, thisWeek, pendingConfirmation };
  }, [bookings]);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    if (statusFilter !== 'all') {
      result = result.filter((b) => b.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter((b) => b.type === typeFilter);
    }

    result.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.timeSlot.localeCompare(b.timeSlot);
    });

    return result;
  }, [bookings, statusFilter, typeFilter]);

  const getStatusBadge = (status: string) => {
    const baseClasses =
      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold';
    switch (status) {
      case 'confirmed':
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            <CheckCircle className="h-3 w-3" />
            Confirmed
          </span>
        );
      case 'pending':
        return (
          <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case 'cancelled':
        return (
          <span className={`${baseClasses} bg-red-100 text-red-800`}>
            <X className="h-3 w-3" />
            Cancelled
          </span>
        );
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{status}</span>;
    }
  };

  const getPaymentBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium';
    switch (status) {
      case 'paid':
        return (
          <span className={`${baseClasses} bg-green-50 text-green-700`}>
            <CreditCard className="h-3 w-3" />
            Paid
          </span>
        );
      case 'pending':
        return (
          <span className={`${baseClasses} bg-yellow-50 text-yellow-700`}>
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case 'failed':
        return (
          <span className={`${baseClasses} bg-red-50 text-red-700`}>
            <AlertCircle className="h-3 w-3" />
            Failed
          </span>
        );
      default:
        return <span className={`${baseClasses} bg-gray-50 text-gray-700`}>{status}</span>;
    }
  };

  const formatPrice = (cents?: number) => {
    if (!cents) return '';
    return ` · $${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 dark:from-transparent to-gray-100 p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Online Bookings</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">Manage upcoming jumps and reservations</p>
          </div>
          <button
            onClick={() => setShowNewBooking(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            New Booking
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg bg-white dark:bg-slate-800 p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today&apos;s Bookings</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.todaysBookings}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white dark:bg-slate-800 p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Week</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.thisWeek}</p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white dark:bg-slate-800 p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Confirmation</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.pendingConfirmation}</p>
            </div>
            <div className="rounded-full bg-yellow-100 p-3">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4 rounded-lg bg-white dark:bg-slate-800 p-4 shadow lg:flex lg:gap-4 lg:space-y-0">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'pending', label: 'Pending' },
              { value: 'cancelled', label: 'Cancelled' },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value as FilterType)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  statusFilter === filter.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'tandem', label: 'Tandem' },
              { value: 'aff', label: 'AFF' },
              { value: 'fun', label: 'Fun Jump' },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setTypeFilter(filter.value as TypeFilterType)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  typeFilter === filter.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {filteredBookings.length > 0 ? (
          filteredBookings.map((booking) => (
            <div key={booking.id} className="rounded-lg bg-white dark:bg-slate-800 p-4 shadow hover:shadow-lg transition-shadow lg:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{booking.customerName}</h3>
                      <p className="mt-1 capitalize text-sm text-gray-600 dark:text-gray-400">
                        {booking.type} Jump{formatPrice(booking.priceCents)}
                      </p>
                    </div>
                    <div className="hidden flex-col gap-2 lg:flex">
                      <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        {booking.date}
                      </div>
                      {booking.timeSlot && (
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          {booking.timeSlot}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 lg:hidden">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {booking.date}{booking.timeSlot ? ` at ${booking.timeSlot}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 lg:items-end">
                  <div className="flex flex-wrap gap-2">
                    {getStatusBadge(booking.status)}
                    {getPaymentBadge(booking.paymentStatus)}
                  </div>
                  <button
                    onClick={() => setSelectedBooking(booking)}
                    className="hidden lg:flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View Details
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {booking.notes && (
                <div className="mt-3 border-t border-gray-200 dark:border-slate-700 dark:border-gray-700 pt-3">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Notes: {booking.notes}</p>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-lg bg-white dark:bg-slate-800 p-8 text-center shadow">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">No bookings found</p>
          </div>
        )}
      </div>
      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedBooking(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Booking Details</h2>
              <button onClick={() => setSelectedBooking(null)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 text-xl">&times;</button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Customer</span>
                <span className="font-semibold text-gray-900 dark:text-white">{selectedBooking.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Type</span>
                <span className="font-semibold text-gray-900 dark:text-white capitalize">{selectedBooking.type} Jump</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Date</span>
                <span className="text-gray-900 dark:text-white">{selectedBooking.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Time</span>
                <span className="text-gray-900 dark:text-white">{selectedBooking.timeSlot}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">Status</span>
                {getStatusBadge(selectedBooking.status)}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">Payment</span>
                {getPaymentBadge(selectedBooking.paymentStatus)}
              </div>
              {selectedBooking.priceCents && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Price</span>
                  <span className="font-semibold text-gray-900 dark:text-white">${(selectedBooking.priceCents / 100).toFixed(2)}</span>
                </div>
              )}
              {selectedBooking.notes && (
                <div className="pt-2 border-t">
                  <span className="text-gray-500 dark:text-gray-400 block mb-1">Notes</span>
                  <p className="text-gray-900 dark:text-white">{selectedBooking.notes}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t flex gap-2">
              <button onClick={() => setSelectedBooking(null)} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* New Booking Modal */}
      {showNewBooking && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNewBooking(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Booking</h2>
              <button onClick={() => setShowNewBooking(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 text-xl">&times;</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const name = (form.elements.namedItem('name') as HTMLInputElement).value;
              const type = (form.elements.namedItem('type') as HTMLSelectElement).value;
              try {
                const today = new Date().toISOString().split('T')[0];
                await apiPost('/bookings', {
                  bookingType: type.toUpperCase(),
                  scheduledDate: today,
                  notes: `Walk-in booking for ${name}`,
                });
              } catch { /* API may not be available */ }
              setShowNewBooking(false);
              // Refresh bookings
              try {
                const res = await apiGet('/bookings');
                if (res?.data && Array.isArray(res.data)) {
                  const mapped = res.data.map(mapApiBooking);
                  if (mapped.length > 0) setBookings(mapped);
                }
              } catch { /* fallback stays */ }
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name</label>
                <input name="name" required className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jump Type</label>
                <select name="type" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-blue-500">
                  <option value="TANDEM">Tandem</option>
                  <option value="AFF">AFF</option>
                  <option value="FUN">Fun Jump</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNewBooking(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">Create Booking</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
