'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Palette, Type, Layout, Eye, Save, RotateCcw, CheckCircle, Image as ImageIcon, Shield } from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { useBranding, BrandProfile, DEFAULT_BRAND } from '@/contexts/BrandingContext';
import { useAuth } from '@/hooks/useAuth';

type Tab = 'identity' | 'colors' | 'text' | 'layout' | 'login' | 'preview' | 'publish';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'identity', label: 'Brand Identity', icon: Image },
  { id: 'colors', label: 'Colors & Theme', icon: Palette },
  { id: 'text', label: 'Text & Labels', icon: Type },
  { id: 'layout', label: 'Dashboard Layout', icon: Layout },
  { id: 'login', label: 'Login Experience', icon: Shield },
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'publish', label: 'Publish & Reset', icon: CheckCircle },
];

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-10 h-10 rounded border cursor-pointer" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-mono" placeholder="#000000" />
      </div>
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm" rows={3} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm" />
      )}
    </div>
  );
}

export default function BrandingPage() {
  const { brand, refreshBranding } = useBranding();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('identity');
  const [form, setForm] = useState<Partial<BrandProfile>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    setForm({ ...brand });
  }, [brand]);

  const updateField = useCallback((key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await apiPut('/branding', form);
      await refreshBranding();
      setSaveMsg('Branding saved successfully');
      setTimeout(() => setSaveMsg(null), 3000);
    } catch {
      setSaveMsg('Failed to save branding');
    } finally {
      setSaving(false);
    }
  }, [form, refreshBranding]);

  const handlePublish = useCallback(async () => {
    try {
      await apiPost('/branding/publish', {});
      await refreshBranding();
      setSaveMsg('Branding published — live for all users');
      setTimeout(() => setSaveMsg(null), 3000);
    } catch {
      setSaveMsg('Failed to publish');
    }
  }, [refreshBranding]);

  const handleReset = useCallback(async () => {
    if (!window.confirm('Reset all branding to defaults? This cannot be undone.')) return;
    try {
      await apiDelete('/branding');
      await refreshBranding();
      setForm({ ...DEFAULT_BRAND });
      setSaveMsg('Branding reset to defaults');
      setTimeout(() => setSaveMsg(null), 3000);
    } catch {
      setSaveMsg('Failed to reset');
    }
  }, [refreshBranding]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Palette className="h-8 w-8 text-purple-600" />
              Enterprise Branding
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Customize your dropzone&apos;s brand identity, colors, and dashboard appearance
            </p>
          </div>
          <div className="flex items-center gap-3">
            {saveMsg && (
              <span className={`text-sm font-medium ${saveMsg.includes('success') || saveMsg.includes('published') ? 'text-emerald-600' : 'text-red-600'}`}>
                {saveMsg}
              </span>
            )}
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 bg-white dark:bg-slate-800 rounded-lg p-2 border border-gray-200 dark:border-slate-700">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          {activeTab === 'identity' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Brand Identity</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TextInput label="Brand Name" value={form.brandName || ''} onChange={(v) => updateField('brandName', v)} placeholder="Your DZ name" />
                <TextInput label="Short Name" value={form.shortName || ''} onChange={(v) => updateField('shortName', v)} placeholder="Abbrev." />
                <TextInput label="Logo URL" value={form.logoUrl || ''} onChange={(v) => updateField('logoUrl', v)} placeholder="https://..." />
                <TextInput label="Logo (Dark Mode)" value={form.logoDarkUrl || ''} onChange={(v) => updateField('logoDarkUrl', v)} placeholder="https://..." />
                <TextInput label="Icon URL (Square)" value={form.iconUrl || ''} onChange={(v) => updateField('iconUrl', v)} placeholder="https://..." />
                <TextInput label="Favicon URL" value={form.faviconUrl || ''} onChange={(v) => updateField('faviconUrl', v)} placeholder="https://..." />
              </div>
              {form.logoUrl && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Logo Preview:</p>
                  <Image
                    src={form.logoUrl}
                    alt="Logo preview"
                    width={240}
                    height={64}
                    unoptimized
                    className="h-16 w-auto max-w-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'colors' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Colors & Theme</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ColorInput label="Primary Color" value={form.primaryColor || '#1A4F8A'} onChange={(v) => updateField('primaryColor', v)} />
                <ColorInput label="Secondary Color" value={form.secondaryColor || '#0EA5E9'} onChange={(v) => updateField('secondaryColor', v)} />
                <ColorInput label="Accent Color" value={form.accentColor || '#F59E0B'} onChange={(v) => updateField('accentColor', v)} />
                <ColorInput label="Success Color" value={form.successColor || '#10B981'} onChange={(v) => updateField('successColor', v)} />
                <ColorInput label="Warning Color" value={form.warningColor || '#F59E0B'} onChange={(v) => updateField('warningColor', v)} />
                <ColorInput label="Danger Color" value={form.dangerColor || '#EF4444'} onChange={(v) => updateField('dangerColor', v)} />
                <ColorInput label="Background" value={form.backgroundColor || '#F0F4F8'} onChange={(v) => updateField('backgroundColor', v)} />
                <ColorInput label="Surface/Card" value={form.surfaceColor || '#FFFFFF'} onChange={(v) => updateField('surfaceColor', v)} />
                <ColorInput label="Navigation" value={form.navColor || '#0B1E38'} onChange={(v) => updateField('navColor', v)} />
              </div>
            </div>
          )}

          {activeTab === 'text' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Text & Labels</h2>
              <TextInput label="Welcome Message" value={form.welcomeMessage || ''} onChange={(v) => updateField('welcomeMessage', v)} placeholder="Welcome to your dropzone!" multiline />
              <TextInput label="Support Email" value={form.supportEmail || ''} onChange={(v) => updateField('supportEmail', v)} placeholder="support@yourdz.com" />
              <TextInput label="Support Phone" value={form.supportPhone || ''} onChange={(v) => updateField('supportPhone', v)} placeholder="+1 555-0100" />
              <TextInput label="Footer Text" value={form.footerText || ''} onChange={(v) => updateField('footerText', v)} placeholder="© 2026 Your DZ. All rights reserved." />
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Menu Label Overrides</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['Dashboard', 'Manifest', 'Check-in', 'Athletes', 'Bookings', 'Gear', 'Weather', 'Reports', 'Pricing'].map((key) => (
                    <TextInput
                      key={key}
                      label={key}
                      value={(form.textOverrides as Record<string, string>)?.[key] || ''}
                      onChange={(v) => {
                        const overrides = { ...(form.textOverrides || {}), [key]: v };
                        updateField('textOverrides', overrides);
                      }}
                      placeholder={key}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard Layout</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Card Style</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['flat', 'soft', 'outlined', 'elevated'].map((style) => (
                      <button key={style} onClick={() => updateField('cardStyle', style)}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          form.cardStyle === style ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                        }`}
                      >
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Border Radius</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['sm', 'md', 'lg', 'xl'].map((r) => (
                      <button key={r} onClick={() => updateField('borderRadius', r)}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          form.borderRadius === r ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                        }`}
                      >
                        {r.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Layout Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['default', 'clean', 'premium', 'compact', 'enterprise'].map((mode) => (
                      <button key={mode} onClick={() => updateField('layoutMode', mode)}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          form.layoutMode === mode ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                        }`}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Font Family</label>
                  <TextInput label="" value={form.fontFamily || ''} onChange={(v) => updateField('fontFamily', v)} placeholder="Inter, system-ui, sans-serif" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'login' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Login Experience</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TextInput label="Login Title" value={form.loginTitle || ''} onChange={(v) => updateField('loginTitle', v)} placeholder="SkyLara" />
                <TextInput label="Login Subtitle" value={form.loginSubtitle || ''} onChange={(v) => updateField('loginSubtitle', v)} placeholder="Skydiving DZ Management" />
                <TextInput label="Header Title" value={form.headerTitle || ''} onChange={(v) => updateField('headerTitle', v)} placeholder="My Dropzone Portal" />
              </div>
              <div className="mt-6 p-6 rounded-xl" style={{ background: `linear-gradient(135deg, ${form.primaryColor || '#1A4F8A'}, ${form.navColor || '#0B1E38'})` }}>
                <div className="max-w-sm mx-auto bg-white dark:bg-slate-800 rounded-lg p-6 shadow-xl">
                  <div className="text-center">
                    {form.logoUrl ? (
                      <Image
                        src={form.logoUrl}
                        alt="Logo"
                        width={160}
                        height={48}
                        unoptimized
                        className="h-12 w-auto mx-auto mb-3 object-contain"
                      />
                    ) : (
                      <div className="text-2xl font-bold mb-1" style={{ color: form.primaryColor }}>{form.loginTitle || 'SkyLara'}</div>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400">{form.loginSubtitle || 'Skydiving DZ Management'}</p>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="h-10 bg-gray-100 rounded border" />
                    <div className="h-10 bg-gray-100 rounded border" />
                    <div className="h-10 rounded font-bold text-white text-sm flex items-center justify-center" style={{ backgroundColor: form.primaryColor }}>Log In</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Live Preview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sidebar preview */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Sidebar</h3>
                  <div className="w-64 rounded-lg overflow-hidden" style={{ backgroundColor: form.navColor }}>
                    <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                      <div className="text-white font-bold">{form.brandName || 'SkyLara'}</div>
                      <div className="text-xs text-blue-200 mt-1">{form.shortName || 'DZ Portal'}</div>
                    </div>
                    {['Dashboard', 'Manifest', 'Check-in', 'Gear'].map((item, i) => (
                      <div key={item} className="px-4 py-2.5 text-sm text-blue-100" style={i === 0 ? { backgroundColor: form.secondaryColor, color: 'white' } : {}}>
                        {(form.textOverrides as Record<string, string>)?.[item] || item}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card preview */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Cards & Buttons</h3>
                  <div className="space-y-3" style={{ backgroundColor: form.backgroundColor, padding: '1rem', borderRadius: '0.75rem' }}>
                    <div className="p-4 rounded-lg" style={{
                      backgroundColor: form.surfaceColor,
                      border: form.cardStyle === 'outlined' ? '1px solid #e2e8f0' : 'none',
                      boxShadow: form.cardStyle === 'elevated' ? '0 4px 12px rgba(0,0,0,0.1)' : form.cardStyle === 'soft' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    }}>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">Active Loads</div>
                      <div className="text-2xl font-bold mt-1" style={{ color: form.primaryColor }}>6</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: form.primaryColor }}>Primary</button>
                      <button className="px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: form.successColor }}>Success</button>
                      <button className="px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: form.dangerColor }}>Danger</button>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-2 py-1 rounded text-xs font-bold text-white" style={{ backgroundColor: form.successColor }}>PASS</span>
                      <span className="px-2 py-1 rounded text-xs font-bold text-white" style={{ backgroundColor: form.warningColor }}>WARNING</span>
                      <span className="px-2 py-1 rounded text-xs font-bold text-white" style={{ backgroundColor: form.dangerColor }}>FAIL</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'publish' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Publish & Reset</h2>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <h3 className="font-semibold text-emerald-800">Publish Branding</h3>
                <p className="text-sm text-emerald-700 mt-1">Make your current branding settings live for all portal users.</p>
                <button onClick={handlePublish} className="mt-3 flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors">
                  <CheckCircle className="h-4 w-4" /> Publish Now
                </button>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-800">Reset to Defaults</h3>
                <p className="text-sm text-red-700 mt-1">Remove all custom branding and revert to SkyLara default theme. This cannot be undone.</p>
                <button onClick={handleReset} className="mt-3 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors">
                  <RotateCcw className="h-4 w-4" /> Reset Branding
                </button>
              </div>
              <div className="bg-gray-50 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800">Current Status</h3>
                <div className="mt-2 text-sm space-y-1">
                  <p>Published: <span className={brand.isPublished ? 'text-emerald-600 font-bold' : 'text-gray-500'}>{brand.isPublished ? 'Yes' : 'Not published'}</span></p>
                  <p>Using defaults: <span className="font-medium">{brand.isDefault ? 'Yes' : 'No — custom branding active'}</span></p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
