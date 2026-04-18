'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import {
  Calendar,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  Home,
  Plus,
  X,
} from 'lucide-react';

interface Listing {
  id: string;
  title: string;
}

interface BlockedDate {
  id: string;
  listingId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

interface BookedDate {
  checkIn: string;
  checkOut: string;
  guestName: string;
  status: string;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDateISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isDateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function RentalsAvailabilityPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListingId, setSelectedListingId] = useState<string>('');
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [bookedDates, setBookedDates] = useState<BookedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockSubmitting, setBlockSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<{ success: boolean; data: any[] }>('/rentals/listings/mine');
        if (res.success && res.data) {
          const mapped = res.data.map((l: any) => ({
            id: l.id || l.uuid,
            title: l.title || 'Untitled',
          }));
          setListings(mapped);
          if (mapped.length > 0) {
            setSelectedListingId(mapped[0].id);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load listings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedListingId) return;
    (async () => {
      try {
        const [blockedRes, bookingsRes] = await Promise.allSettled([
          apiGet<{ success: boolean; data: any[] }>(`/rentals/listings/${selectedListingId}/availability`),
          apiGet<{ success: boolean; data: any[] }>(`/rentals/listings/${selectedListingId}/bookings`),
        ]);

        if (blockedRes.status === 'fulfilled' && blockedRes.value.data) {
          setBlockedDates(
            blockedRes.value.data.map((b: any) => ({
              id: b.id || b.uuid,
              listingId: selectedListingId,
              startDate: b.startDate || b.start,
              endDate: b.endDate || b.end,
              reason: b.reason || '',
            }))
          );
        } else {
          setBlockedDates([]);
        }

        if (bookingsRes.status === 'fulfilled' && bookingsRes.value.data) {
          setBookedDates(
            bookingsRes.value.data
              .filter((b: any) => ['CONFIRMED', 'CHECKED_IN'].includes(b.status))
              .map((b: any) => ({
                checkIn: b.checkIn || b.checkInDate || '',
                checkOut: b.checkOut || b.checkOutDate || '',
                guestName: b.guestName || b.guest?.name || 'Guest',
                status: b.status,
              }))
          );
        } else {
          setBookedDates([]);
        }
      } catch {
        setBlockedDates([]);
        setBookedDates([]);
      }
    })();
  }, [selectedListingId]);

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfWeek(currentYear, currentMonth);
    const days: { day: number; dateStr: string; isBlocked: boolean; isBooked: boolean; bookingInfo?: string }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDateISO(currentYear, currentMonth, d);
      const isBlocked = blockedDates.some((b) => isDateInRange(dateStr, b.startDate, b.endDate));
      const booking = bookedDates.find((b) => isDateInRange(dateStr, b.checkIn, b.checkOut));
      days.push({
        day: d,
        dateStr,
        isBlocked,
        isBooked: !!booking,
        bookingInfo: booking ? booking.guestName : undefined,
      });
    }

    return { days, firstDay };
  }, [currentYear, currentMonth, blockedDates, bookedDates]);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  };

  const handleBlockDates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockStart || !blockEnd || !selectedListingId) return;

    setBlockSubmitting(true);
    try {
      const res = await apiPost<{ success: boolean; data: any }>(
        `/rentals/listings/${selectedListingId}/availability/block`,
        { startDate: blockStart, endDate: blockEnd, reason: blockReason.trim() }
      );
      if (res.success && res.data) {
        setBlockedDates((prev) => [
          ...prev,
          {
            id: res.data.id || res.data.uuid || Date.now().toString(),
            listingId: selectedListingId,
            startDate: blockStart,
            endDate: blockEnd,
            reason: blockReason.trim(),
          },
        ]);
        setBlockStart('');
        setBlockEnd('');
        setBlockReason('');
        setShowBlockForm(false);
      }
    } catch (err: any) {
      // Toast notification would go here
    } finally {
      setBlockSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading availability...</span>
      </div>
    );
  }

  if (error && listings.length === 0) {
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

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Home className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">No listings found</p>
        <p className="text-sm text-gray-400 mt-1">Create a listing first to manage availability</p>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Availability Calendar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage blocked dates and view bookings</p>
        </div>
        <button
          onClick={() => setShowBlockForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Block Dates
        </button>
      </div>

      {/* Listing Selector */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Listing</label>
        <select
          value={selectedListingId}
          onChange={(e) => setSelectedListingId(e.target.value)}
          className="w-full sm:w-80 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          {listings.map((l) => (
            <option key={l.id} value={l.id}>{l.title}</option>
          ))}
        </select>
      </div>

      {/* Calendar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">{d}</div>
          ))}
          {Array.from({ length: calendarDays.firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-14" />
          ))}
          {calendarDays.days.map((day) => {
            const isToday = day.dateStr === today;
            const isPast = day.dateStr < today;
            let bgClass = 'bg-white dark:bg-slate-800 hover:bg-gray-50';
            if (day.isBooked) bgClass = 'bg-blue-50 border-blue-200';
            else if (day.isBlocked) bgClass = 'bg-red-50 border-red-200';
            if (isPast) bgClass += ' opacity-50';

            return (
              <div
                key={day.day}
                className={`h-14 rounded-lg border border-gray-100 p-1 text-center relative ${bgClass} transition-colors`}
                title={day.isBooked ? day.bookingInfo : day.isBlocked ? 'Blocked' : 'Available'}
              >
                <span className={`text-xs font-medium ${isToday ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>
                  {day.day}
                </span>
                {day.isBooked && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                    <Calendar className="w-3 h-3 text-blue-500" />
                  </div>
                )}
                {day.isBlocked && !day.isBooked && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                    <Lock className="w-3 h-3 text-red-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700" /> Available</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-50 border border-blue-200" /> Booked</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-50 border border-red-200" /> Blocked</span>
        </div>
      </div>

      {/* Block Dates Modal */}
      {showBlockForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowBlockForm(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Block Dates</h2>
              <button onClick={() => setShowBlockForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleBlockDates} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                <input
                  type="date"
                  value={blockStart}
                  onChange={(e) => setBlockStart(e.target.value)}
                  min={today}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                <input
                  type="date"
                  value={blockEnd}
                  onChange={(e) => setBlockEnd(e.target.value)}
                  min={blockStart || today}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="e.g., Personal use, Maintenance"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBlockForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={blockSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50"
                >
                  {blockSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Block Dates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
