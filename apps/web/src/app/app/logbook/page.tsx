'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api';
import { PageEmpty, PageError } from '@repo/ui';
import {
  BookOpen,
  Loader2,
  MapPin,
  ArrowDown,
  Wind,
} from 'lucide-react';

interface LogEntry {
  id: number;
  jumpNumber: number;
  altitude: number | null;
  freefallTime: number | null;
  canopySize: number | null;
  jumpType: string | null;
  disciplines: string[];
  notes: string | null;
  dropzoneName: string;
  createdAt: string;
}

export default function AthleteLogbookPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [totalJumps, setTotalJumps] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogbook = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, statsRes] = await Promise.all([
        apiGet<{ success: boolean; data: unknown[] }>('/logbook?limit=50'),
        apiGet<{ success: boolean; data: { totalJumps: number } }>('/logbook/stats'),
      ]);

      const raw = listRes?.success && Array.isArray(listRes.data) ? listRes.data : [];
      setEntries(
        raw.map((e) => {
          const row = e as Record<string, unknown>;
          const dz = row.dropzone as { name?: string } | null | undefined;
          const disc = row.disciplines;
          return {
            id: Number(row.id),
            jumpNumber: Number(row.jumpNumber) || 0,
            altitude: typeof row.altitude === 'number' ? row.altitude : null,
            freefallTime: typeof row.freefallTime === 'number' ? row.freefallTime : null,
            canopySize: typeof row.canopySize === 'number' ? row.canopySize : null,
            jumpType: row.jumpType ? String(row.jumpType) : null,
            disciplines: Array.isArray(disc) ? (disc as string[]) : [],
            notes: row.notes ? String(row.notes) : null,
            dropzoneName: dz?.name ?? '—',
            createdAt: row.createdAt ? String(row.createdAt) : '',
          };
        })
      );

      if (statsRes?.success && statsRes.data) {
        setTotalJumps(statsRes.data.totalJumps ?? raw.length);
      } else {
        setTotalJumps(raw.length);
      }
    } catch {
      setError('Could not load your logbook.');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogbook();
  }, [fetchLogbook]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 size={32} className="text-secondary-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <PageError title="Logbook unavailable" message={error} onRetry={fetchLogbook} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <BookOpen size={24} className="text-primary-500 dark:text-primary-400" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Logbook</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{totalJumps} total jumps</p>
          </div>
        </div>

        {entries.length === 0 ? (
          <PageEmpty
            title="No logbook entries yet"
            description="Entries appear when you log jumps or complete loads."
            className="bg-white/80 dark:bg-slate-800/80"
          />
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((entry) => (
              <div key={entry.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-sm px-2.5 py-0.5 rounded-md">
                      #{entry.jumpNumber}
                    </span>
                    {entry.jumpType && (
                      <span className="text-gray-500 dark:text-gray-400 text-sm">{entry.jumpType}</span>
                    )}
                  </div>
                  <span className="text-gray-400 dark:text-gray-500 text-xs shrink-0 ml-2">
                    {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                  {entry.altitude != null && (
                    <span className="flex items-center gap-1">
                      <ArrowDown size={12} /> {entry.altitude.toLocaleString()} ft
                    </span>
                  )}
                  {entry.freefallTime != null && (
                    <span className="flex items-center gap-1">
                      <Wind size={12} /> {entry.freefallTime}s freefall
                    </span>
                  )}
                  {entry.canopySize != null && (
                    <span>{entry.canopySize} sq ft</span>
                  )}
                </div>

                <div className="flex items-center gap-1 mt-1.5 text-gray-400 dark:text-gray-500 text-xs">
                  <MapPin size={11} /> {entry.dropzoneName}
                </div>

                {entry.notes && (
                  <div className="text-gray-500 dark:text-gray-400 text-sm mt-2 italic">
                    {entry.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
