'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import { PageLoading } from '@/components/onboarding/shared';

interface Prefs { email: boolean; sms: boolean; push: boolean; inApp: boolean; whatsapp: boolean; marketing: boolean }

const defaults: Prefs = { email: true, sms: false, push: true, inApp: true, whatsapp: false, marketing: false };

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState<Prefs>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try { setPrefs(await apiGet<Prefs>('/notifications/preferences')); } catch {}
      setLoading(false);
    })();
  }, []);

  const toggle = useCallback(async (key: keyof Prefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(true);
    try { await apiPatch('/notifications/preferences', updated); } catch {}
    setSaving(false);
  }, [prefs]);

  if (loading) return <PageLoading label="Loading preferences..." />;

  const items = [
    { key: 'email' as const, label: 'Email Notifications', desc: 'Onboarding updates, approvals, and reminders via email' },
    { key: 'whatsapp' as const, label: 'WhatsApp Notifications', desc: 'Urgent communications and waiver reminders via WhatsApp' },
    { key: 'push' as const, label: 'Push Notifications', desc: 'Mobile push alerts for iOS and Android devices' },
    { key: 'inApp' as const, label: 'In-App Notifications', desc: 'In-app badges, banners, and alert center' },
    { key: 'sms' as const, label: 'SMS Notifications', desc: 'SMS fallback for critical alerts' },
    { key: 'marketing' as const, label: 'Marketing Communications', desc: 'Promotional campaigns, newsletters, and event announcements' },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Global Notification Preferences</h3>
        {saving && <span className="text-xs text-blue-500 animate-pulse">Saving...</span>}
      </div>
      <div className="space-y-4">
        {items.map((p) => (
          <div key={p.key} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{p.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{p.desc}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={prefs[p.key]} onChange={() => toggle(p.key)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white dark:bg-slate-800 after:rounded-full after:h-5 after:w-5 after:transition-all dark:bg-gray-600" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
