'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiPost } from '@/lib/api';
import { RouteGuard } from '@/components/RouteGuard';
import { ArrowLeft, Calendar, Plus, Loader2, Check } from 'lucide-react';

export default function PolicyOverridesPage() {
  const [date, setDate] = useState('');
  const [branchId, setBranchId] = useState('1');
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  async function createOverride() {
    if (!date || !key || !value || !reason) return;
    setSaving(true);
    try {
      let parsedValue: any = value;
      if (!isNaN(Number(value))) parsedValue = Number(value);
      else if (value === 'true' || value === 'false') parsedValue = value === 'true';

      await apiPost('/policies/overrides', {
        branchId: parseInt(branchId),
        date,
        values: [{ key, value: parsedValue, reason }],
        reason,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setKey(''); setValue(''); setReason('');
    } catch (err) {
      console.error('Override failed:', err);
    } finally { setSaving(false); }
  }

  return (
    <RouteGuard allowedRoles={['DZ_MANAGER', 'DZ_OWNER', 'PLATFORM_ADMIN']}>
      <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <Link href="/dashboard/settings/policies" className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 no-underline text-sm mb-4 hover:text-gray-700 dark:hover:text-gray-300">
            <ArrowLeft size={16} /> Back to Policy Center
          </Link>

          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            <Calendar size={22} className="inline-block align-middle mr-2" />
            Operational Day Overrides
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Temporary same-day policy changes for weather, events, or special operations. These expire at end of day.
          </p>

          <div className="max-w-lg bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Create Override</h2>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="block w-full px-2.5 py-2 rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Branch ID</label>
                <input value={branchId} onChange={e => setBranchId(e.target.value)} type="number" className="block w-full px-2.5 py-2 rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Policy Key</label>
                <input value={key} onChange={e => setKey(e.target.value)} placeholder="e.g. wind.maxKnots.tandem" className="block w-full px-2.5 py-2 rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white mt-1 placeholder:text-gray-400 dark:placeholder:text-gray-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Override Value</label>
                <input value={value} onChange={e => setValue(e.target.value)} placeholder="e.g. 18" className="block w-full px-2.5 py-2 rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white mt-1 placeholder:text-gray-400 dark:placeholder:text-gray-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Reason (required)</label>
                <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Why this override?" className="block w-full px-2.5 py-2 rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white mt-1 placeholder:text-gray-400 dark:placeholder:text-gray-500" />
              </div>

              <button onClick={createOverride} disabled={saving || !date || !key || !value || !reason} className="px-5 py-2.5 rounded-lg border-none bg-primary-500 dark:bg-primary-400 text-white font-semibold text-sm cursor-pointer flex items-center gap-1.5 hover:bg-primary-600 dark:hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-fit">
                {saving ? <Loader2 size={16} className="animate-spin" /> : success ? <Check size={16} /> : <Plus size={16} />}
                {success ? 'Created!' : 'Create Override'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
