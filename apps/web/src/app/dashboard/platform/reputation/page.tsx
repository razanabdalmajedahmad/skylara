'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPatch } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Inbox,
  Star,
  Shield,
  MessageSquare,
  Eye,
  EyeOff,
  Flag,
} from 'lucide-react';

interface FacilityReputation {
  id: number;
  name: string;
  overallScore: number;
  reviewCount: number;
  trustLevel: string;
}

interface Review {
  id: number;
  facilityName: string;
  userName: string;
  rating: number;
  title: string;
  body: string;
  status: string;
  createdAt: string;
}

const TRUST_COLORS: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  STANDARD: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TRUSTED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  VERIFIED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  ELITE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-green-100 text-green-700',
  HIDDEN: 'bg-gray-100 text-gray-600',
  FLAGGED: 'bg-red-100 text-red-700',
  PENDING: 'bg-amber-100 text-amber-700',
};

function Stars({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />
      ))}
    </div>
  );
}

export default function ReputationPage() {
  const router = useRouter();
  const [facilities, setFacilities] = useState<FacilityReputation[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moderating, setModerating] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [repRes, revRes] = await Promise.allSettled([
        apiGet<{ success: boolean; data: FacilityReputation[] }>('/platform/reputation'),
        apiGet<{ success: boolean; data: Review[] }>('/platform/reviews'),
      ]);
      if (repRes.status === 'fulfilled') setFacilities(repRes.value.data || []);
      if (revRes.status === 'fulfilled') setReviews(revRes.value.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load reputation data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleModerate = async (reviewId: number, status: string) => {
    setModerating(reviewId);
    try {
      await apiPatch(`/platform/reviews/${reviewId}/moderate`, { status });
      setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, status } : r));
    } catch (err: any) {
      setError(err.message || 'Failed to moderate review');
    } finally {
      setModerating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading reputation data...</span>
      </div>
    );
  }

  if (error && !facilities.length && !reviews.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" /> Facility Leaderboard
        </h2>
        {facilities.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No reputation data yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {facilities.sort((a, b) => b.overallScore - a.overallScore).map((f, idx) => (
              <div key={f.id} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                <span className="text-lg font-bold text-gray-400 dark:text-gray-500 w-8 text-center">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{f.name}</h3>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${TRUST_COLORS[f.trustLevel] || TRUST_COLORS.NEW}`}>
                      {f.trustLevel}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Stars rating={f.overallScore} />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{f.overallScore.toFixed(1)}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{f.reviewCount} reviews</span>
                  </div>
                </div>
                {/* Score bar */}
                <div className="w-24 hidden sm:block">
                  <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
                    <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${(f.overallScore / 5) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Reviews */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-600" /> Recent Reviews
        </h2>
        {reviews.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No reviews yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="p-4 rounded-lg border border-gray-100 dark:border-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{r.facilityName}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">by {r.userName}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${STATUS_COLORS[r.status] || STATUS_COLORS.PENDING}`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Stars rating={r.rating} />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{r.title}</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{r.body}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {moderating === r.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    ) : (
                      <>
                        <button onClick={() => handleModerate(r.id, 'PUBLISHED')} title="Publish" className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 rounded text-gray-400 hover:text-green-600">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleModerate(r.id, 'HIDDEN')} title="Hide" className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-600 rounded text-gray-400 hover:text-gray-600">
                          <EyeOff className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleModerate(r.id, 'FLAGGED')} title="Flag" className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-gray-400 hover:text-red-600">
                          <Flag className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
