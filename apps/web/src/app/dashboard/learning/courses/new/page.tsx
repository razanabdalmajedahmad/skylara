'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { ChevronLeft, ChevronRight, Check, BookOpen } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
  'AFF', 'Tandem', 'Freefly', 'Tracking', 'Angle',
  'Canopy', 'Coaching', 'Rigging', 'Pilot', 'Safety',
  'Operations', 'General',
];

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'];
const ACCESS_TYPES = ['FREE', 'PAID', 'SUBSCRIPTION'];
const VISIBILITIES = ['PUBLIC', 'PRIVATE', 'UNLISTED'];

interface CourseForm {
  title: string;
  description: string;
  shortDescription: string;
  category: string;
  level: string;
  accessType: string;
  visibility: string;
  coverImageUrl: string;
  estimatedDuration: number | '';
  isFeatured: boolean;
}

const INITIAL_FORM: CourseForm = {
  title: '',
  description: '',
  shortDescription: '',
  category: 'General',
  level: 'ALL_LEVELS',
  accessType: 'FREE',
  visibility: 'PUBLIC',
  coverImageUrl: '',
  estimatedDuration: '',
  isFeatured: false,
};

const STEPS = ['Basic Info', 'Access & Visibility', 'Review & Create'];

export default function NewCoursePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CourseForm>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const updateField = (field: keyof CourseForm, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    if (step === 0) return form.title.trim().length > 0;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...form,
        estimatedDuration: form.estimatedDuration === '' ? null : Number(form.estimatedDuration),
      };
      const res = await apiPost<{ success: boolean; data: { id: string } }>('/learning/courses', payload);
      if (res.success && res.data?.id) {
        router.push(`/dashboard/learning/courses/${res.data.id}`);
      } else {
        setError('Course created but could not redirect. Check the courses list.');
        router.push('/dashboard/learning/courses');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create course. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/learning/courses"
          className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Course</h1>
      </div>

      {/* Step Indicator */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((label, idx) => (
            <div key={label} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    idx < step
                      ? 'bg-green-500 text-white'
                      : idx === step
                      ? 'bg-[#1B4F72] text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {idx < step ? <Check className="w-4 h-4" /> : idx + 1}
                </div>
                <span
                  className={`text-sm font-medium hidden sm:inline ${
                    idx === step ? 'text-[#1B4F72]' : idx < step ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`w-12 h-0.5 ${idx < step ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        {/* Step 1: Basic Info */}
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
                placeholder="e.g. AFF Level 1 Ground School"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent resize-none"
                placeholder="Full course description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Short Description</label>
              <input
                type="text"
                value={form.shortDescription}
                onChange={(e) => updateField('shortDescription', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
                placeholder="Brief summary for course cards"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent bg-white dark:bg-slate-800"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Level</label>
                <select
                  value={form.level}
                  onChange={(e) => updateField('level', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent bg-white dark:bg-slate-800"
                >
                  {LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>{lvl.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Access & Visibility */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Access & Visibility</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Access Type</label>
                <select
                  value={form.accessType}
                  onChange={(e) => updateField('accessType', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent bg-white dark:bg-slate-800"
                >
                  {ACCESS_TYPES.map((at) => (
                    <option key={at} value={at}>{at}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Visibility</label>
                <select
                  value={form.visibility}
                  onChange={(e) => updateField('visibility', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent bg-white dark:bg-slate-800"
                >
                  {VISIBILITIES.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cover Image URL</label>
              <input
                type="text"
                value={form.coverImageUrl}
                onChange={(e) => updateField('coverImageUrl', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estimated Duration (minutes)</label>
              <input
                type="number"
                value={form.estimatedDuration}
                onChange={(e) => updateField('estimatedDuration', e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
                placeholder="e.g. 120"
                min={0}
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isFeatured"
                checked={form.isFeatured}
                onChange={(e) => updateField('isFeatured', e.target.checked)}
                className="w-4 h-4 text-[#1B4F72] border-gray-300 dark:border-slate-600 rounded focus:ring-[#1B4F72]"
              />
              <label htmlFor="isFeatured" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Feature this course on the learning homepage
              </label>
            </div>
          </div>
        )}

        {/* Step 3: Review & Create */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Review & Create</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Review the details below before creating your course.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ReviewField label="Title" value={form.title} />
              <ReviewField label="Category" value={form.category} />
              <ReviewField label="Level" value={form.level.replace('_', ' ')} />
              <ReviewField label="Access Type" value={form.accessType} />
              <ReviewField label="Visibility" value={form.visibility} />
              <ReviewField label="Estimated Duration" value={form.estimatedDuration ? `${form.estimatedDuration} min` : 'Not set'} />
              <ReviewField label="Featured" value={form.isFeatured ? 'Yes' : 'No'} />
              <ReviewField label="Cover Image" value={form.coverImageUrl || 'Not set'} />
            </div>

            {form.shortDescription && (
              <ReviewField label="Short Description" value={form.shortDescription} />
            )}
            {form.description && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Description</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                  {form.description}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="flex items-center gap-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-1 px-4 py-2 bg-[#1B4F72] text-white rounded-lg hover:bg-[#164063] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !form.title.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-[#1B4F72] text-white rounded-lg hover:bg-[#164063] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <BookOpen className="w-4 h-4" />
              )}
              {submitting ? 'Creating...' : 'Create Course'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{label}</p>
      <p className="text-sm text-gray-900 dark:text-white mt-0.5">{value}</p>
    </div>
  );
}
