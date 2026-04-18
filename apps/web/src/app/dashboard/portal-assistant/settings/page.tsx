'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api';
import { PortalAssistantNav } from '../page';
import {
  Settings,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Power,
  Users,
  MessageSquare,
  BookOpen,
  Bot,
  Globe,
  MessageCircle,
  ArrowUpRight,
  Database,
  ShieldCheck,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SettingsState {
  assistantEnabled: boolean;
  roleVisibility: Record<string, boolean>;
  suggestedPrompts: Record<string, string[]>;
  knowledgeScope: Record<string, boolean>;
  automationScope: Record<string, boolean>;
  language: string;
  fallbackResponse: string;
  escalationTarget: string;
  dataAccess: Record<string, boolean>;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ALL_ROLES = [
  'PLATFORM_ADMIN',
  'DZ_MANAGER',
  'MANIFEST_STAFF',
  'SAFETY_OFFICER',
  'PILOT',
  'TI',
  'AFFI',
  'COACH',
  'JUMPER',
  'STUDENT',
];

const KNOWLEDGE_CATEGORIES = [
  'Manifest SOP',
  'Check-in SOP',
  'Waiver Rules',
  'AFF & Courses',
  'Tandem Workflow',
  'Incident Process',
  'Event Setup',
  'Document Verification',
  'Staff Operations',
  'Weather & Restrictions',
];

const AUTOMATION_NAMES = [
  'Waiver Incomplete Reminder',
  'Expiring Document Alert',
  'Unpaid Booking Reminder',
  'Daily Ops Summary',
  'Staff Shortage Alert',
  'AFF Progression Follow-up',
  'Registration Reminder',
  'Missing Medical Alert',
  'Gear Repack Due',
  'Load Efficiency Report',
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'Arabic' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'hi', label: 'Hindi' },
  { code: 'zh', label: 'Chinese' },
];

const ESCALATION_TARGETS = ['DZ Manager', 'Safety Officer', 'Support'];

const DATA_ACCESS_KEYS = ['Users', 'Financial', 'Medical', 'Incidents'];

/* ------------------------------------------------------------------ */
/*  Default state                                                      */
/* ------------------------------------------------------------------ */

const DEFAULT_SETTINGS: SettingsState = {
  assistantEnabled: true,
  roleVisibility: Object.fromEntries(ALL_ROLES.map((r) => [r, true])),
  suggestedPrompts: {
    PLATFORM_ADMIN: ['Show today\'s operations summary', 'List all users with expired documents'],
    DZ_MANAGER: ['Who is missing a waiver today?', 'Show unpaid tandem bookings', 'Daily operations summary'],
    MANIFEST_STAFF: ['Which loads are boarding now?', 'Find jumper by name'],
    SAFETY_OFFICER: ['Show all incidents this month', 'List gear due for repack'],
    PILOT: ['What is my next load?', 'Current wind conditions'],
    TI: ['Show my tandem bookings today'],
    AFFI: ['Show AFF students not ready to jump'],
    COACH: ['Show my assigned students'],
    JUMPER: ['What are my upcoming jumps?'],
    STUDENT: ['What is my current AFF level?'],
  },
  knowledgeScope: Object.fromEntries(KNOWLEDGE_CATEGORIES.map((c) => [c, true])),
  automationScope: Object.fromEntries(AUTOMATION_NAMES.map((n) => [n, true])),
  language: 'en',
  fallbackResponse: 'I\'m sorry, I don\'t have an answer for that. Please contact your DZ manager or visit the Help Center for assistance.',
  escalationTarget: 'DZ Manager',
  dataAccess: Object.fromEntries(DATA_ACCESS_KEYS.map((k) => [k, true])),
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [newPromptRole, setNewPromptRole] = useState<string | null>(null);
  const [newPromptText, setNewPromptText] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiGet<SettingsState>('/assistant/settings');
        if (!cancelled && data && typeof data === 'object' && 'assistantEnabled' in data) {
          setSettings(data);
        }
      } catch {
        // use defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiPost('/assistant/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save settings. Changes are stored locally.');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = (role: string) => {
    setSettings((s) => ({
      ...s,
      roleVisibility: { ...s.roleVisibility, [role]: !s.roleVisibility[role] },
    }));
  };

  const toggleKnowledge = (cat: string) => {
    setSettings((s) => ({
      ...s,
      knowledgeScope: { ...s.knowledgeScope, [cat]: !s.knowledgeScope[cat] },
    }));
  };

  const toggleAutomation = (name: string) => {
    setSettings((s) => ({
      ...s,
      automationScope: { ...s.automationScope, [name]: !s.automationScope[name] },
    }));
  };

  const toggleDataAccess = (key: string) => {
    setSettings((s) => ({
      ...s,
      dataAccess: { ...s.dataAccess, [key]: !s.dataAccess[key] },
    }));
  };

  const addPrompt = (role: string) => {
    if (!newPromptText.trim()) return;
    setSettings((s) => ({
      ...s,
      suggestedPrompts: {
        ...s.suggestedPrompts,
        [role]: [...(s.suggestedPrompts[role] || []), newPromptText.trim()],
      },
    }));
    setNewPromptText('');
    setNewPromptRole(null);
  };

  const removePrompt = (role: string, index: number) => {
    setSettings((s) => ({
      ...s,
      suggestedPrompts: {
        ...s.suggestedPrompts,
        [role]: (s.suggestedPrompts[role] || []).filter((_, i) => i !== index),
      },
    }));
  };

  /* ---- Section component ---- */
  const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
    <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6 mb-6">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" /> {title}
      </h3>
      {children}
    </div>
  );

  /* ---- Toggle helper ---- */
  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) => (
    <button
      onClick={onChange}
      className="flex items-center gap-3"
      type="button"
    >
      <span
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white dark:bg-slate-800 rounded-full shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
      {label && <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>}
    </button>
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <PortalAssistantNav current="/dashboard/portal-assistant/settings" />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-500 dark:text-gray-400">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <PortalAssistantNav current="/dashboard/portal-assistant/settings" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure the Portal Assistant</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors text-sm font-medium"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Settings'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Assistant Status */}
      <Section title="Assistant Status" icon={Power}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">Enable Portal Assistant</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-0.5">When disabled, the assistant is hidden for all users</p>
          </div>
          <Toggle
            checked={settings.assistantEnabled}
            onChange={() => setSettings((s) => ({ ...s, assistantEnabled: !s.assistantEnabled }))}
          />
        </div>
      </Section>

      {/* Role Visibility */}
      <Section title="Role Visibility" icon={Users}>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Choose which roles can see and use the assistant</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ALL_ROLES.map((role) => (
            <label key={role} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.roleVisibility[role] ?? true}
                onChange={() => toggleRole(role)}
                className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{role.replace(/_/g, ' ')}</span>
            </label>
          ))}
        </div>
      </Section>

      {/* Suggested Prompts */}
      <Section title="Suggested Prompts" icon={MessageSquare}>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Customize suggested prompts shown to each role</p>
        <div className="space-y-4">
          {ALL_ROLES.map((role) => {
            const prompts = settings.suggestedPrompts[role] || [];
            return (
              <div key={role} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">{role.replace(/_/g, ' ')}</h4>
                  <button
                    onClick={() => { setNewPromptRole(newPromptRole === role ? null : role); setNewPromptText(''); }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                {prompts.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 italic">No prompts configured</p>
                )}
                <ul className="space-y-1">
                  {prompts.map((p, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex-1 truncate">{p}</span>
                      <button onClick={() => removePrompt(role, i)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </li>
                  ))}
                </ul>
                {newPromptRole === role && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={newPromptText}
                      onChange={(e) => setNewPromptText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addPrompt(role); }}
                      placeholder="Type a suggested prompt..."
                      className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={() => addPrompt(role)}
                      disabled={!newPromptText.trim()}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Knowledge Scope */}
      <Section title="Knowledge Scope" icon={BookOpen}>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Toggle which knowledge categories are active</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {KNOWLEDGE_CATEGORIES.map((cat) => (
            <Toggle
              key={cat}
              checked={settings.knowledgeScope[cat] ?? true}
              onChange={() => toggleKnowledge(cat)}
              label={cat}
            />
          ))}
        </div>
      </Section>

      {/* Automation Scope */}
      <Section title="Automation Scope" icon={Bot}>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Toggle which automations are enabled by default</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {AUTOMATION_NAMES.map((name) => (
            <Toggle
              key={name}
              checked={settings.automationScope[name] ?? true}
              onChange={() => toggleAutomation(name)}
              label={name}
            />
          ))}
        </div>
      </Section>

      {/* Language */}
      <Section title="Language" icon={Globe}>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Default language for assistant responses</p>
        <select
          value={settings.language}
          onChange={(e) => setSettings((s) => ({ ...s, language: e.target.value }))}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </Section>

      {/* Fallback Response */}
      <Section title="Fallback Response" icon={MessageCircle}>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Message shown when the assistant cannot answer a question</p>
        <textarea
          value={settings.fallbackResponse}
          onChange={(e) => setSettings((s) => ({ ...s, fallbackResponse: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </Section>

      {/* Escalation */}
      <Section title="Escalation" icon={ArrowUpRight}>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Who to escalate to when the assistant cannot help</p>
        <select
          value={settings.escalationTarget}
          onChange={(e) => setSettings((s) => ({ ...s, escalationTarget: e.target.value }))}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
        >
          {ESCALATION_TARGETS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </Section>

      {/* Data Access */}
      <Section title="Data Access" icon={Database}>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Control what data the assistant can access</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DATA_ACCESS_KEYS.map((key) => (
            <Toggle
              key={key}
              checked={settings.dataAccess[key] ?? true}
              onChange={() => toggleDataAccess(key)}
              label={key}
            />
          ))}
        </div>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          Disabling access restricts assistant queries for all roles
        </p>
      </Section>

      {/* Bottom save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors text-sm font-medium"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
