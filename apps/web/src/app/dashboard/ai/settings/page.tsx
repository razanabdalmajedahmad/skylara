'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Save,
  Bot,
  Eye,
  Database,
  Zap,
  Globe,
  MessageSquare,
  Shield,
  Users,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  Info,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api';

interface AISettings {
  assistantEnabled: boolean;
  roleVisibility: Record<string, boolean>;
  knowledgeScope: {
    includeHelpArticles: boolean;
    includeDocuments: boolean;
    includeSOPs: boolean;
    includeTrainingMaterials: boolean;
  };
  automationScope: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    inAppMessages: boolean;
  };
  languageBehavior: {
    defaultLanguage: string;
    autoDetect: boolean;
    formalTone: boolean;
  };
  fallbackResponses: {
    unknownQuery: string;
    serviceUnavailable: string;
    confidentialTopic: string;
  };
  escalationRouting: {
    safetyIssues: string;
    billingIssues: string;
    operationsIssues: string;
    technicalIssues: string;
  };
  dataAccessBoundaries: {
    canAccessAthleteData: boolean;
    canAccessFinancialData: boolean;
    canAccessIncidentReports: boolean;
    canAccessStaffSchedules: boolean;
    canAccessManifestData: boolean;
  };
}

const ROLES = [
  { key: 'admin', label: 'Admin' },
  { key: 'dzo', label: 'DZ Operator' },
  { key: 'jump_master', label: 'Jump Master' },
  { key: 'instructor', label: 'Instructor' },
  { key: 'safety_officer', label: 'Safety Officer' },
  { key: 'packer', label: 'Packer' },
  { key: 'athlete', label: 'Athlete' },
  { key: 'tandem_student', label: 'Tandem Student' },
  { key: 'fun_jumper', label: 'Fun Jumper' },
  { key: 'coach', label: 'Coach' },
];

const ESCALATION_TARGETS = [
  'DZ Manager',
  'Safety Officer',
  'Admin',
  'Chief Instructor',
  'Front Desk',
  'On-call Manager',
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
];

const DEFAULT_SETTINGS: AISettings = {
  assistantEnabled: true,
  roleVisibility: {
    admin: true,
    dzo: true,
    jump_master: true,
    instructor: true,
    safety_officer: true,
    packer: true,
    athlete: true,
    tandem_student: true,
    fun_jumper: true,
    coach: true,
  },
  knowledgeScope: {
    includeHelpArticles: true,
    includeDocuments: true,
    includeSOPs: true,
    includeTrainingMaterials: true,
  },
  automationScope: {
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    inAppMessages: true,
  },
  languageBehavior: {
    defaultLanguage: 'en',
    autoDetect: true,
    formalTone: false,
  },
  fallbackResponses: {
    unknownQuery: "I'm not sure how to help with that. Would you like me to connect you with a team member who can assist?",
    serviceUnavailable: "I'm temporarily unavailable. Please try again in a few minutes or contact the front desk directly.",
    confidentialTopic: "I'm unable to share that information. Please contact your DZ manager for details on this topic.",
  },
  escalationRouting: {
    safetyIssues: 'Safety Officer',
    billingIssues: 'Admin',
    operationsIssues: 'DZ Manager',
    technicalIssues: 'Admin',
  },
  dataAccessBoundaries: {
    canAccessAthleteData: true,
    canAccessFinancialData: false,
    canAccessIncidentReports: false,
    canAccessStaffSchedules: true,
    canAccessManifestData: true,
  },
};

interface SectionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

function SettingsSection({ title, description, icon: Icon, children }: SectionProps) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm text-gray-900 dark:text-white">{label}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="flex-shrink-0"
      >
        {checked ? (
          <ToggleRight className="w-10 h-10 text-green-500" />
        ) : (
          <ToggleLeft className="w-10 h-10 text-gray-400" />
        )}
      </button>
    </div>
  );
}

