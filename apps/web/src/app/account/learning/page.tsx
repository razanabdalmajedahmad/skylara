'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiGet, getAuthToken } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { BookOpen, Award, Loader2, AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function AccountLearningPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try { const res = await apiGet<{ success: boolean; data: any }>('/account/learning'); if (res?.success) setData(res.data); else setError('Failed to load'); } catch { setError('Unable to reach server'); } finally { setLoading(false); }
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3"><BookOpen className="w-6 h-6 text-blue-600" /> My Learning</h1>
        {error ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center"><AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-3" /><p className="text-amber-800">{error}</p><button onClick={fetchData} className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm inline-flex items-center gap-2"><RefreshCw size={14} /> Retry</button></div>
        ) : (
          <>
            <div className="mb-8"><h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Enrolled Courses</h2>
              {(data?.enrollments || []).length === 0 ? <p className="text-gray-500 dark:text-gray-400 text-sm">No courses enrolled yet.</p> : (
                <div className="space-y-3">{(data?.enrollments || []).map((e: any) => (<div key={e.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between"><div><p className="font-medium text-gray-900 dark:text-white">{e.courseName || 'Course'}</p><p className="text-sm text-gray-500">{e.status}</p></div><div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${e.progress || 0}%` }} /></div></div>))}</div>
              )}
            </div>
            <div><h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Award className="w-5 h-5 text-amber-500" /> Certificates</h2>
              {(data?.certificates || []).length === 0 ? <p className="text-gray-500 dark:text-gray-400 text-sm">No certificates earned yet.</p> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{(data?.certificates || []).map((c: any) => (<div key={c.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"><p className="font-medium text-gray-900 dark:text-white">{c.courseName}</p><p className="text-sm text-gray-500">Issued: {new Date(c.issuedAt).toLocaleDateString()}</p></div>))}</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
