'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { apiGet, getAuthToken } from '@/lib/api';
import {
  Loader2,
  RefreshCw,
  Calendar,
  Wallet,
  FileCheck,
  BookOpen,
  ArrowRight,
  User,
  AlertCircle,
} from 'lucide-react';

interface AccountOverview {
  user: { name: string; email: string; avatarUrl: string | null };
  upcomingBookings: number;
  walletBalance: number;
  walletCurrency: string;
  waiverStatus: 'SIGNED' | 'EXPIRED' | 'NONE';
  waiverExpiresAt: string | null;
  learningProgress: { completed: number; total: number };
}

export default function AccountPage() {
  const router = useRouter();
  const [data, setData] = useState<AccountOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const fetchOverview = async () => {
      try {
        const res = await apiGet<{ success: boolean; data: AccountOverview }>('/account/overview');
        setData(res.data);
      } catch (err: any) {
        if (err.status === 401) {
          router.replace('/login');
          return;
        }
        setError(err.message || 'Failed to load account');
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading your account...</span>
      </div>
    );
  }

  if (error && !data) {
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

  const waiverStatusConfig = {
    SIGNED: { label: 'Signed', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
    EXPIRED: { label: 'Expired', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
    NONE: { label: 'Not signed', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  };

  const waiver = waiverStatusConfig[data?.waiverStatus || 'NONE'];
  const learningPct = data?.learningProgress?.total
    ? Math.round((data.learningProgress.completed / data.learningProgress.total) * 100)
    : 0;

  const cards = [
    {
      label: 'Upcoming Bookings',
      value: data?.upcomingBookings ?? 0,
      icon: Calendar,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
      href: '/account/bookings',
    },
    {
      label: 'Wallet Balance',
      value: `${data?.walletCurrency || '$'}${(data?.walletBalance ?? 0).toFixed(2)}`,
      icon: Wallet,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
      href: null,
    },
    {
      label: 'Waiver Status',
      value: waiver.label,
      icon: FileCheck,
      color: `${waiver.color} ${waiver.bg}`,
      href: null,
    },
    {
      label: 'Learning Progress',
      value: `${learningPct}%`,
      icon: BookOpen,
      color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30',
      href: null,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            {data?.user.avatarUrl ? (
              <Image
                src={data.user.avatarUrl}
                alt=""
                width={56}
                height={56}
                unoptimized
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <User className="w-7 h-7 text-blue-600" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{data?.user.name || 'Athlete'}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{data?.user.email}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400 mb-6 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Waiver warning */}
      {data?.waiverStatus !== 'SIGNED' && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-700 dark:text-amber-400 mb-6 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {data?.waiverStatus === 'EXPIRED'
            ? 'Your waiver has expired. Please sign a new waiver before your next jump.'
            : 'You have not signed a waiver yet. Please sign one before booking.'}
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const content = (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              {card.href && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    View details <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              )}
            </div>
          );

          return card.href ? (
            <button key={card.label} onClick={() => router.push(card.href!)} className="text-left">
              {content}
            </button>
          ) : (
            <div key={card.label}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
