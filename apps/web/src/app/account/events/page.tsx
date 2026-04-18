'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiGet, getAuthToken } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Calendar, Loader2, AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function AccountEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try { const res = await apiGet<{ success: boolean; data: any[] }>('/account/events'); if (res?.success) setEvents(res.data || []); else setError('Failed to load'); } catch { setError('Unable to reach server'); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!getAuthToken()) { router.push('/login'); return; }
    void fetchData();
  }, [router, fetchData]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.push('/account')} className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-4"><ArrowLeft size={14} /> Back to Account</button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3"><Calendar className="w-6 h-6 text-purple-600" /> My Events</h1>
        {error ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center"><AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-3" /><p className="text-amber-800">{error}</p><button onClick={fetchData} className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm"><RefreshCw size={14} className="inline mr-1" />Retry</button></div>
        ) : events.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border p-8 text-center"><Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" /><p className="text-gray-600 dark:text-gray-400">No event registrations yet.</p></div>
        ) : (
          <div className="space-y-3">{events.map((e: any) => (
            <div key={e.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <div><p className="font-medium text-gray-900 dark:text-white">{e.eventName || 'Event'}</p><p className="text-sm text-gray-500">{e.registeredAt ? new Date(e.registeredAt).toLocaleDateString() : ''}</p></div>
              <span className={`px-2 py-1 text-xs font-medium rounded ${e.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{e.status || 'REGISTERED'}</span>
            </div>
          ))}</div>
        )}
      </div>
    </div>
  );
}
