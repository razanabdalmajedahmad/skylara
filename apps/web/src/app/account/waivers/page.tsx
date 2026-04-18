'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, getAuthToken } from '@/lib/api';
import {
  Loader2,
  RefreshCw,
  ArrowLeft,
  FileCheck,
  AlertCircle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Inbox,
} from 'lucide-react';

interface Waiver {
  id: string;
  title: string;
  status: 'SIGNED' | 'EXPIRED' | 'PENDING';
  signedAt: string | null;
  expiresAt: string | null;
  signUrl: string | null;
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; bgColor: string; label: string }> = {
  SIGNED: { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30', label: 'Signed' },
  EXPIRED: { icon: XCircle, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30', label: 'Expired' },
  PENDING: { icon: AlertCircle, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30', label: 'Pending' },
};

export default function AccountWaiversPage() {
  const router = useRouter();
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const fetchWaivers = async () => {
      try {
        const res = await apiGet<{ success: boolean; data: Waiver[] }>('/account/waivers');
        setWaivers(res.data || []);
      } catch (err: any) {
        if (err.status === 401) {
          router.replace('/login');
          return;
        }
        setError(err.message || 'Failed to load waivers');
      } finally {
        setLoading(false);
      }
    };
    fetchWaivers();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading waivers...</span>
      </div>
    );
  }

  if (error && waivers.length === 0) {
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

  const needsAttention = waivers.filter((w) => w.status !== 'SIGNED');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/account')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Waivers</h1>
      </div>

      {needsAttention.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-700 dark:text-amber-400 mb-6 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {needsAttention.length} waiver{needsAttention.length !== 1 ? 's' : ''} need{needsAttention.length === 1 ? 's' : ''} your attention
        </div>
      )}

      {waivers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-center py-16">
          <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No waivers found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Required waivers will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {waivers.map((waiver) => {
            const config = STATUS_CONFIG[waiver.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = config.icon;
            return (
              <div
                key={waiver.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg ${config.bgColor}`}>
                      <FileCheck className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{waiver.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 dark:text-gray-500">
                        <span className={`flex items-center gap-1 ${config.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" /> {config.label}
                        </span>
                        {waiver.signedAt && (
                          <span>Signed {new Date(waiver.signedAt).toLocaleDateString()}</span>
                        )}
                        {waiver.expiresAt && (
                          <span>Expires {new Date(waiver.expiresAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {waiver.status !== 'SIGNED' && waiver.signUrl && (
                    <a
                      href={waiver.signUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0"
                    >
                      Sign <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
