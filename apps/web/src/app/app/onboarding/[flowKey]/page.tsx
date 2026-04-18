'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api';
import {
  CheckCircle2, Loader2, ChevronLeft, ChevronRight, Upload, FileText,
  Shield, User, Phone, Heart, Camera, Award, ClipboardCheck, AlertTriangle,
  BadgeCheck, Zap, SkipForward,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FlowConfig {
  templateId: string;
  name: string;
  description: string;
  category: string;
  steps: FlowStep[];
  prefilled: Record<string, any>;
  completedSteps: string[];
  smartRouteMessage: string | null;
}

interface FlowStep {
  key: string;
  label: string;
  type: string;
  required: boolean;
  alreadyCompleted: boolean;
  skippable: boolean;
  fields?: FieldConfig[];
}

interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'select' | 'checkbox' | 'textarea' | 'file' | 'date';
  required: boolean;
  options?: string[];
  placeholder?: string;
  prefilled?: string;
}

// ---------------------------------------------------------------------------
// Step icon
// ---------------------------------------------------------------------------

function stepIcon(type: string) {
  switch (type) {
    case 'FORM': return <User className="w-5 h-5" />;
    case 'LICENSE_UPLOAD': case 'DOCUMENT_UPLOAD': return <FileText className="w-5 h-5" />;
    case 'GEAR_INFO': return <Shield className="w-5 h-5" />;
    case 'EMERGENCY_CONTACT': return <Phone className="w-5 h-5" />;
    case 'WAIVER_SIGN': return <ClipboardCheck className="w-5 h-5" />;
    case 'ACKNOWLEDGEMENT': return <CheckCircle2 className="w-5 h-5" />;
    case 'SKILL_ASSESSMENT': return <Award className="w-5 h-5" />;
    case 'INTEREST_SURVEY': return <Heart className="w-5 h-5" />;
    case 'MEDICAL_DECLARATION': return <Heart className="w-5 h-5" />;
    case 'REVIEW': return <FileText className="w-5 h-5" />;
    default: return <FileText className="w-5 h-5" />;
  }
}

// ---------------------------------------------------------------------------
// Internal Onboarding Flow Page
// ---------------------------------------------------------------------------

