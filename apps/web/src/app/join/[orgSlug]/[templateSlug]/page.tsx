'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import {
  CheckCircle2,
  Loader2,
  Upload,
  ChevronLeft,
  ChevronRight,
  FileText,
  Shield,
  AlertTriangle,
  User,
  Phone,
  Mail,
  Heart,
  Camera,
  Award,
  ClipboardCheck,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  orgName: string;
  orgLogo?: string;
  steps: StepInfo[];
  requireLogin: boolean;
  allowGuestMode: boolean;
}

interface StepInfo {
  key: string;
  label: string;
  description?: string;
  type: string;
  required: boolean;
  fields?: FieldConfig[];
}

interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'select' | 'checkbox' | 'textarea' | 'file' | 'date' | 'signature';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

// ---------------------------------------------------------------------------
// Step icon helper
// ---------------------------------------------------------------------------

function stepIcon(type: string) {
  switch (type) {
    case 'FORM': return <User className="w-5 h-5" />;
    case 'LICENSE_UPLOAD': return <Award className="w-5 h-5" />;
    case 'DOCUMENT_UPLOAD': return <FileText className="w-5 h-5" />;
    case 'GEAR_INFO': return <Shield className="w-5 h-5" />;
    case 'EMERGENCY_CONTACT': return <Phone className="w-5 h-5" />;
    case 'WAIVER_SIGN': return <ClipboardCheck className="w-5 h-5" />;
    case 'ACKNOWLEDGEMENT': return <CheckCircle2 className="w-5 h-5" />;
    case 'SKILL_ASSESSMENT': return <Award className="w-5 h-5" />;
    case 'INTEREST_SURVEY': return <Heart className="w-5 h-5" />;
    case 'REVIEW': return <FileText className="w-5 h-5" />;
    default: return <FileText className="w-5 h-5" />;
  }
}

// ---------------------------------------------------------------------------
// External Join Page
// ---------------------------------------------------------------------------

