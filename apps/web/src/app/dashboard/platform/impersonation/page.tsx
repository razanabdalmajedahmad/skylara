'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Inbox,
  Search,
  ShieldAlert,
  UserCheck,
  Clock,
  XCircle,
  Eye,
} from 'lucide-react';

interface Session {
  id: string;
  actorName: string;
  actorEmail: string;
  targetName: string;
  targetEmail: string;
  reason: string;
  startedAt: string;
  endedAt: string | null;
  status: 'active' | 'ended';
}

export default function ImpersonationPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Start form
  const [userSearch, setUserSearch] = useState('');
  const [reason, setReason] = useState('');
  const [starting, setStarting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setError(null);
      const res = await apiGet<{ success: boolean; data: Session[] }>('/platform/impersonate/sessions');
      setSessions(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleStart = async () => {
    if (!userSearch.trim() || !reason.trim()) {
      setFormError('User email/name and reason are required');
      return;
    }
    setStarting(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      await apiPost('/platform/impersonate/start', { userQuery: userSearch.trim(), reason: reason.trim() });
      setFormSuccess(`Impersonation started for "${userSearch}"`);
      setUserSearch('');
      setReason('');
      await fetchSessions();
    } catch (err: any) {
      setFormError(err.message || 'Failed to start impersonation');
    } finally {
      setStarting(false);
    }
  };

  const handleEnd = async (sessionId: string) => {
    try {
      await apiPost('/platform/impersonate/end', { sessionId });
      await fetchSessions();
    } catch (err: any) {
      setError(err.message || 'Failed to end session');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading impersonation sessions...</span>
      </div>
    );
  }

  if (error && !sessions.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button onClick={fetchSessions} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
          Retry
        </button>
      </div>
    );
  }

  const activeSessions = sessions.filter((s) => s.status === 'active');
  const endedSessions = sessions.filter((s) => s.status === 'ended');

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Impersonation is Audited</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
            All impersonation sessions are logged with actor identity, target user, reason, and timestamps.
            This data is retained for compliance and cannot be deleted. Use impersonation only for authorized support purposes.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Start Impersonation */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-indigo-600" /> Start Impersonation
        </h2>
        {formError && <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{formError}</div>}
        {formSuccess && <div className="mb-3 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">{formSuccess}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User (email or name)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                placeholder="user@example.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason *</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              placeholder="Support ticket #1234"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleStart}
              disabled={starting}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 w-full justify-center"
            >
              {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              Impersonate
            </button>
          </div>
        </div>
      </div>

      {/* Session History */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Session History</h2>
        </div>
        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No impersonation sessions recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Actor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Target</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Reason</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Started</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Ended</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {[...activeSessions, ...endedSessions].map((s) => (
                  <tr key={s.id} className={s.status === 'active' ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{s.actorName}</p>
                      <p className="text-xs text-gray-400">{s.actorEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{s.targetName}</p>
                      <p className="text-xs text-gray-400">{s.targetEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[200px] truncate">{s.reason}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(s.startedAt).toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {s.endedAt ? new Date(s.endedAt).toLocaleString() : '--'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                        s.status === 'active' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>{s.status.toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3">
                      {s.status === 'active' && (
                        <button onClick={() => handleEnd(s.id)} className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                          <XCircle className="w-3.5 h-3.5" /> End
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
