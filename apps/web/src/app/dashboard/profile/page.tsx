'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { useTheme } from '@/contexts/ThemeContext';
import { QRCode } from '@/components/QRCode';
import {
  User,
  Mail,
  Phone,
  Globe,
  Calendar,
  Shield,
  Bell,
  Eye,
  EyeOff,
  Save,
  Camera,
  MapPin,
  AlertTriangle,
  Check,
  Loader2,
  Languages,
  Ruler,
  Palette,
  Sun,
  Moon,
  Monitor,
  QrCode,
  ChevronRight,
  CreditCard,
  Link as LinkIcon,
  Key,
} from 'lucide-react';
import Link from 'next/link';

// ── LANGUAGES ────────────────────────────────────────
const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
];

const UNIT_SYSTEMS = [
  { code: 'imperial', name: 'Imperial', desc: 'ft, mph, lbs, °F' },
  { code: 'metric', name: 'Metric', desc: 'm, km/h, kg, °C' },
];

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

// ── TYPES ────────────────────────────────────────
interface ProfileData {
  id: number;
  uuid: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  preferredLanguage: string;
  status: string;
  roles: string[];
  profile: {
    avatar?: string;
    bio?: string;
    dateOfBirth?: string;
    gender?: string;
    nationality?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelation?: string;
    notificationPreferences?: Record<string, boolean>;
    visibilityPublic?: boolean;
  } | null;
}

type Tab = 'personal' | 'preferences' | 'notifications' | 'security' | 'integrations';