export default function JoinOnboardingPage() {
  const params = useParams<{ orgSlug: string; templateSlug: string }>();
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<TemplateInfo | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, Record<string, any>>>({});
  const [submitted, setSubmitted] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadTemplate() {
      try {
        const data = await apiGet<TemplateInfo>(
          `/onboarding/external/${params.orgSlug}/${params.templateSlug}`,
          { skipAuth: true }
        );
        setTemplate(data);
      } catch {
        setTemplate(null);
      }
      setLoading(false);
    }
    loadTemplate();
  }, [params.orgSlug, params.templateSlug]);

  const updateField = useCallback((stepKey: string, fieldKey: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [stepKey]: { ...(prev[stepKey] || {}), [fieldKey]: value },
    }));
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Flatten formData to extract top-level contact fields for the API
      const personalInfo = formData['personal-info'] || {};
      const payload = {
        ...formData,
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        email: personalInfo.email,
        phone: personalInfo.phone,
      };
      await apiPost(
        `/onboarding/external/${params.orgSlug}/${params.templateSlug}/submit`,
        payload,
        { skipAuth: true }
      );
      setSubmitted(true);
    } catch (err) {
      setError('Submission failed. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center"><Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" /><p className="mt-3 text-sm text-gray-500">Loading onboarding...</p></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center"><AlertTriangle className="w-10 h-10 text-red-400 mx-auto" /><p className="mt-3 text-gray-700">Onboarding link not found or expired.</p></div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Application Submitted!</h1>
          <p className="text-gray-600 mt-2">Thank you for completing your {template.name.toLowerCase()}. We will review your application and get back to you soon.</p>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800"><strong>{template.orgName}</strong> will review your submission. Check your email for updates.</p>
          </div>
        </div>
      </div>
    );
  }

  const step = template.steps[currentStep];
  const totalSteps = template.steps.length;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{template.orgName}</h1>
              <p className="text-sm text-gray-500">{template.name}</p>
            </div>
            <span className="text-sm text-gray-400">Step {currentStep + 1} of {totalSteps}</span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Step navigation sidebar for desktop */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Step list sidebar */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-24">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Steps</p>
              <ul className="space-y-1">
                {template.steps.map((s, i) => {
                  const isActive = i === currentStep;
                  const isDone = i < currentStep;
                  return (
                    <li key={s.key}>
                      <button onClick={() => i <= currentStep && setCurrentStep(i)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${isActive ? 'bg-blue-50 text-blue-700 font-medium' : isDone ? 'text-green-700 hover:bg-green-50' : 'text-gray-400'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${isActive ? 'bg-blue-600 text-white' : isDone ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                          {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                        </div>
                        <span className="truncate">{s.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 max-w-2xl">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">{stepIcon(step.type)}</div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{step.label}</h2>
                  {step.description && <p className="text-sm text-gray-500">{step.description}</p>}
                </div>
              </div>

              {/* Render fields based on step type */}
              {step.type === 'WAIVER_SIGN' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-64 overflow-y-auto text-sm text-gray-700 leading-relaxed">
                    <h3 className="font-bold mb-2">Liability Release and Assumption of Risk</h3>
                    <p className="mb-2">I, the undersigned, understand that skydiving and parachuting activities involve inherent risks including but not limited to serious injury or death. I voluntarily assume all risks associated with participating in these activities at {template.orgName}.</p>
                    <p className="mb-2">I release and hold harmless {template.orgName}, its officers, employees, agents, and instructors from any and all liability for injuries, losses, or damages arising from my participation in skydiving activities.</p>
                    <p>I confirm that I am physically fit to participate and have disclosed any medical conditions that may affect my ability to safely skydive.</p>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={!!formData[step.key]?.agreed} onChange={(e) => updateField(step.key, 'agreed', e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm font-medium text-gray-900">I have read, understand, and agree to the terms above</span>
                  </label>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Signature (type your full name)</label>
                    <input type="text" value={formData[step.key]?.signature || ''} onChange={(e) => updateField(step.key, 'signature', e.target.value)} placeholder="Type your full legal name" className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-serif italic focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                </div>
              ) : step.type === 'ACKNOWLEDGEMENT' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h3 className="font-medium text-yellow-800 mb-2">Local Rules & Procedures</h3>
                    <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                      <li>All jumpers must check in at manifest before jumping</li>
                      <li>Minimum break time between jumps: 30 minutes</li>
                      <li>Landing pattern: left-hand circuit</li>
                      <li>Gear checks required for all visiting jumpers</li>
                      <li>No swooping on main landing area</li>
                      <li>Report any incidents immediately to DZO</li>
                    </ul>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={!!formData[step.key]?.acknowledged} onChange={(e) => updateField(step.key, 'acknowledged', e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">I acknowledge and agree to follow all local rules and procedures</span>
                  </label>
                </div>
              ) : step.type === 'REVIEW' ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Review your information before submitting.</p>
                  {Object.entries(formData).map(([stepKey, fields]) => (
                    <div key={stepKey} className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">{stepKey.replace(/-/g, ' ')}</h4>
                      {Object.entries(fields).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-sm py-1">
                          <span className="text-gray-600">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="text-gray-900 font-medium">{typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v || '-')}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {(step.fields || []).map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      {field.type === 'select' ? (
                        <select value={formData[step.key]?.[field.key] || ''} onChange={(e) => updateField(step.key, field.key, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white">
                          <option value="">Select...</option>
                          {(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea value={formData[step.key]?.[field.key] || ''} onChange={(e) => updateField(step.key, field.key, e.target.value)} placeholder={field.placeholder} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
                      ) : field.type === 'checkbox' ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={!!formData[step.key]?.[field.key]} onChange={(e) => updateField(step.key, field.key, e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                          <span className="text-sm text-gray-700">{field.label}</span>
                        </label>
                      ) : field.type === 'file' ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors">
                          <Upload className="w-6 h-6 text-gray-400 mx-auto" />
                          <p className="text-sm text-gray-500 mt-1">Click or drag to upload</p>
                          <input type="file" className="hidden" onChange={(e) => updateField(step.key, field.key, e.target.files?.[0]?.name || '')} />
                        </div>
                      ) : (
                        <input type={field.type} value={formData[step.key]?.[field.key] || ''} onChange={(e) => updateField(step.key, field.key, e.target.value)} placeholder={field.placeholder} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Error banner */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100">
                <button onClick={() => setCurrentStep((s) => Math.max(0, s - 1))} disabled={currentStep === 0} className={`flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${currentStep === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                {isLastStep ? (
                  <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {submitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                ) : (
                  <button onClick={() => setCurrentStep((s) => Math.min(totalSteps - 1, s + 1))} className="flex items-center gap-1 px-4 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
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
