'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import Link from 'next/link';
import { FileText, ArrowLeft, Save, Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WAIVER_TYPES = [
  { value: 'TANDEM', label: 'Tandem' },
  { value: 'AFF', label: 'AFF' },
  { value: 'EXPERIENCED', label: 'Experienced' },
  { value: 'MINOR', label: 'Minor' },
  { value: 'SPECTATOR', label: 'Spectator' },
  { value: 'MEDIA', label: 'Media' },
] as const;

const AUDIENCE_TYPES = [
  { value: 'internal_user', label: 'Internal', desc: 'Staff and registered jumpers' },
  { value: 'external_guest', label: 'External', desc: 'Walk-in guests and visitors' },
  { value: 'both', label: 'Both', desc: 'All participants' },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewWaiverTemplatePage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [waiverType, setWaiverType] = useState('TANDEM');
  const [description, setDescription] = useState('');
  const [audienceType, setAudienceType] = useState('both');
  const [requireMinor, setRequireMinor] = useState(false);
  const [requireMedical, setRequireMedical] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTitleChange = useCallback(
    (value: string) => {
      setTitle(value);
      if (!slugTouched) {
        setSlug(generateSlug(value));
      }
    },
    [slugTouched],
  );

  const handleSlugChange = useCallback((value: string) => {
    setSlugTouched(true);
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  }, []);

  const isValid =
    title.trim().length >= 3 &&
    title.trim().length <= 255 &&
    slug.length >= 2 &&
    slug.length <= 100 &&
    /^[a-z0-9-]+$/.test(slug);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await apiPost<{ id: string | number }>('/waivers/templates', {
        title: title.trim(),
        waiverType,
        slug,
        description: description.trim() || undefined,
        audienceType,
        requireMinor,
        requireMedical,
      });
      router.push(`/dashboard/waivers/templates/${result.id}/builder`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create template. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/waivers"
              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                New Waiver Template
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error banner */}
          {error && (
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Title & Type */}
          <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Basic Information
            </h2>

            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Tandem Skydive Liability Waiver"
                minLength={3}
                maxLength={255}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Waiver Type */}
            <div>
              <label
                htmlFor="waiverType"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Waiver Type
              </label>
              <select
                id="waiverType"
                value={waiverType}
                onChange={(e) => setWaiverType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                {WAIVER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Slug */}
            <div>
              <label
                htmlFor="slug"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Slug
              </label>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="tandem-skydive-liability-waiver"
                minLength={2}
                maxLength={100}
                pattern="^[a-z0-9-]+$"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-800 text-sm text-gray-900 dark:text-white font-mono placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                URL-friendly identifier. Lowercase letters, numbers, and hyphens only.
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Description
            </h2>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of this waiver template..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
          </div>

          {/* Audience Type */}
          <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Audience
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {AUDIENCE_TYPES.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAudienceType(a.value)}
                  className={`p-3 rounded-xl border-2 text-center transition-colors ${
                    audienceType === a.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                      : 'border-gray-200 dark:border-slate-700 dark:border-gray-700 hover:border-gray-300 dark:border-slate-600 dark:hover:border-gray-600'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {a.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {a.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Requirements */}
          <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Requirements
            </h2>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requireMinor}
                onChange={(e) => setRequireMinor(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-slate-600 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Minor consent required
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Require parent or guardian signature for participants under 18.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requireMedical}
                onChange={(e) => setRequireMedical(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-slate-600 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Medical disclosure required
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Include a medical questionnaire section in the waiver.
                </p>
              </div>
            </label>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/dashboard/waivers"
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!isValid || submitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {submitting ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