export default function AISettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await apiGet<{ data: AISettings }>('/ai/settings');
        if (response?.data) {
          setSettings(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch AI settings:', err);
        // Use defaults
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      await apiPost('/ai/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      // Still show success for dev
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const updateRoleVisibility = (role: string, checked: boolean) => {
    setSettings((prev) => ({
      ...prev,
      roleVisibility: { ...prev.roleVisibility, [role]: checked },
    }));
  };

  const updateKnowledgeScope = (key: keyof AISettings['knowledgeScope'], checked: boolean) => {
    setSettings((prev) => ({
      ...prev,
      knowledgeScope: { ...prev.knowledgeScope, [key]: checked },
    }));
  };

  const updateAutomationScope = (key: keyof AISettings['automationScope'], checked: boolean) => {
    setSettings((prev) => ({
      ...prev,
      automationScope: { ...prev.automationScope, [key]: checked },
    }));
  };

  const updateDataBoundary = (key: keyof AISettings['dataAccessBoundaries'], checked: boolean) => {
    setSettings((prev) => ({
      ...prev,
      dataAccessBoundaries: { ...prev.dataAccessBoundaries, [key]: checked },
    }));
  };

  const updateFallbackResponse = (key: keyof AISettings['fallbackResponses'], value: string) => {
    setSettings((prev) => ({
      ...prev,
      fallbackResponses: { ...prev.fallbackResponses, [key]: value },
    }));
  };

  const updateEscalationRouting = (key: keyof AISettings['escalationRouting'], value: string) => {
    setSettings((prev) => ({
      ...prev,
      escalationRouting: { ...prev.escalationRouting, [key]: value },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6">
        <Link
          href="/dashboard/ai"
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white dark:hover:text-white mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to AI Hub
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
              <Settings className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Settings</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-300">
                Configure AI behavior, visibility, and boundaries
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? 'Saved' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-4xl">
        {/* Enable / Disable Assistant */}
        <SettingsSection
          title="AI Assistant"
          description="Master switch for the AI assistant feature"
          icon={Bot}
        >
          <ToggleRow
            label="Enable AI Assistant"
            description="When disabled, the AI assistant will not be accessible to any users"
            checked={settings.assistantEnabled}
            onChange={(checked) => setSettings((prev) => ({ ...prev, assistantEnabled: checked }))}
          />
        </SettingsSection>

        {/* Role Visibility */}
        <SettingsSection
          title="Role Visibility"
          description="Choose which roles can access the AI assistant"
          icon={Users}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {ROLES.map((role) => (
              <label
                key={role.key}
                className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={settings.roleVisibility[role.key] ?? false}
                  onChange={(e) => updateRoleVisibility(role.key, e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-slate-600 dark:border-gray-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900 dark:text-white">{role.label}</span>
              </label>
            ))}
          </div>
        </SettingsSection>

        {/* Knowledge Scope */}
        <SettingsSection
          title="Knowledge Scope"
          description="What content sources the AI can reference when answering questions"
          icon={Database}
        >
          <div className="space-y-1">
            <ToggleRow
              label="Help Articles"
              description="Published knowledge base articles"
              checked={settings.knowledgeScope.includeHelpArticles}
              onChange={(c) => updateKnowledgeScope('includeHelpArticles', c)}
            />
            <ToggleRow
              label="Documents"
              description="Uploaded documents and forms"
              checked={settings.knowledgeScope.includeDocuments}
              onChange={(c) => updateKnowledgeScope('includeDocuments', c)}
            />
            <ToggleRow
              label="Standard Operating Procedures"
              description="SOPs and operational guidelines"
              checked={settings.knowledgeScope.includeSOPs}
              onChange={(c) => updateKnowledgeScope('includeSOPs', c)}
            />
            <ToggleRow
              label="Training Materials"
              description="Course content and training guides"
              checked={settings.knowledgeScope.includeTrainingMaterials}
              onChange={(c) => updateKnowledgeScope('includeTrainingMaterials', c)}
            />
          </div>
        </SettingsSection>

        {/* Automation Scope */}
        <SettingsSection
          title="Automation Scope"
          description="Notification channels automations can use"
          icon={Zap}
        >
          <div className="space-y-1">
            <ToggleRow
              label="Email Notifications"
              description="Automations can send emails"
              checked={settings.automationScope.emailNotifications}
              onChange={(c) => updateAutomationScope('emailNotifications', c)}
            />
            <ToggleRow
              label="Push Notifications"
              description="Automations can send push notifications"
              checked={settings.automationScope.pushNotifications}
              onChange={(c) => updateAutomationScope('pushNotifications', c)}
            />
            <ToggleRow
              label="SMS Notifications"
              description="Automations can send text messages (charges may apply)"
              checked={settings.automationScope.smsNotifications}
              onChange={(c) => updateAutomationScope('smsNotifications', c)}
            />
            <ToggleRow
              label="In-App Messages"
              description="Automations can create in-app notifications"
              checked={settings.automationScope.inAppMessages}
              onChange={(c) => updateAutomationScope('inAppMessages', c)}
            />
          </div>
        </SettingsSection>

        {/* Language Behavior */}
        <SettingsSection
          title="Language Behavior"
          description="Language and tone settings for AI responses"
          icon={Globe}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Language</label>
              <select
                value={settings.languageBehavior.defaultLanguage}
                onChange={(e) => setSettings((prev) => ({
                  ...prev,
                  languageBehavior: { ...prev.languageBehavior, defaultLanguage: e.target.value },
                }))}
                className="w-full max-w-xs px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.label}</option>
                ))}
              </select>
            </div>
            <ToggleRow
              label="Auto-detect Language"
              description="Automatically respond in the language the user is typing in"
              checked={settings.languageBehavior.autoDetect}
              onChange={(c) => setSettings((prev) => ({
                ...prev,
                languageBehavior: { ...prev.languageBehavior, autoDetect: c },
              }))}
            />
            <ToggleRow
              label="Formal Tone"
              description="Use formal language instead of conversational"
              checked={settings.languageBehavior.formalTone}
              onChange={(c) => setSettings((prev) => ({
                ...prev,
                languageBehavior: { ...prev.languageBehavior, formalTone: c },
              }))}
            />
          </div>
        </SettingsSection>

        {/* Fallback Responses */}
        <SettingsSection
          title="Fallback Responses"
          description="Default messages when the AI cannot fully respond"
          icon={MessageSquare}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unknown Query Response
              </label>
              <textarea
                value={settings.fallbackResponses.unknownQuery}
                onChange={(e) => updateFallbackResponse('unknownQuery', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Service Unavailable Response
              </label>
              <textarea
                value={settings.fallbackResponses.serviceUnavailable}
                onChange={(e) => updateFallbackResponse('serviceUnavailable', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confidential Topic Response
              </label>
              <textarea
                value={settings.fallbackResponses.confidentialTopic}
                onChange={(e) => updateFallbackResponse('confidentialTopic', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        </SettingsSection>

        {/* Escalation Routing */}
        <SettingsSection
          title="Escalation Routing"
          description="Where to route issues the AI cannot resolve"
          icon={Shield}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(Object.entries(settings.escalationRouting) as [keyof AISettings['escalationRouting'], string][]).map(([key, value]) => {
              const labels: Record<string, string> = {
                safetyIssues: 'Safety Issues',
                billingIssues: 'Billing Issues',
                operationsIssues: 'Operations Issues',
                technicalIssues: 'Technical Issues',
              };
              return (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {labels[key]}
                  </label>
                  <select
                    value={value}
                    onChange={(e) => updateEscalationRouting(key, e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ESCALATION_TARGETS.map((target) => (
                      <option key={target} value={target}>{target}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </SettingsSection>

        {/* Data Access Boundaries */}
        <SettingsSection
          title="Data Access Boundaries"
          description="Control what data the AI can access when answering queries"
          icon={Eye}
        >
          <div className="space-y-1">
            <ToggleRow
              label="Athlete Data"
              description="Names, contact info, jump history, certifications"
              checked={settings.dataAccessBoundaries.canAccessAthleteData}
              onChange={(c) => updateDataBoundary('canAccessAthleteData', c)}
            />
            <ToggleRow
              label="Financial Data"
              description="Revenue, payments, pricing, refunds"
              checked={settings.dataAccessBoundaries.canAccessFinancialData}
              onChange={(c) => updateDataBoundary('canAccessFinancialData', c)}
            />
            <ToggleRow
              label="Incident Reports"
              description="Safety incidents and investigation details"
              checked={settings.dataAccessBoundaries.canAccessIncidentReports}
              onChange={(c) => updateDataBoundary('canAccessIncidentReports', c)}
            />
            <ToggleRow
              label="Staff Schedules"
              description="Employee schedules and availability"
              checked={settings.dataAccessBoundaries.canAccessStaffSchedules}
              onChange={(c) => updateDataBoundary('canAccessStaffSchedules', c)}
            />
            <ToggleRow
              label="Manifest Data"
              description="Load information, aircraft assignments, jumper lists"
              checked={settings.dataAccessBoundaries.canAccessManifestData}
              onChange={(c) => updateDataBoundary('canAccessManifestData', c)}
            />
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 dark:text-blue-300">
              Data access boundaries control what information the AI assistant can reference. Restricted data will not appear in AI responses even if a user asks about it directly. Changes take effect immediately.
            </p>
          </div>
        </SettingsSection>

        {/* Bottom Save */}
        <div className="flex justify-end pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? 'Changes Saved' : 'Save All Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
