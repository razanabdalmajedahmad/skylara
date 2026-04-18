'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';
import {
  Clock,
  Users,
  ArrowUpCircle,
  Trash2,
  Loader2,
  UserPlus,
} from 'lucide-react';

interface WaitlistEntry {
  id: number;
  userId: number;
  userName: string;
  slotType: string;
  loadNumber: string | null;
  priority: number;
  createdAt: string;
  claimedAt: string | null;
}

function WaitlistContent() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchWaitlist() {
    try {
      const res = await apiGet('/manifest/waitlist');
      setEntries(res?.data?.entries ?? []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchWaitlist(); }, []);

  async function promote(entryId: number) {
    try {
      await apiPost(`/manifest/waitlist/${entryId}/promote`);
      fetchWaitlist();
    } catch (err) {
      console.error('Promote failed:', err);
    }
  }

  async function remove(entryId: number) {
    try {
      await apiPost(`/manifest/waitlist/${entryId}/remove`);
      fetchWaitlist();
    } catch (err) {
      console.error('Remove failed:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 size={32} className="text-secondary-500 animate-spin" />
      </div>
    );
  }

  const pending = entries.filter((e) => !e.claimedAt);
  const claimed = entries.filter((e) => !!e.claimedAt);

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Waitlist</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            {pending.length} waiting · {claimed.length} promoted today
          </p>
        </div>

        {pending.length === 0 && (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <Users size={48} strokeWidth={1.5} className="mx-auto mb-4" />
            <p className="text-base">Waitlist is empty.</p>
          </div>
        )}

        {/* Pending entries */}
        <div className="flex flex-col gap-2.5">
          {pending.map((entry, idx) => (
            <div
              key={entry.id}
              className="bg-white dark:bg-slate-800 rounded-xl px-4 py-3.5 sm:px-5 border border-gray-200 dark:border-slate-700 flex items-center gap-3.5"
            >
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center font-bold text-sm text-blue-500 dark:text-blue-400">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-gray-900 dark:text-white font-semibold text-sm">{entry.userName}</div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">
                  {entry.slotType} · Joined {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {entry.loadNumber ? ` · Waiting for ${entry.loadNumber}` : ' · Any load'}
                </div>
              </div>
              <button
                onClick={() => promote(entry.id)}
                title="Promote to load"
                className="px-3 py-1.5 rounded-md border border-emerald-500 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 cursor-pointer text-xs font-medium flex items-center gap-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
              >
                <ArrowUpCircle size={14} /> Promote
              </button>
              <button
                onClick={() => remove(entry.id)}
                title="Remove"
                className="px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-400 dark:text-gray-500 cursor-pointer text-xs hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Promoted today */}
        {claimed.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2.5">
              Promoted Today ({claimed.length})
            </h2>
            <div className="flex flex-col gap-1.5">
              {claimed.map((entry) => (
                <div
                  key={entry.id}
                  className="px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center gap-2.5 text-sm text-gray-500 dark:text-gray-400"
                >
                  <UserPlus size={14} className="text-emerald-500 dark:text-emerald-400" />
                  {entry.userName} — {entry.slotType}
                  {entry.loadNumber ? ` → ${entry.loadNumber}` : ''}
                  <span className="ml-auto text-xs">
                    {new Date(entry.claimedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WaitlistPage() {
  return (
    <RouteGuard allowedRoles={ROLE_GROUPS.MANIFEST}>
      <WaitlistContent />
    </RouteGuard>
  );
}
