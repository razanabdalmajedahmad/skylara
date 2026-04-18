'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { API_BASE_URL } from '@/lib/constants';
import {
  Loader2,
  Home,
  MapPin,
  DollarSign,
  Inbox,
  Star,
} from 'lucide-react';

interface PublicStay {
  id: string;
  title: string;
  description: string;
  type: string;
  pricePerNight: number;
  currency: string;
  location: string;
  distanceToDz: string;
  rating: number | null;
  imageUrl: string | null;
}

const STAY_TYPE_LABELS: Record<string, string> = {
  ROOM: 'Room',
  CABIN: 'Cabin',
  TENT_SITE: 'Tent Site',
  RV_SPOT: 'RV Spot',
  APARTMENT: 'Apartment',
  HOUSE: 'House',
  BUNKHOUSE: 'Bunkhouse',
};

export default function PublicStaysPage() {
  const [stays, setStays] = useState<PublicStay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStays = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/public/stays`);
        if (!res.ok) throw new Error('Failed to load stays');
        const json = await res.json();
        setStays(json.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load stays');
      } finally {
        setLoading(false);
      }
    };
    fetchStays();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Stays</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Find accommodation near the dropzone</p>

      {stays.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No stays available</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Check back soon for accommodation options</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stays.map((stay) => (
            <div key={stay.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
              {stay.imageUrl ? (
                <div className="h-40 bg-gray-200 dark:bg-gray-700 relative">
                  <Image
                    src={stay.imageUrl}
                    alt={stay.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    unoptimized
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="h-40 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-gray-800 flex items-center justify-center">
                  <Home className="w-10 h-10 text-blue-300 dark:text-blue-700" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {STAY_TYPE_LABELS[stay.type] || stay.type}
                  </span>
                  {stay.rating !== null && (
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {stay.rating.toFixed(1)}
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{stay.title}</h3>
                {stay.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{stay.description}</p>
                )}
                <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {stay.currency}{stay.pricePerNight}
                      </span>
                      <span className="text-xs text-gray-400">/night</span>
                    </div>
                  </div>
                  {stay.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-xs">{stay.location}</span>
                    </div>
                  )}
                  {stay.distanceToDz && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">{stay.distanceToDz} to dropzone</p>
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
