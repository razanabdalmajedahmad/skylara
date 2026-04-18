'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/constants';
import {
  Loader2,
  Star,
  Award,
  ArrowRight,
  Inbox,
  User,
} from 'lucide-react';

interface Coach {
  id: string;
  name: string;
  avatarUrl: string | null;
  specialties: string[];
  rating: number | null;
  reviewCount: number;
  bio: string | null;
  certifications: string[];
}

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/public/coaches`);
        if (!res.ok) throw new Error('Failed to load coaches');
        const json = await res.json();
        setCoaches(json.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load coaches');
      } finally {
        setLoading(false);
      }
    };
    fetchCoaches();
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
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Coaches</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Train with experienced skydiving coaches</p>

      {coaches.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No coaches available</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Check back soon for our coach directory</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {coaches.map((coach) => (
            <Link
              key={coach.id}
              href={`/coaches/${coach.id}`}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow block"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  {coach.avatarUrl ? (
                    <Image
                      src={coach.avatarUrl}
                      alt={coach.name}
                      width={56}
                      height={56}
                      unoptimized
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-7 h-7 text-blue-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">{coach.name}</h3>
                  {coach.rating !== null && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {coach.rating.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        ({coach.reviewCount} review{coach.reviewCount !== 1 ? 's' : ''})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {coach.bio && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{coach.bio}</p>
              )}

              {coach.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {coach.specialties.slice(0, 4).map((spec) => (
                    <span
                      key={spec}
                      className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    >
                      {spec}
                    </span>
                  ))}
                  {coach.specialties.length > 4 && (
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      +{coach.specialties.length - 4}
                    </span>
                  )}
                </div>
              )}

              {coach.certifications.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-3">
                  <Award className="w-3.5 h-3.5" />
                  <span>{coach.certifications.join(', ')}</span>
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  View profile <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
