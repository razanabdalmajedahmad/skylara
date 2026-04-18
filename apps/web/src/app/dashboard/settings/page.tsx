'use client';

import { useState, useEffect } from 'react';
import {
  Save,
  AlertCircle,
  Building2,
  Clock,
  Shield,
  CreditCard,
  Phone,
  Mail,
  Key,
  CheckCircle,
  Loader2,
  Link as LinkIcon,
  Globe,
  Wifi,
  Bell,
  Lock,
  Download,
  LogOut,
} from 'lucide-react';
import { apiGet, apiPut, apiPost } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/components/Toast';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';

interface DZSettings {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  timezone: string;
  maxAltitude: number;
  minBreakTime: number;
  maxLoadsPerDay: number;
  operatingHoursStart: string;
  operatingHoursEnd: string;
  maxWindSpeed: number;
  minVisibility: number;
  requiredCerts: string[];
  // Integration keys
  stripePublishableKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripeConnectClientId: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  twilioWhatsappNumber: string;
  sendgridApiKey: string;
  sendgridFromEmail: string;
  weatherApiKey: string;
  uspaApiKey: string;
  // AWS S3
  awsRegion: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  s3BucketName: string;
  // OAuth
  googleClientId: string;
  googleClientSecret: string;
  appleClientId: string;
  // Maps
  mapboxApiToken: string;
  googleMapsApiKey: string;
  // Push notifications
  expoAccessToken: string;
  vapidPublicKey: string;
  vapidPrivateKey: string;
  // Monitoring
  sentryDsn: string;
  // External links
  externalWebsiteUrl: string;
  externalBookingUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  // Language & locale
  language: string;
  dateFormat: string;
  weightUnit: string;
  altitudeUnit: string;
  currency: string;
  // Notification preferences
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  loadAlerts: boolean;
  weatherAlerts: boolean;
  waiverReminders: boolean;
  paymentConfirmations: boolean;
}

const DEFAULT_SETTINGS: DZSettings = {
  name: 'SkyDive Central',
  address: '1234 Runway Road',
  city: 'Boulder',
  state: 'Colorado',
  zipCode: '80301',
  phone: '(303) 555-0123',
  email: 'info@skydivecentral.com',
  timezone: 'America/Denver',
  maxAltitude: 15000,
  minBreakTime: 30,
  maxLoadsPerDay: 12,
  operatingHoursStart: '08:00',
  operatingHoursEnd: '18:00',
  maxWindSpeed: 15,
  minVisibility: 5,
  requiredCerts: ['USPA-A', 'Student'],
  stripePublishableKey: '',
  stripeSecretKey: '',
  stripeWebhookSecret: '',
  stripeConnectClientId: '',
  twilioAccountSid: '',
  twilioAuthToken: '',
  twilioPhoneNumber: '',
  twilioWhatsappNumber: '',
  sendgridApiKey: '',
  sendgridFromEmail: '',
  weatherApiKey: '',
  uspaApiKey: '',
  awsRegion: 'us-east-1',
  awsAccessKeyId: '',
  awsSecretAccessKey: '',
  s3BucketName: '',
  googleClientId: '',
  googleClientSecret: '',
  appleClientId: '',
  mapboxApiToken: '',
  googleMapsApiKey: '',
  expoAccessToken: '',
  vapidPublicKey: '',
  vapidPrivateKey: '',
  sentryDsn: '',
  externalWebsiteUrl: '',
  externalBookingUrl: '',
  facebookUrl: '',
  instagramUrl: '',
  youtubeUrl: '',
  language: 'en',
  dateFormat: 'MM/DD/YYYY',
  weightUnit: 'kg',
  altitudeUnit: 'ft',
  currency: 'USD',
  emailNotifications: true,
  smsNotifications: true,
  pushNotifications: true,
  loadAlerts: true,
  weatherAlerts: true,
  waiverReminders: true,
  paymentConfirmations: true,
};

