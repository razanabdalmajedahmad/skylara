'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, getAuthToken } from '@/lib/api';
import {
  Loader2,
  User,
  FileCheck,
  Upload,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface OnboardingStatus {
  currentStep: number;
  profileComplete: boolean;
  waiversSigned: boolean;
  documentsUploaded: boolean;
  readyToJump: boolean;
}

const STEPS = [
  { label: 'Profile', icon: User, description: 'Complete your personal information' },
  { label: 'Waivers', icon: FileCheck, description: 'Review and sign required waivers' },
  { label: 'Documents', icon: Upload, description: 'Upload identification and certifications' },
  { label: 'Ready', icon: CheckCircle, description: 'You are all set to start jumping' },
];

export default function AthleteOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile form
  const [profile, setProfile] = useState({ name: '', phone: '', emergencyContact: '', emergencyPhone: '' });

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const fetchStatus = async () => {
      try {
        const res = await apiGet<{ success: boolean; data: OnboardingStatus }>('/account/onboarding/status');
        const data = res.data;
        setStatus(data);
        setStep(data.currentStep || 0);
      } catch (err: any) {
        if (err.status === 401) {
          router.replace('/login');
          return;
        }
        setError(err.message || 'Failed to load onboarding status');
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, [router]);

  const handleProfileSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiPost('/account/onboarding/profile', profile);
      setStatus((prev) => prev ? { ...prev, profileComplete: true, currentStep: 1 } : prev);
      setStep(1);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleWaiverSign = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiPost('/account/onboarding/waivers');
      setStatus((prev) => prev ? { ...prev, waiversSigned: true, currentStep: 2 } : prev);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to sign waivers');
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentsConfirm = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiPost('/account/onboarding/documents');
      setStatus((prev) => prev ? { ...prev, documentsUploaded: true, currentStep: 3 } : prev);
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm documents');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiPost('/account/onboarding/complete');
      router.push('/account');
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading onboarding...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome to SkyLara</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Complete your setup to start skydiving</p>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      isDone
                        ? 'bg-green-500 border-green-500 text-white'
                        : isActive
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400'
                    }`}
                  >
                    {isDone ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs mt-1.5 font-medium ${
                    isActive ? 'text-blue-600 dark:text-blue-400' : isDone ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all"
              style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400 mb-6">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{STEPS[step].label}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{STEPS[step].description}</p>

          {/* Step 0: Profile */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Emergency Contact Name</label>
                <input
                  type="text"
                  value={profile.emergencyContact}
                  onChange={(e) => setProfile({ ...profile, emergencyContact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Emergency Contact Phone</label>
                <input
                  type="tel"
                  value={profile.emergencyPhone}
                  onChange={(e) => setProfile({ ...profile, emergencyPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleProfileSave}
                disabled={saving || !profile.name}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Continue'}
              </button>
            </div>
          )}

          {/* Step 1: Waivers */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Liability Waiver</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  By signing this waiver, you acknowledge the inherent risks involved in skydiving activities
                  and agree to the terms and conditions of participation. You must read and agree to the full
                  waiver document before proceeding.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleWaiverSign}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                  {saving ? 'Signing...' : 'Sign Waiver and Continue'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Documents */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <Upload className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Upload your identification document</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Accepted: passport, driver license, government ID</p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer mt-4 transition-colors">
                  <Upload className="w-4 h-4" /> Choose File
                  <input type="file" className="hidden" accept="image/*,.pdf" />
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleDocumentsConfirm}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {saving ? 'Uploading...' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Ready */}
          {step === 3 && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">You are all set!</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Your profile is complete, waivers are signed, and documents are uploaded.
                You are ready to start your skydiving journey.
              </p>
              <button
                onClick={handleComplete}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {saving ? 'Finishing...' : 'Go to My Account'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
