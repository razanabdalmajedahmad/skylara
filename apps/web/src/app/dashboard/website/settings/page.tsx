'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import {
  Save,
  Loader2,
  RefreshCw,
  CheckCircle,
  Building2,
  Palette,
  BarChart3,
  Globe,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface WebsiteSettingsData {
  companyName: string;
  tagline: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string;
  faviconUrl: string;
  ga4Id: string;
  gtmId: string;
  metaPixelId: string;
  accountPortalEnabled: boolean;
  publicManifestEnabled: boolean;
  customDomain: string;
}

const DEFAULT_SETTINGS: WebsiteSettingsData = {
  companyName: '',
  tagline: '',
  description: '',
  primaryColor: '#2563eb',
  secondaryColor: '#1e40af',
  accentColor: '#f59e0b',
  logoUrl: '',
  faviconUrl: '',
  ga4Id: '',
  gtmId: '',
  metaPixelId: '',
  accountPortalEnabled: true,
  publicManifestEnabled: false,
  customDomain: '',
};

export default function WebsiteSettingsPage() {
  const [form, setForm] = useState<WebsiteSettingsData>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ success: boolean; data: WebsiteSettingsData }>('/website/settings');
      setForm({ ...DEFAULT_SETTINGS, ...res.data });
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await apiPatch('/website/settings', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateField = (field: keyof WebsiteSettingsData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading website settings...</span>
      </div>
    );
  }

  if (error && !form.companyName) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        <button onClick={fetchSettings} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {saved && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> Settings saved successfully
        </div>
      )}

      {/* General Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">General Information</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="SkyDive Example"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tagline</label>
            <input
              type="text"
              value={form.tagline}
              onChange={(e) => updateField('tagline', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Experience the thrill of freefall"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="A brief description of your dropzone for visitors..."
            />
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Branding</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {(['primaryColor', 'secondaryColor', 'accentColor'] as const).map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 capitalize">
                {field.replace('Color', ' Color')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form[field]}
                  onChange={(e) => updateField(field, e.target.value)}
                  className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={form[field]}
                  onChange={(e) => updateField(field, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Logo URL</label>
            <input
              type="url"
              value={form.logoUrl}
              onChange={(e) => updateField('logoUrl', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Favicon URL</label>
            <input
              type="url"
              value={form.faviconUrl}
              onChange={(e) => updateField('faviconUrl', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      {/* Analytics */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Analytics</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GA4 Measurement ID</label>
            <input
              type="text"
              value={form.ga4Id}
              onChange={(e) => updateField('ga4Id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="G-XXXXXXXXXX"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GTM Container ID</label>
            <input
              type="text"
              value={form.gtmId}
              onChange={(e) => updateField('gtmId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="GTM-XXXXXXX"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meta Pixel ID</label>
            <input
              type="text"
              value={form.metaPixelId}
              onChange={(e) => updateField('metaPixelId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="XXXXXXXXXXXXXXXXX"
            />
          </div>
        </div>
      </div>

      {/* Feature Toggles & Domain */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Domain & Features</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Custom Domain</label>
            <input
              type="text"
              value={form.customDomain}
              onChange={(e) => updateField('customDomain', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="www.yourskydivecenter.com"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Point your DNS CNAME to portal.skylara.com</p>
          </div>
          <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Account Portal</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Allow athletes to log in and manage bookings</p>
            </div>
            <button
              onClick={() => updateField('accountPortalEnabled', !form.accountPortalEnabled)}
              className="text-blue-600 dark:text-blue-400"
            >
              {form.accountPortalEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-gray-400" />}
            </button>
          </div>
          <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Public Manifest</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Show today&apos;s manifest on the public site</p>
            </div>
            <button
              onClick={() => updateField('publicManifestEnabled', !form.publicManifestEnabled)}
              className="text-blue-600 dark:text-blue-400"
            >
              {form.publicManifestEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-gray-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>
      </div>
    </div>
  );
}