type SettingSection = 'general' | 'operations' | 'safety' | 'integrations' | 'language' | 'notifications' | 'security';

const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors';

export default function SettingsPage() {
  const [settings, setSettings] = useState<DZSettings>(DEFAULT_SETTINGS);
  const [editingSection, setEditingSection] = useState<SettingSection | null>(null);
  const [savedMessage, setSavedMessage] = useState<SettingSection | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const { updateLocale } = useLocale();
  const { info, success, error: showError } = useToast();

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await apiGet('/admin/settings');
        if (res?.data) {
          setSettings((prev) => ({ ...prev, ...res.data }));
        }
      } catch {
        // Use defaults
      }
    }
    fetchData();
  }, []);

  const handleSave = async (section: SettingSection) => {
    setIsSaving(true);
    try {
      await apiPut('/admin/settings', settings);
      setSavedMessage(section);
      setEditingSection(null);
      setTimeout(() => setSavedMessage(null), 3000);
      // Push locale changes to context so the whole app picks them up immediately
      if (section === 'language') {
        updateLocale({
          language: (settings as any).language,
          currency: (settings as any).currency,
          dateFormat: (settings as any).dateFormat,
          weightUnit: (settings as any).weightUnit,
          altitudeUnit: (settings as any).altitudeUnit,
        });
      }
    } catch {
      setSavedMessage(null);
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: keyof DZSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const SaveButton = ({ section }: { section: SettingSection }) => (
    <button
      onClick={() => handleSave(section)}
      disabled={isSaving}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
    >
      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
      Save Changes
    </button>
  );

  const SavedBanner = ({ section }: { section: SettingSection }) =>
    savedMessage === section ? (
      <div className="mt-4 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-400 text-sm font-medium flex items-center gap-2">
        <CheckCircle size={16} />
        Changes saved successfully
      </div>
    ) : null;

  const EditToggle = ({ section }: { section: SettingSection }) => (
    <button
      onClick={() => setEditingSection(editingSection === section ? null : section)}
      className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
    >
      {editingSection === section ? 'Cancel' : 'Edit'}
    </button>
  );

  const ViewText = ({ value }: { value: string | number }) => (
    <p className="text-gray-900 dark:text-white dark:text-gray-100 text-sm">{value}</p>
  );

  return (
    <RouteGuard allowedRoles={ROLE_GROUPS.STAFF_MGMT}>
    <div className="p-4 lg:p-6 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dropzone Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Configure your dropzone operations and integrations</p>
        </div>

        {/* Quick Navigation Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {[
            { id: 'general', label: 'General', icon: '🏢' },
            { id: 'operations', label: 'Operations', icon: '⚙️' },
            { id: 'safety', label: 'Safety', icon: '🛡️' },
            { id: 'language', label: 'Language & Locale', icon: '🌐' },
            { id: 'integrations', label: 'Integrations', icon: '🔗' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                const el = document.getElementById(`section-${tab.id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 transition-colors shadow-sm"
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── General Information ── */}
        <div id="section-general" className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">General Information</h2>
            </div>
            <EditToggle section="general" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {([
              ['DZ Name', 'name'],
              ['Timezone', 'timezone'],
              ['Address', 'address'],
              ['City', 'city'],
              ['State', 'state'],
              ['Zip Code', 'zipCode'],
              ['Phone', 'phone'],
              ['Email', 'email'],
            ] as const).map(([label, key]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
                {editingSection === 'general' ? (
                  key === 'timezone' ? (
                    <select value={settings[key]} onChange={(e) => updateSetting(key, e.target.value)} className={inputCls}>
                      {['America/Denver', 'America/Los_Angeles', 'America/Chicago', 'America/New_York', 'Europe/London', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Tokyo'].map((tz) => (
                        <option key={tz}>{tz}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'}
                      value={settings[key]}
                      onChange={(e) => updateSetting(key, e.target.value)}
                      className={inputCls}
                    />
                  )
                ) : (
                  <ViewText value={settings[key]} />
                )}
              </div>
            ))}
          </div>

          {editingSection === 'general' && <SaveButton section="general" />}
          <SavedBanner section="general" />
        </div>

        {/* ── Operations ── */}
        <div id="section-operations" className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-amber-600 dark:text-amber-400" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Operations</h2>
            </div>
            <EditToggle section="operations" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {([
              ['Max Altitude (ft)', 'maxAltitude', 'number'],
              ['Min Break Time (min)', 'minBreakTime', 'number'],
              ['Max Loads per Day', 'maxLoadsPerDay', 'number'],
            ] as const).map(([label, key, type]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
                {editingSection === 'operations' ? (
                  <input type={type} value={settings[key]} onChange={(e) => updateSetting(key, Number(e.target.value))} className={inputCls} />
                ) : (
                  <ViewText value={typeof settings[key] === 'number' ? settings[key].toLocaleString() : settings[key]} />
                )}
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Operating Hours</label>
              {editingSection === 'operations' ? (
                <div className="flex gap-2 items-center">
                  <input type="time" value={settings.operatingHoursStart} onChange={(e) => updateSetting('operatingHoursStart', e.target.value)} className={inputCls} />
                  <span className="text-gray-500 dark:text-gray-400 text-sm">to</span>
                  <input type="time" value={settings.operatingHoursEnd} onChange={(e) => updateSetting('operatingHoursEnd', e.target.value)} className={inputCls} />
                </div>
              ) : (
                <ViewText value={`${settings.operatingHoursStart} - ${settings.operatingHoursEnd}`} />
              )}
            </div>
          </div>

          {editingSection === 'operations' && <SaveButton section="operations" />}
          <SavedBanner section="operations" />
        </div>

        {/* ── Safety Settings ── */}
        <div id="section-safety" className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Shield size={20} className="text-red-600 dark:text-red-400" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Safety Settings</h2>
            </div>
            <EditToggle section="safety" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Max Wind Speed (knots)</label>
              {editingSection === 'safety' ? (
                <input type="number" value={settings.maxWindSpeed} onChange={(e) => updateSetting('maxWindSpeed', Number(e.target.value))} className={inputCls} />
              ) : (
                <ViewText value={settings.maxWindSpeed} />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Min Visibility (miles)</label>
              {editingSection === 'safety' ? (
                <input type="number" step="0.5" value={settings.minVisibility} onChange={(e) => updateSetting('minVisibility', Number(e.target.value))} className={inputCls} />
              ) : (
                <ViewText value={settings.minVisibility} />
              )}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Required Certifications</label>
            {editingSection === 'safety' ? (
              <div className="flex flex-wrap gap-3">
                {['USPA-A', 'USPA-B', 'USPA-C', 'USPA-D', 'Student', 'Tandem'].map((cert) => (
                  <label key={cert} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={settings.requiredCerts.includes(cert)}
                      onChange={(e) => {
                        if (e.target.checked) updateSetting('requiredCerts', [...settings.requiredCerts, cert]);
                        else updateSetting('requiredCerts', settings.requiredCerts.filter((c) => c !== cert));
                      }}
                      className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    {cert}
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {settings.requiredCerts.map((cert) => (
                  <span key={cert} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    {cert}
                  </span>
                ))}
              </div>
            )}
          </div>

          {editingSection === 'safety' && <SaveButton section="safety" />}
          <SavedBanner section="safety" />
        </div>

        {/* ── Integrations & API Keys ── */}
        <div id="section-integrations" className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <LinkIcon size={20} className="text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Integrations & API Keys</h2>
            </div>
            <EditToggle section="integrations" />
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
            Configure 3rd party services for payments, messaging, and data. Keys are encrypted at rest.
          </p>

          {/* Stripe */}
          <IntegrationBlock
            icon={CreditCard}
            iconColor="text-indigo-600 dark:text-indigo-400"
            iconBg="bg-indigo-100 dark:bg-indigo-900/30"
            title="Stripe"
            desc="Accept credit card payments, Apple Pay, Google Pay"
            connected={!!settings.stripePublishableKey}
            docsUrl="https://dashboard.stripe.com/apikeys"
          >
            {editingSection === 'integrations' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Publishable Key</label>
                  <input value={settings.stripePublishableKey} onChange={(e) => updateSetting('stripePublishableKey', e.target.value)} placeholder="pk_live_..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Secret Key</label>
                  <input type="password" value={settings.stripeSecretKey} onChange={(e) => updateSetting('stripeSecretKey', e.target.value)} placeholder="sk_live_..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Webhook Secret</label>
                  <input type="password" value={settings.stripeWebhookSecret} onChange={(e) => updateSetting('stripeWebhookSecret', e.target.value)} placeholder="whsec_..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Connect Client ID</label>
                  <input value={settings.stripeConnectClientId} onChange={(e) => updateSetting('stripeConnectClientId', e.target.value)} placeholder="ca_..." className={inputCls} />
                </div>
              </div>
            )}
          </IntegrationBlock>

          {/* Twilio */}
          <IntegrationBlock
            icon={Phone}
            iconColor="text-red-600 dark:text-red-400"
            iconBg="bg-red-100 dark:bg-red-900/30"
            title="Twilio"
            desc="SMS, WhatsApp, load alerts, and voice calls"
            connected={!!settings.twilioAccountSid}
            docsUrl="https://www.twilio.com/console"
          >
            {editingSection === 'integrations' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Account SID</label>
                  <input value={settings.twilioAccountSid} onChange={(e) => updateSetting('twilioAccountSid', e.target.value)} placeholder="AC..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Auth Token</label>
                  <input type="password" value={settings.twilioAuthToken} onChange={(e) => updateSetting('twilioAuthToken', e.target.value)} placeholder="Token..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">SMS Phone Number</label>
                  <input value={settings.twilioPhoneNumber} onChange={(e) => updateSetting('twilioPhoneNumber', e.target.value)} placeholder="+1..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">WhatsApp Number</label>
                  <input value={settings.twilioWhatsappNumber} onChange={(e) => updateSetting('twilioWhatsappNumber', e.target.value)} placeholder="+1..." className={inputCls} />
                </div>
              </div>
            )}
          </IntegrationBlock>

          {/* SendGrid */}
          <IntegrationBlock
            icon={Mail}
            iconColor="text-sky-600 dark:text-sky-400"
            iconBg="bg-sky-100 dark:bg-sky-900/30"
            title="SendGrid"
            desc="Transactional emails — receipts, waivers, alerts"
            connected={!!settings.sendgridApiKey}
          >
            {editingSection === 'integrations' && (
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">API Key</label>
                <input type="password" value={settings.sendgridApiKey} onChange={(e) => updateSetting('sendgridApiKey', e.target.value)} placeholder="SG..." className={inputCls} />
              </div>
            )}
          </IntegrationBlock>

          {/* Weather API */}
          <IntegrationBlock
            icon={Globe}
            iconColor="text-emerald-600 dark:text-emerald-400"
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
            title="Weather API"
            desc="Real-time aviation weather data (Open-Meteo is free by default)"
            connected={true}
          >
            {editingSection === 'integrations' && (
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Custom API Key (optional)</label>
                <input value={settings.weatherApiKey} onChange={(e) => updateSetting('weatherApiKey', e.target.value)} placeholder="Leave empty for free Open-Meteo" className={inputCls} />
              </div>
            )}
          </IntegrationBlock>

          {/* USPA */}
          <IntegrationBlock
            icon={Shield}
            iconColor="text-amber-600 dark:text-amber-400"
            iconBg="bg-amber-100 dark:bg-amber-900/30"
            title="USPA Verification"
            desc="Automatically verify jumper license numbers and currency"
            connected={!!settings.uspaApiKey}
            docsUrl="https://uspa.org"
          >
            {editingSection === 'integrations' && (
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">API Key</label>
                <input type="password" value={settings.uspaApiKey} onChange={(e) => updateSetting('uspaApiKey', e.target.value)} placeholder="USPA API key..." className={inputCls} />
              </div>
            )}
          </IntegrationBlock>

          {/* AWS S3 — File Storage */}
          <IntegrationBlock
            icon={Download}
            iconColor="text-orange-600 dark:text-orange-400"
            iconBg="bg-orange-100 dark:bg-orange-900/30"
            title="AWS S3 — File Storage"
            desc="Waivers, photos, documents, media uploads"
            connected={!!settings.awsAccessKeyId}
            docsUrl="https://console.aws.amazon.com/s3"
          >
            {editingSection === 'integrations' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Region</label>
                  <select value={settings.awsRegion} onChange={(e) => updateSetting('awsRegion', e.target.value)} className={inputCls}>
                    {['us-east-1','us-west-2','eu-west-1','eu-central-1','ap-southeast-1','me-south-1'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Bucket Name</label>
                  <input value={settings.s3BucketName} onChange={(e) => updateSetting('s3BucketName', e.target.value)} placeholder="skylara-storage" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Access Key ID</label>
                  <input value={settings.awsAccessKeyId} onChange={(e) => updateSetting('awsAccessKeyId', e.target.value)} placeholder="AKIA..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Secret Access Key</label>
                  <input type="password" value={settings.awsSecretAccessKey} onChange={(e) => updateSetting('awsSecretAccessKey', e.target.value)} placeholder="Secret..." className={inputCls} />
                </div>
              </div>
            )}
          </IntegrationBlock>

          {/* Google & Apple OAuth */}
          <IntegrationBlock
            icon={Key}
            iconColor="text-blue-600 dark:text-blue-400"
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            title="Google & Apple Sign-In"
            desc="Social login for athletes and staff"
            connected={!!settings.googleClientId}
            docsUrl="https://console.cloud.google.com/apis/credentials"
          >
            {editingSection === 'integrations' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Google Client ID</label>
                  <input value={settings.googleClientId} onChange={(e) => updateSetting('googleClientId', e.target.value)} placeholder="xxxxx.apps.googleusercontent.com" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Google Client Secret</label>
                  <input type="password" value={settings.googleClientSecret} onChange={(e) => updateSetting('googleClientSecret', e.target.value)} placeholder="GOCSPX-..." className={inputCls} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Apple Client ID</label>
                  <input value={settings.appleClientId} onChange={(e) => updateSetting('appleClientId', e.target.value)} placeholder="com.skylara.app" className={inputCls} />
                </div>
              </div>
            )}
          </IntegrationBlock>

          {/* Maps */}
          <IntegrationBlock
            icon={Globe}
            iconColor="text-teal-600 dark:text-teal-400"
            iconBg="bg-teal-100 dark:bg-teal-900/30"
            title="Maps & Geolocation"
            desc="DZ location, weather coordinates, athlete navigation"
            connected={!!settings.mapboxApiToken || !!settings.googleMapsApiKey}
            docsUrl="https://account.mapbox.com/access-tokens/"
          >
            {editingSection === 'integrations' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Mapbox Token</label>
                  <input value={settings.mapboxApiToken} onChange={(e) => updateSetting('mapboxApiToken', e.target.value)} placeholder="pk.eyJ..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Google Maps API Key</label>
                  <input value={settings.googleMapsApiKey} onChange={(e) => updateSetting('googleMapsApiKey', e.target.value)} placeholder="AIzaSy..." className={inputCls} />
                </div>
              </div>
            )}
          </IntegrationBlock>

          {/* Push Notifications */}
          <IntegrationBlock
            icon={Bell}
            iconColor="text-purple-600 dark:text-purple-400"
            iconBg="bg-purple-100 dark:bg-purple-900/30"
            title="Push Notifications"
            desc="Expo (mobile) and VAPID (web browser) push delivery"
            connected={!!settings.expoAccessToken || !!settings.vapidPublicKey}
            docsUrl="https://expo.dev/accounts/[account]/settings/access-tokens"
          >
            {editingSection === 'integrations' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Expo Access Token (mobile push)</label>
                  <input type="password" value={settings.expoAccessToken} onChange={(e) => updateSetting('expoAccessToken', e.target.value)} placeholder="ExponentPushToken[...]" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">VAPID Public Key (web push)</label>
                  <input value={settings.vapidPublicKey} onChange={(e) => updateSetting('vapidPublicKey', e.target.value)} placeholder="BDd3..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">VAPID Private Key</label>
                  <input type="password" value={settings.vapidPrivateKey} onChange={(e) => updateSetting('vapidPrivateKey', e.target.value)} placeholder="Private key..." className={inputCls} />
                </div>
                <p className="md:col-span-2 text-xs text-gray-400 mt-1">Generate VAPID keys: <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">npx web-push generate-vapid-keys</code></p>
              </div>
            )}
          </IntegrationBlock>

          {/* Monitoring */}
          <IntegrationBlock
            icon={AlertCircle}
            iconColor="text-rose-600 dark:text-rose-400"
            iconBg="bg-rose-100 dark:bg-rose-900/30"
            title="Sentry — Error Monitoring"
            desc="Automatic error tracking and alerting"
            connected={!!settings.sentryDsn}
            docsUrl="https://sentry.io/settings/projects/"
          >
            {editingSection === 'integrations' && (
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Sentry DSN</label>
                <input value={settings.sentryDsn} onChange={(e) => updateSetting('sentryDsn', e.target.value)} placeholder="https://xxxxx@sentry.io/project-id" className={inputCls} />
              </div>
            )}
          </IntegrationBlock>

          {/* External Links & Social */}
          <IntegrationBlock
            icon={LinkIcon}
            iconColor="text-gray-600 dark:text-gray-400"
            iconBg="bg-gray-100 dark:bg-gray-800"
            title="External Links & Social Media"
            desc="Your DZ website, booking page, and social profiles"
            connected={!!settings.externalWebsiteUrl}
            last
          >
            {editingSection === 'integrations' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Website URL</label>
                  <input value={settings.externalWebsiteUrl} onChange={(e) => updateSetting('externalWebsiteUrl', e.target.value)} placeholder="https://yourDZ.com" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Booking Page URL</label>
                  <input value={settings.externalBookingUrl} onChange={(e) => updateSetting('externalBookingUrl', e.target.value)} placeholder="https://yourDZ.com/book" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Facebook</label>
                  <input value={settings.facebookUrl} onChange={(e) => updateSetting('facebookUrl', e.target.value)} placeholder="https://facebook.com/yourDZ" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Instagram</label>
                  <input value={settings.instagramUrl} onChange={(e) => updateSetting('instagramUrl', e.target.value)} placeholder="https://instagram.com/yourDZ" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">YouTube</label>
                  <input value={settings.youtubeUrl} onChange={(e) => updateSetting('youtubeUrl', e.target.value)} placeholder="https://youtube.com/@yourDZ" className={inputCls} />
                </div>
              </div>
            )}
          </IntegrationBlock>

          {editingSection === 'integrations' && (
            <div className="mt-6">
              <SaveButton section="integrations" />
            </div>
          )}
          <SavedBanner section="integrations" />
        </div>

        {/* ── Language & Locale ── */}
        <div id="section-language" className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Globe size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Language & Locale</h2>
            </div>
            <EditToggle section="language" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Display Language</label>
              <select
                value={settings.language || 'en'}
                onChange={(e) => updateSetting('language' as any, e.target.value)}
                disabled={editingSection !== 'language'}
                className={editingSection === 'language' ? inputCls : 'mt-0 w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 text-sm'}
              >
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
                <option value="it">Italiano</option>
                <option value="pt">Português</option>
                <option value="nl">Nederlands</option>
                <option value="pl">Polski</option>
                <option value="cs">Čeština</option>
                <option value="da">Dansk</option>
                <option value="sv">Svenska</option>
                <option value="fi">Suomi</option>
                <option value="ar">العربية (RTL)</option>
                <option value="he">עברית (RTL)</option>
                <option value="tr">Türkçe</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Currency</label>
              <select
                value={settings.currency || 'USD'}
                onChange={(e) => updateSetting('currency' as any, e.target.value)}
                disabled={editingSection !== 'language'}
                className={editingSection === 'language' ? inputCls : 'mt-0 w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 text-sm'}
              >
                <option value="USD">USD - US Dollar ($)</option>
                <option value="EUR">EUR - Euro (€)</option>
                <option value="GBP">GBP - British Pound (£)</option>
                <option value="AED">AED - UAE Dirham (د.إ)</option>
                <option value="CHF">CHF - Swiss Franc (CHF)</option>
                <option value="SEK">SEK - Swedish Krona (kr)</option>
                <option value="DKK">DKK - Danish Krone (kr)</option>
                <option value="PLN">PLN - Polish Złoty (zł)</option>
                <option value="CZK">CZK - Czech Koruna (Kč)</option>
                <option value="TRY">TRY - Turkish Lira (₺)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date Format</label>
              <select
                value={settings.dateFormat || 'MM/DD/YYYY'}
                onChange={(e) => updateSetting('dateFormat' as any, e.target.value)}
                disabled={editingSection !== 'language'}
                className={editingSection === 'language' ? inputCls : 'mt-0 w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 text-sm'}
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (European)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Weight Unit</label>
              <select
                value={settings.weightUnit || 'kg'}
                onChange={(e) => updateSetting('weightUnit' as any, e.target.value)}
                disabled={editingSection !== 'language'}
                className={editingSection === 'language' ? inputCls : 'mt-0 w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 text-sm'}
              >
                <option value="lbs">Pounds (lbs)</option>
                <option value="kg">Kilograms (kg)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Altitude Unit</label>
              <select
                value={settings.altitudeUnit || 'ft'}
                onChange={(e) => updateSetting('altitudeUnit' as any, e.target.value)}
                disabled={editingSection !== 'language'}
                className={editingSection === 'language' ? inputCls : 'mt-0 w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 text-sm'}
              >
                <option value="ft">Feet (ft)</option>
                <option value="m">Meters (m)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Timezone</label>
              <select
                value={settings.timezone || 'America/Denver'}
                onChange={(e) => updateSetting('timezone' as any, e.target.value)}
                disabled={editingSection !== 'language'}
                className={editingSection === 'language' ? inputCls : 'mt-0 w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 text-sm'}
              >
                <option value="America/Anchorage">America/Anchorage (AKST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="America/Denver">America/Denver (MST)</option>
                <option value="America/Chicago">America/Chicago (CST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Europe/Paris">Europe/Paris (CET)</option>
                <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                <option value="Europe/Stockholm">Europe/Stockholm (CET)</option>
                <option value="Europe/Prague">Europe/Prague (CET)</option>
                <option value="Europe/Istanbul">Europe/Istanbul (EET)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                <option value="Asia/Tel_Aviv">Asia/Tel_Aviv (IST)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
              </select>
            </div>
          </div>
          {editingSection === 'language' && (
            <div className="mt-4"><SaveButton section="language" /></div>
          )}
          <SavedBanner section="language" />
        </div>

        {/* ── Notification Preferences ── */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Bell size={20} className="text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Notification Preferences</h2>
            </div>
            <EditToggle section="notifications" />
          </div>

          <div className="space-y-4">
            {([
              ['emailNotifications', 'Email Notifications', 'Receive emails for alerts and updates'],
              ['smsNotifications', 'SMS Notifications', 'Receive text messages for urgent alerts'],
              ['pushNotifications', 'Push Notifications', 'Browser push notifications for real-time updates'],
              ['loadAlerts', 'Load Alerts', 'Notify when new loads are scheduled'],
              ['weatherAlerts', 'Weather Alerts', 'Notify about weather condition changes'],
              ['waiverReminders', 'Waiver Reminders', 'Remind jumpers to complete waivers'],
              ['paymentConfirmations', 'Payment Confirmations', 'Confirm all payment transactions'],
            ] as const).map(([key, label, desc]) => (
              <div key={key} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                </div>
                {editingSection === 'notifications' ? (
                  <button
                    onClick={() => updateSetting(key, !settings[key])}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings[key]
                        ? 'bg-blue-600 dark:bg-blue-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-800 transition-transform ${
                        settings[key] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                ) : (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    settings[key]
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-gray-100 text-gray-500 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {settings[key] ? 'Enabled' : 'Disabled'}
                  </span>
                )}
              </div>
            ))}
          </div>

          {editingSection === 'notifications' && (
            <div className="mt-6"><SaveButton section="notifications" /></div>
          )}
          <SavedBanner section="notifications" />
        </div>

        {/* ── Account & Security ── */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Lock size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Account & Security</h2>
            </div>
            <EditToggle section="security" />
          </div>

          <div className="space-y-4">
            {/* Change Password */}
            <div className="py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Change Password</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Update your account password regularly for security</p>
                </div>
                <button
                  onClick={() => {
                    apiPost('/auth/forgot-password', { email: user?.email }).then(
                      () => success('Password reset email sent — check your inbox'),
                      () => showError('Failed to send password reset email'),
                    );
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${editingSection === 'security' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                >
                  Change
                </button>
              </div>
            </div>

            {/* Two-Factor Authentication */}
            <div className="py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Add an extra layer of security to your account</p>
                </div>
                <button
                  onClick={() => info('Two-factor authentication setup will be available in the next release')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${editingSection === 'security' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                >
                  Setup
                </button>
              </div>
            </div>

            {/* Active Sessions */}
            <div className="py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Active Sessions</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">View and manage your logged-in sessions</p>
                </div>
                <button
                  onClick={() => info('Session management will be available in the next release')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${editingSection === 'security' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                >
                  <LogOut size={14} />
                  View
                </button>
              </div>
            </div>

            {/* Data Export */}
            <div className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Data Export</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Download your dropzone data in CSV format</p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const res = await apiGet('/admin/export?format=csv');
                      if (res?.success) success('Export started — you will be notified when ready');
                      else info('Data export will be available in the next release');
                    } catch { info('Data export will be available in the next release'); }
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${editingSection === 'security' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                >
                  <Download size={14} />
                  Export
                </button>
              </div>
            </div>
          </div>

          {editingSection === 'security' && (
            <div className="mt-6"><SaveButton section="security" /></div>
          )}
          <SavedBanner section="security" />
        </div>
      </div>
    </div>
    </RouteGuard>
  );
}

// ── INTEGRATION BLOCK ────────────────────────────────────────
function IntegrationBlock({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  desc,
  connected,
  last,
  docsUrl,
  children,
}: {
  icon: any;
  iconColor: string;
  iconBg: string;
  title: string;
  desc: string;
  connected: boolean;
  last?: boolean;
  docsUrl?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`py-5 ${!last ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
            <Icon size={20} className={iconColor} />
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white text-sm">{title}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{desc}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {docsUrl && (
            <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline">
              Docs
            </a>
          )}
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
            connected
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-gray-100 text-gray-500 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            {connected ? 'Connected' : 'Not Connected'}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}
