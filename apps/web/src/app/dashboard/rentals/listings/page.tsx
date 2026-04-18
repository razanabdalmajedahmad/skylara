'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { apiGet, apiPatch } from '@/lib/api';
import {
  Home,
  Plus,
  Loader2,
  AlertCircle,
  Inbox,
  MapPin,
  Star,
  Users,
  DollarSign,
  Edit,
  Play,
  Pause,
  Eye,
} from 'lucide-react';

interface Listing {
  id: string;
  title: string;
  listingType: string;
  status: string;
  address: string;
  city: string;
  pricePerNightCents: number;
  maxGuests: number;
  averageRating: number | null;
  reviewCount: number;
  photoUrl: string | null;
}

type StatusFilter = 'ALL' | 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  PUBLISHED: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  ARCHIVED: 'bg-red-100 text-red-600',
};

const TYPE_COLORS: Record<string, string> = {
  HOUSE: 'bg-blue-100 text-blue-700',
  APARTMENT: 'bg-indigo-100 text-indigo-700',
  ROOM: 'bg-purple-100 text-purple-700',
  CAMPSITE: 'bg-emerald-100 text-emerald-700',
  BUNKHOUSE: 'bg-orange-100 text-orange-700',
  RV_SPOT: 'bg-teal-100 text-teal-700',
};

function formatType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export default function RentalsListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ success: boolean; data: any[] }>('/rentals/listings/mine');
      if (res.success && res.data) {
        setListings(
          res.data.map((l: any) => ({
            id: l.id || l.uuid,
            title: l.title || 'Untitled',
            listingType: l.listingType || l.type || 'HOUSE',
            status: l.status || 'DRAFT',
            address: l.address || '',
            city: l.city || '',
            pricePerNightCents: l.pricePerNightCents || 0,
            maxGuests: l.maxGuests || 0,
            averageRating: l.averageRating ?? null,
            reviewCount: l.reviewCount || 0,
            photoUrl: l.photos?.[0]?.url || l.photoUrl || null,
          }))
        );
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchListings(); }, []);

  const filtered = useMemo(() => {
    if (statusFilter === 'ALL') return listings;
    return listings.filter((l) => l.status === statusFilter);
  }, [listings, statusFilter]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setActionLoading(id);
    try {
      await apiPatch(`/rentals/listings/${id}`, { status: newStatus });
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
      );
    } catch (err: any) {
      // Toast notification would go here
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading listings...</span>
      </div>
    );
  }

  if (error && listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button onClick={fetchListings} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          Retry
        </button>
      </div>
    );
  }

  const statusTabs: { value: StatusFilter; label: string }[] = [
    { value: 'ALL', label: 'All' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PUBLISHED', label: 'Published' },
    { value: 'PAUSED', label: 'Paused' },
    { value: 'ARCHIVED', label: 'Archived' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Listings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{listings.length} total listings</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/rentals/listings/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Listing
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
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-12 text-center">
          <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No listings found</p>
          <p className="text-sm text-gray-400 mt-1">
            {statusFilter === 'ALL' ? 'Create your first listing to get started' : `No ${statusFilter.toLowerCase()} listings`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((listing) => (
            <div key={listing.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-40 bg-gray-100 relative">
                {listing.photoUrl ? (
                  <Image
                    src={listing.photoUrl}
                    alt={listing.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Home className="w-10 h-10 text-gray-300" />
                  </div>
                )}
                <div className="absolute top-2 left-2 flex gap-1.5">
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${STATUS_COLORS[listing.status] || 'bg-gray-100 text-gray-600'}`}>
                    {listing.status}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${TYPE_COLORS[listing.listingType] || 'bg-gray-100 text-gray-600'}`}>
                    {formatType(listing.listingType)}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{listing.title}</h3>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{listing.city || listing.address || 'No location'}</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {formatCurrency(listing.pricePerNightCents)}/night
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {listing.maxGuests}
                    </span>
                  </div>
                  {listing.averageRating !== null && (
                    <span className="flex items-center gap-0.5 text-xs text-yellow-600 font-medium">
                      <Star className="w-3 h-3 fill-yellow-400" />
                      {listing.averageRating.toFixed(1)}
                      <span className="text-gray-400 font-normal">({listing.reviewCount})</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => router.push(`/dashboard/rentals/listings/${listing.id}`)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Edit className="w-3 h-3" /> Edit
                  </button>
                  {listing.status === 'DRAFT' && (
                    <button
                      disabled={actionLoading === listing.id}
                      onClick={() => handleStatusChange(listing.id, 'PUBLISHED')}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                      <Play className="w-3 h-3" /> Publish
                    </button>
                  )}
                  {listing.status === 'PUBLISHED' && (
                    <button
                      disabled={actionLoading === listing.id}
                      onClick={() => handleStatusChange(listing.id, 'PAUSED')}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors disabled:opacity-50"
                    >
                      <Pause className="w-3 h-3" /> Pause
                    </button>
                  )}
                  {listing.status === 'PAUSED' && (
                    <button
                      disabled={actionLoading === listing.id}
                      onClick={() => handleStatusChange(listing.id, 'PUBLISHED')}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                      <Eye className="w-3 h-3" /> Resume
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