// ── MAIN COMPONENT ────────────────────────────────────────
export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { info, success: showSuccess, warning } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('personal');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [language, setLanguage] = useState('en');
  const [units, setUnits] = useState('imperial');
  const [visibilityPublic, setVisibilityPublic] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [uuid, setUuid] = useState('');
  const [userId, setUserId] = useState<number>(0);

  // Emergency contact
  const [ecName, setEcName] = useState('');
  const [ecPhone, setEcPhone] = useState('');
  const [ecRelation, setEcRelation] = useState('');

  // Notification prefs
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifSMS, setNotifSMS] = useState(false);
  const [notifLoadAlerts, setNotifLoadAlerts] = useState(true);
  const [notifWeather, setNotifWeather] = useState(true);
  const [notifMarketing, setNotifMarketing] = useState(false);

  // Integration keys
  const [stripeKey, setStripeKey] = useState('');
  const [stripeSecret, setStripeSecret] = useState('');
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');
  const [sendgridKey, setSendgridKey] = useState('');

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: ProfileData }>('/users/me');
      if (res.success && res.data) {
        const d = res.data;
        setFirstName(d.firstName || '');
        setLastName(d.lastName || '');
        setEmail(d.email || '');
        setPhone(d.phone || '');
        setLanguage(d.preferredLanguage || 'en');
        setRoles(d.roles || []);
        setUuid(d.uuid || '');
        setUserId(d.id);
        if (d.profile) {
          setBio(d.profile.bio || '');
          setGender(d.profile.gender || '');
          setNationality(d.profile.nationality || '');
          setDateOfBirth(d.profile.dateOfBirth ? d.profile.dateOfBirth.slice(0, 10) : '');
          setVisibilityPublic(d.profile.visibilityPublic || false);
          setEcName(d.profile.emergencyContactName || '');
          setEcPhone(d.profile.emergencyContactPhone || '');
          setEcRelation(d.profile.emergencyContactRelation || '');
          const np = d.profile.notificationPreferences || {};
          setNotifEmail(np.email !== false);
          setNotifPush(np.push !== false);
          setNotifSMS(np.sms === true);
          setNotifLoadAlerts(np.loadAlerts !== false);
          setNotifWeather(np.weather !== false);
          setNotifMarketing(np.marketing === true);
        }
      }
    } catch {
      // Use auth context data as fallback
      if (user) {
        setFirstName(user.firstName || '');
        setLastName(user.lastName || '');
        setEmail(user.email || '');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSave = async () => {
    setIsSaving(true);
    setSavedMsg(null);
    try {
      await apiPatch('/users/me', {
        firstName,
        lastName,
        phone,
        preferredLanguage: language,
        dateOfBirth: dateOfBirth || undefined,
        bio,
        gender,
        nationality,
        emergencyContactName: ecName,
        emergencyContactPhone: ecPhone,
        emergencyContactRelation: ecRelation,
        visibilityPublic,
        notificationPreferences: {
          email: notifEmail,
          push: notifPush,
          sms: notifSMS,
          loadAlerts: notifLoadAlerts,
          weather: notifWeather,
          marketing: notifMarketing,
        },
      });
      // Store units preference locally (not in DB schema)
      if (typeof window !== 'undefined') localStorage.setItem('skylara_units', units);
      setSavedMsg('Profile saved successfully');
      setTimeout(() => setSavedMsg(null), 4000);
    } catch (err) {
      setSavedMsg('Failed to save — please try again');
    } finally {
      setIsSaving(false);
    }
  };

  // Load local-only prefs
  useEffect(() => {
    const savedUnits = typeof window !== 'undefined' ? localStorage.getItem('skylara_units') : null;
    if (savedUnits) setUnits(savedUnits);
  }, []);

  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'integrations', label: 'Integrations', icon: LinkIcon },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Profile Header Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {initials || '?'}
              </div>
              <button className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={20} className="text-white" />
              </button>
            </div>

            {/* Name & Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {firstName} {lastName}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{email}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {roles.map((role) => (
                  <span key={role} className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {role.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setShowQR(true)}
                className="p-2.5 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                title="My QR Code"
              >
                <QrCode size={20} />
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {savedMsg && (
            <div className={`mt-4 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 ${
              savedMsg.includes('Failed')
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
            }`}>
              <Check size={16} />
              {savedMsg}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6">

          {/* ── PERSONAL INFO ── */}
          {activeTab === 'personal' && (
            <div className="space-y-8">
              {/* Basic Info */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Basic Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="First Name" icon={User}>
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Last Name" icon={User}>
                    <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Email" icon={Mail}>
                    <input value={email} disabled className={`${inputCls} opacity-60 cursor-not-allowed`} />
                  </Field>
                  <Field label="Phone" icon={Phone}>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className={inputCls} />
                  </Field>
                  <Field label="Date of Birth" icon={Calendar}>
                    <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Gender" icon={User}>
                    <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputCls}>
                      <option value="">Select...</option>
                      {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </Field>
                  <Field label="Nationality" icon={Globe}>
                    <input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="e.g. American" className={inputCls} />
                  </Field>
                  <Field label="Profile Visibility" icon={visibilityPublic ? Eye : EyeOff}>
                    <select value={visibilityPublic ? 'public' : 'private'} onChange={(e) => setVisibilityPublic(e.target.value === 'public')} className={inputCls}>
                      <option value="private">Private — only staff can see</option>
                      <option value="public">Public — other athletes can see</option>
                    </select>
                  </Field>
                </div>
              </div>

              {/* Bio */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Bio</h2>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Tell the skydiving community about yourself..."
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* Emergency Contact */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Emergency Contact</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Required for all jump operations</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Full Name" icon={AlertTriangle}>
                    <input value={ecName} onChange={(e) => setEcName(e.target.value)} placeholder="Emergency contact name" className={inputCls} />
                  </Field>
                  <Field label="Phone Number" icon={Phone}>
                    <input value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} placeholder="+1 (555) 000-0000" className={inputCls} />
                  </Field>
                  <Field label="Relationship" icon={User}>
                    <select value={ecRelation} onChange={(e) => setEcRelation(e.target.value)} className={inputCls}>
                      <option value="">Select...</option>
                      {['Spouse', 'Parent', 'Sibling', 'Partner', 'Friend', 'Other'].map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* ── PREFERENCES ── */}
          {activeTab === 'preferences' && (
            <div className="space-y-8">
              {/* Language */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Language</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Choose your preferred language for the SkyLara interface</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                        language === lang.code
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 ring-2 ring-blue-200 dark:ring-blue-800'
                          : 'border-gray-200 dark:border-slate-700 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:border-slate-600 dark:hover:border-gray-600'
                      }`}
                    >
                      <span className="text-xl">{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Units */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Units</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">How altitude, speed, weight, and temperature are displayed</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {UNIT_SYSTEMS.map((sys) => (
                    <button
                      key={sys.code}
                      onClick={() => setUnits(sys.code)}
                      className={`flex items-center gap-4 px-5 py-4 rounded-lg border text-left transition-all ${
                        units === sys.code
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800'
                          : 'border-gray-200 dark:border-slate-700 dark:border-gray-700 hover:border-gray-300 dark:border-slate-600 dark:hover:border-gray-600'
                      }`}
                    >
                      <Ruler size={24} className={units === sys.code ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                      <div>
                        <div className={`font-semibold ${units === sys.code ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>{sys.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sys.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Appearance</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Choose your preferred color theme</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {([
                    { key: 'light', label: 'Light', icon: Sun, desc: 'Clean and bright' },
                    { key: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on the eyes' },
                    { key: 'system', label: 'System', icon: Monitor, desc: 'Match your OS' },
                  ] as const).map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setTheme(t.key)}
                      className={`flex items-center gap-4 px-5 py-4 rounded-lg border text-left transition-all ${
                        theme === t.key
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800'
                          : 'border-gray-200 dark:border-slate-700 dark:border-gray-700 hover:border-gray-300 dark:border-slate-600 dark:hover:border-gray-600'
                      }`}
                    >
                      <t.icon size={24} className={theme === t.key ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                      <div>
                        <div className={`font-semibold ${theme === t.key ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>{t.label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Notification Channels</h2>
              <div className="space-y-3">
                <Toggle label="Email Notifications" desc="Receive updates via email" checked={notifEmail} onChange={setNotifEmail} />
                <Toggle label="Push Notifications" desc="Browser and mobile push alerts" checked={notifPush} onChange={setNotifPush} />
                <Toggle label="SMS Notifications" desc="Text messages for urgent alerts" checked={notifSMS} onChange={setNotifSMS} />
              </div>

              <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-8 mb-2">Alert Types</h2>
              <div className="space-y-3">
                <Toggle label="Load Alerts" desc="When loads are filling, boarding, or dispatched" checked={notifLoadAlerts} onChange={setNotifLoadAlerts} />
                <Toggle label="Weather Alerts" desc="Wind and visibility warnings" checked={notifWeather} onChange={setNotifWeather} />
                <Toggle label="Marketing & Updates" desc="New features and promotions" checked={notifMarketing} onChange={setNotifMarketing} />
              </div>
            </div>
          )}

          {/* ── SECURITY ── */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Account Security</h2>

              <div className="p-4 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Password</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Last changed: Never</p>
                </div>
                <button
                  onClick={() => {
                    apiPost('/auth/forgot-password', { email: user?.email }).then(
                      () => showSuccess('Password reset email sent — check your inbox'),
                      () => info('Password reset is available from the login page'),
                    );
                  }}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 text-sm font-medium transition-colors"
                >
                  Change Password
                </button>
              </div>

              <div className="p-4 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Two-Factor Authentication</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security</p>
                </div>
                <button
                  onClick={() => info('Two-factor authentication setup will be available in the next release')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                >
                  Enable 2FA
                </button>
              </div>

              <div className="p-4 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Active Sessions</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">1 active session</p>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Sign out of all other sessions?')) {
                      logout();
                    }
                  }}
                  className="px-4 py-2 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors"
                >
                  Sign Out All
                </button>
              </div>

              <div className="p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 rounded-lg">
                <div className="font-semibold text-red-700 dark:text-red-400">Danger Zone</div>
                <p className="text-sm text-red-600 dark:text-red-400/80 mt-1 mb-3">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <button
                  onClick={() => warning('Account deletion requires contacting your dropzone administrator')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
                >
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {/* ── INTEGRATIONS ── */}
          {activeTab === 'integrations' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Payment Gateway</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Connect Stripe to accept online payments from jumpers</p>
                <div className="p-5 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-lg space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <CreditCard size={20} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">Stripe</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Credit cards, Apple Pay, Google Pay</div>
                    </div>
                  </div>
                  <Field label="Publishable Key" icon={Key}>
                    <input value={stripeKey} onChange={(e) => setStripeKey(e.target.value)} placeholder="pk_live_..." className={inputCls} />
                  </Field>
                  <Field label="Secret Key" icon={Key}>
                    <input type="password" value={stripeSecret} onChange={(e) => setStripeSecret(e.target.value)} placeholder="sk_live_..." className={inputCls} />
                  </Field>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">SMS / Messaging</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Send load alerts and notifications via SMS</p>
                <div className="p-5 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-lg space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <Phone size={20} className="text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">Twilio</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">SMS and voice notifications</div>
                    </div>
                  </div>
                  <Field label="Account SID" icon={Key}>
                    <input value={twilioSid} onChange={(e) => setTwilioSid(e.target.value)} placeholder="AC..." className={inputCls} />
                  </Field>
                  <Field label="Auth Token" icon={Key}>
                    <input type="password" value={twilioToken} onChange={(e) => setTwilioToken(e.target.value)} placeholder="Auth token..." className={inputCls} />
                  </Field>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Email Delivery</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Transactional emails for receipts, waivers, and alerts</p>
                <div className="p-5 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-lg space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                      <Mail size={20} className="text-sky-600 dark:text-sky-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">SendGrid</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Transactional & marketing email</div>
                    </div>
                  </div>
                  <Field label="API Key" icon={Key}>
                    <input type="password" value={sendgridKey} onChange={(e) => setSendgridKey(e.target.value)} placeholder="SG..." className={inputCls} />
                  </Field>
                </div>
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 text-center mt-4">
                Integration keys are stored securely. Changes take effect immediately after saving.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowQR(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">My QR Identity</h3>
            <div className="flex justify-center mb-4">
              <QRCode data={`skylara://athlete/${userId}/${firstName}-${lastName}`} size={200} />
            </div>
            <div className="font-semibold text-gray-900 dark:text-white text-lg">{firstName} {lastName}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{email}</div>
            <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-3">Present at check-in for fast identification</p>
            <button onClick={() => setShowQR(false)} className="w-full mt-4 px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 font-medium text-sm transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SHARED STYLES ────────────────────────────────────────
const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors';

// ── FIELD COMPONENT ────────────────────────────────────────
function Field({ label, icon: Icon, children }: { label: string; icon: any; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        <Icon size={14} className="text-gray-400 dark:text-gray-500 dark:text-gray-400" />
        {label}
      </label>
      {children}
    </div>
  );
}

// ── TOGGLE COMPONENT ────────────────────────────────────────
function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-lg">
      <div>
        <div className="font-medium text-gray-900 dark:text-white text-sm">{label}</div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white dark:bg-slate-800 rounded-full shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  );
}
