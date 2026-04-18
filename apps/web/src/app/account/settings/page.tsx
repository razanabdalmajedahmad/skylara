'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPatch, getAuthToken } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Settings, Loader2, AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function AccountSettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', preferredLanguage: 'en' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: any }>('/account/overview');
      if (res?.success && res.data?.user) {
        const u = res.data.user;
        setForm({ firstName: u.firstName || '', lastName: u.lastName || '', phone: u.phone || '', preferredLanguage: u.preferredLanguage || 'en' });
      }
    } catch { setError('Failed to load profile'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!getAuthToken()) { router.push('/login'); return; }
    void fetchProfile();
  }, [router, fetchProfile]);

  const handleSave = async () => {
    setSaving(true); setError(null); setSaved(false);
    try {
      const res = await apiPatch<{ success: boolean }>('/account/settings', form);
      if (res?.success) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
      else setError('Save failed');
    } catch { setError('Unable to save'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.push('/account')} className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-4"><ArrowLeft size={14} /> Back to Account</button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3"><Settings className="w-6 h-6 text-gray-600" /> Account Settings</h1>

        {error && <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        {saved && <div className="mb-4 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2"><CheckCircle2 size={14} /> Settings saved</div>}

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label><input value={form.firstName} onChange={e => setForm(f => ({...f, firstName: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label><input value={form.lastName} onChange={e => setForm(f => ({...f, lastName: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label><input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" placeholder="+1 555 123 4567" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
            <select value={form.preferredLanguage} onChange={e => setForm(f => ({...f, preferredLanguage: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
              <option value="en">English</option><option value="es">Spanish</option><option value="fr">French</option><option value="de">German</option><option value="pt">Portuguese</option><option value="ar">Arabic</option>
            </select>
          </div>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
}
