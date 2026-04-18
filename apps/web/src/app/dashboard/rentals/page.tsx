'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import {
  Home,
  CalendarCheck,
  DollarSign,
  BarChart3,
  Clock,
  Plus,
  ArrowRight,
  Loader2,
  Inbox,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface RentalStats {
  totalListings: number;
  activeBookings: number;
  occupancyRate: number;
  totalRevenueCents: number;
  pendingApprovals: number;
}

interface RecentBooking {
  id: string;
  guestName: string;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalPriceCents: number;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  CHECKED_IN: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-700',
  DECLINED: 'bg-red-100 text-red-700',
};

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function RentalsOverviewPage() {
  const router = useRouter();
  const [stats, setStats] = useState<RentalStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [listingsRes, bookingsRes] = await Promise.allSettled([
          apiGet<{ success: boolean; data: any[] }>('/rentals/listings/mine'),
          apiGet<{ success: boolean; data: any[] }>('/rentals/bookings/me?limit=10&sort=createdAt:desc'),
        ]);

        const listings = listingsRes.status === 'fulfilled' && listingsRes.value.data ? listingsRes.value.data : [];
        const bookings = bookingsRes.status === 'fulfilled' && bookingsRes.value.data ? bookingsRes.value.data : [];

        const activeBookings = bookings.filter((b: any) => ['CONFIRMED', 'CHECKED_IN'].includes(b.status));
        const pendingApprovals = bookings.filter((b: any) => b.status === 'PENDING');
        const completedBookings = bookings.filter((b: any) => b.status === 'COMPLETED');
        const totalRevenue = completedBookings.reduce((sum: number, b: any) => sum + (b.totalPriceCents || 0), 0);

        const publishedListings = listings.filter((l: any) => l.status === 'PUBLISHED');
        const occupancy = publishedListings.length > 0
          ? Math.round((activeBookings.length / publishedListings.length) * 100)
          : 0;

        setStats({
          totalListings: listings.length,
          activeBookings: activeBookings.length,
          occupancyRate: Math.min(occupancy, 100),
          totalRevenueCents: totalRevenue,
          pendingApprovals: pendingApprovals.length,
        });

        setRecentBookings(
          bookings.slice(0, 8).map((b: any) => ({
            id: b.id || b.uuid,
            guestName: b.guestName || b.guest?.name || 'Unknown Guest',
            listingTitle: b.listingTitle || b.listing?.title || 'Untitled Listing',
            checkIn: b.checkIn || b.checkInDate || '',
            checkOut: b.checkOut || b.checkOutDate || '',
            status: b.status || 'PENDING',
            totalPriceCents: b.totalPriceCents || 0,
          }))
        );
      } catch (err: any) {
        setError(err.message || 'Failed to load rentals overview');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading rentals overview...</span>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button onClick={() => router.refresh()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Listings', value: stats?.totalListings ?? 0, icon: Home, color: 'text-blue-600 bg-blue-100' },
    { label: 'Active Bookings', value: stats?.activeBookings ?? 0, icon: CalendarCheck, color: 'text-green-600 bg-green-100' },
    { label: 'Occupancy Rate', value: `${stats?.occupancyRate ?? 0}%`, icon: BarChart3, color: 'text-purple-600 bg-purple-100' },
    { label: 'Revenue', value: formatCurrency(stats?.totalRevenueCents ?? 0), icon: DollarSign, color: 'text-emerald-600 bg-emerald-100' },
    { label: 'Pending Approvals', value: stats?.pendingApprovals ?? 0, icon: Clock, color: 'text-yellow-600 bg-yellow-100' },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{typeof card.value === 'number' ? card.value.toLocaleString() : card.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => router.push('/dashboard/rentals/listings/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Listing
        </button>
        <button
          onClick={() => router.push('/dashboard/rentals/bookings')}
          className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-sm font-medium border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <CalendarCheck className="w-4 h-4" /> View Bookings
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Bookings</h2>
          <button
            onClick={() => router.push('/dashboard/rentals/bookings')}
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="px-6 pb-6">
          {recentBookings.length === 0 ? (
            <div className="text-center py-8">
              <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No bookings yet</p>
              <p className="text-xs text-gray-400 mt-1">Bookings will appear here once guests reserve your listings</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{booking.guestName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {booking.listingTitle} &middot; {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {formatCurrency(booking.totalPriceCents)}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${STATUS_COLORS[booking.status] || 'bg-gray-100 text-gray-600'}`}>
                      {formatStatus(booking.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
