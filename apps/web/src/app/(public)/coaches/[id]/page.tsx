'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/constants';
import {
  Loader2,
  Star,
  Award,
  ArrowLeft,
  Calendar,
  User,
  MessageSquare,
} from 'lucide-react';

interface CoachDetail {
  id: string;
  name: string;
  avatarUrl: string | null;
  specialties: string[];
  rating: number | null;
  reviewCount: number;
  bio: string | null;
  certifications: string[];
  totalJumps: number | null;
  yearsExperience: number | null;
  reviews: { id: string; author: string; rating: number; comment: string; date: string }[];
}

export default function CoachProfilePage() {
  const params = useParams();
  const coachId = params.id as string;
  const [coach, setCoach] = useState<CoachDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCoach = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/public/coaches/${coachId}`);
        if (!res.ok) throw new Error('Coach not found');
        const json = await res.json();
        setCoach(json.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load coach profile');
      } finally {
        setLoading(false);
      }
    };
    fetchCoach();
  }, [coachId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !coach) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <p className="text-red-600 dark:text-red-400 text-sm">{error || 'Coach not found'}</p>
        <Link href="/coaches" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to coaches
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/coaches" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to coaches
      </Link>

      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            {coach.avatarUrl ? (
              <Image
                src={coach.avatarUrl}
                alt={coach.name}
                width={96}
                height={96}
                unoptimized
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <User className="w-12 h-12 text-blue-600" />
            )}
          </div>
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{coach.name}</h1>
            {coach.rating !== null && (
              <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{coach.rating.toFixed(1)}</span>
                <span className="text-sm text-gray-400 dark:text-gray-500">({coach.reviewCount} reviews)</span>
              </div>
            )}
            <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
              {coach.totalJumps !== null && <span>{coach.totalJumps.toLocaleString()} jumps</span>}
              {coach.yearsExperience !== null && <span>{coach.yearsExperience} years experience</span>}
            </div>
            {coach.specialties.length > 0 && (
              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-3">
                {coach.specialties.map((spec) => (
                  <span key={spec} className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {spec}
                  </span>
                ))}
              </div>
            )}
          </div>
          <Link
            href="/account/bookings"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0"
          >
            <Calendar className="w-4 h-4" /> Book Session
          </Link>
        </div>
      </div>

      {/* Bio & Certifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">About</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {coach.bio || 'No bio available yet.'}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600" /> Certifications
          </h2>
          {coach.certifications.length > 0 ? (
            <ul className="space-y-2">
              {coach.certifications.map((cert) => (
                <li key={cert} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                  {cert}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">No certifications listed</p>
          )}
        </div>
      </div>

      {/* Reviews */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600" /> Reviews
        </h2>
        {!coach.reviews || coach.reviews.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No reviews yet</p>
        ) : (
          <div className="space-y-4">
            {coach.reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-4 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{review.author}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(review.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-0.5 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-gray-600'}`}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">{review.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