export default function InternalOnboardingPage() {
  const params = useParams<{ flowKey: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [flow, setFlow] = useState<FlowConfig | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, Record<string, any>>>({});
  const [submitted, setSubmitted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFlow() {
      setLoadError(null);
      try {
        const data = await apiGet<FlowConfig>(`/onboarding/internal/${params.flowKey}`);
        // Skip to first non-completed step
        const firstIncomplete = data.steps.findIndex((s) => !s.alreadyCompleted);
        setCurrentStep(firstIncomplete >= 0 ? firstIncomplete : 0);

        // Pre-fill form data from profile
        if (data.prefilled) {
          Object.entries(data.prefilled).forEach(([k, v]) => {
            if (v) setFormData((prev) => ({ ...prev, 'personal-info': { ...(prev['personal-info'] || {}), [k]: v } }));
          });
        }

        setFlow(data);
      } catch {
        setFlow(null);
        setLoadError(
          'This onboarding flow could not be loaded. Ensure an active template exists for your dropzone or contact staff.'
        );
      }
      setLoading(false);
    }
    loadFlow();
  }, [params.flowKey, user]);

  const updateField = useCallback((stepKey: string, fieldKey: string, value: any) => {
    setFormData((prev) => ({ ...prev, [stepKey]: { ...(prev[stepKey] || {}), [fieldKey]: value } }));
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await apiPost(`/onboarding/internal/${params.flowKey}/submit`, formData);
      setSubmitted(true);
    } catch {
      setError('Submission failed. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center"><Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" /><p className="mt-3 text-sm text-gray-500">Loading your onboarding flow...</p></div>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="mt-3 text-gray-700 dark:text-gray-300 font-medium">Onboarding flow not available</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{loadError || 'No template was found for this flow.'}</p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="mt-6 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">Onboarding Complete!</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Your {flow.name} has been submitted successfully.</p>
          <button onClick={() => router.push('/dashboard')} className="mt-6 px-6 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go to Dashboard</button>
        </div>
      </div>
    );
  }

  const step = flow.steps[currentStep];
  const totalSteps = flow.steps.length;
  const isLastStep = currentStep === totalSteps - 1;
  const completedCount = flow.steps.filter((s) => s.alreadyCompleted || formData[s.key]).length;
  const progress = Math.round(((currentStep + 1) / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">{flow.name}</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">{flow.description}</p>
            </div>
            <span className="text-sm text-gray-400">Step {currentStep + 1} of {totalSteps}</span>
          </div>
          <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Smart route message */}
      {flow.smartRouteMessage && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-3">
            <Zap className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Smart Routing Applied</p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">{flow.smartRouteMessage}</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Step sidebar */}
          <div className="hidden lg:block w-56 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sticky top-24">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Steps</p>
              <ul className="space-y-1">
                {flow.steps.map((s, i) => {
                  const isActive = i === currentStep;
                  const isDone = s.alreadyCompleted || i < currentStep;
                  return (
                    <li key={s.key}>
                      <button onClick={() => (isDone || i <= currentStep) && setCurrentStep(i)} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors text-left ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium' : isDone ? 'text-green-700 dark:text-green-400' : 'text-gray-400'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${s.alreadyCompleted ? 'bg-green-500 text-white' : isActive ? 'bg-blue-600 text-white' : isDone ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                          {s.alreadyCompleted || isDone ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                        </div>
                        <span className="truncate">{s.label}</span>
                        {s.alreadyCompleted && <SkipForward className="w-3 h-3 text-green-500 ml-auto flex-shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 max-w-2xl">
            {/* Already completed notice */}
            {step.alreadyCompleted && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-green-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">Already completed</p>
                  <p className="text-xs text-green-600 dark:text-green-400">This step was completed from your existing profile. You can skip it or review.</p>
                </div>
                <button onClick={() => setCurrentStep((s) => Math.min(totalSteps - 1, s + 1))} className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700">Skip</button>
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">{stepIcon(step.type)}</div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{step.label}</h2>
              </div>

              {/* Step content by type */}
              {step.type === 'WAIVER_SIGN' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 max-h-48 overflow-y-auto text-sm text-gray-700 dark:text-gray-300">
                    <h3 className="font-bold mb-2">Liability Release and Assumption of Risk</h3>
                    <p className="mb-2">I understand that skydiving involves inherent risks including serious injury or death. I voluntarily assume all risks.</p>
                    <p>I release and hold harmless this dropzone, its officers, employees, and instructors from any liability.</p>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={!!formData[step.key]?.agreed} onChange={(e) => updateField(step.key, 'agreed', e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">I agree to the terms above</span>
                  </label>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Signature (type full name)</label>
                    <input type="text" value={formData[step.key]?.signature || ''} onChange={(e) => updateField(step.key, 'signature', e.target.value)} placeholder="Type your full legal name" className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-lg font-serif italic bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              ) : step.type === 'ACKNOWLEDGEMENT' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <h3 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">Local Rules & DZ Standards</h3>
                    <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                      <li>Check in at manifest before every jump</li>
                      <li>Follow the designated landing pattern</li>
                      <li>Gear checks required for all visiting jumpers</li>
                      <li>No swooping on main landing area</li>
                      <li>Report any incidents immediately</li>
                    </ul>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={!!formData[step.key]?.acknowledged} onChange={(e) => updateField(step.key, 'acknowledged', e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">I acknowledge and agree to follow all local rules</span>
                  </label>
                </div>
              ) : step.type === 'REVIEW' ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Review your information before submitting.</p>
                  {Object.entries(formData).map(([stepKey, fields]) => (
                    <div key={stepKey} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">{stepKey.replace(/-/g, ' ')}</h4>
                      {Object.entries(fields).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-sm py-1">
                          <span className="text-gray-600 dark:text-gray-400">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="text-gray-900 dark:text-white font-medium">{typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v || '-')}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {(step.fields || []).map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      {field.type === 'select' ? (
                        <select value={formData[step.key]?.[field.key] || ''} onChange={(e) => updateField(step.key, field.key, e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500">
                          <option value="">Select...</option>
                          {(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea value={formData[step.key]?.[field.key] || ''} onChange={(e) => updateField(step.key, field.key, e.target.value)} placeholder={field.placeholder} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
                      ) : field.type === 'checkbox' ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={!!formData[step.key]?.[field.key]} onChange={(e) => updateField(step.key, field.key, e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{field.label}</span>
                        </label>
                      ) : field.type === 'file' ? (
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-blue-400 transition-colors cursor-pointer">
                          <Upload className="w-6 h-6 text-gray-400 mx-auto" />
                          <p className="text-sm text-gray-500 mt-1">Click or drag to upload</p>
                        </div>
                      ) : (
                        <input type={field.type} value={formData[step.key]?.[field.key] || field.prefilled || ''} onChange={(e) => updateField(step.key, field.key, e.target.value)} placeholder={field.placeholder} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Error banner */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => setCurrentStep((s) => Math.max(0, s - 1))} disabled={currentStep === 0} className={`flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${currentStep === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                {isLastStep ? (
                  <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {submitting ? 'Submitting...' : 'Submit'}
                  </button>
                ) : (
                  <button onClick={() => setCurrentStep((s) => Math.min(totalSteps - 1, s + 1))} className="flex items-center gap-1 px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
