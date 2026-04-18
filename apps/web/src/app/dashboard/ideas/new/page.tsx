'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Lightbulb } from 'lucide-react';
import { apiPost } from '@/lib/api';

const CATEGORIES = [
  { value: 'safety', label: 'Safety' },
  { value: 'ops', label: 'Operations' },
  { value: 'coaching', label: 'Coaching' },
  { value: 'athlete', label: 'Athlete Experience' },
  { value: 'finance', label: 'Finance' },
  { value: 'offline', label: 'Offline Features' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'ux', label: 'User Experience' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low - Nice to have' },
  { value: 'medium', label: 'Medium - Would be useful' },
  { value: 'high', label: 'High - Important improvement' },
  { value: 'critical', label: 'Critical - Blocks workflows' },
];

const MODULES = [
  { value: 'manifest', label: 'Manifest' },
  { value: 'checkin', label: 'Check-in' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'gear', label: 'Gear Management' },
  { value: 'safety', label: 'Safety' },
  { value: 'reports', label: 'Reports' },
  { value: 'offline', label: 'Offline Mode' },
  { value: 'other', label: 'Other' },
];

export default function SubmitIdeaPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'ux',
    priority: 'medium',
    module: 'other',
    tags: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiPost('/ideas', formData);

      router.push('/dashboard/ideas');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit idea');
    } finally {
      setLoading(false);
    }
  };

  const isValid = formData.title.trim() && formData.description.trim();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6">
        <Link
          href="/dashboard/ideas"
          className="flex items-center gap-2 text-[#2E86C1] hover:text-[#1B4F72] mb-4 font-semibold"
        >
          <ChevronLeft size={20} />
          Back to Ideas
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Lightbulb size={32} className="text-[#2E86C1]" />
          Submit an Idea
        </h1>
        <p className="text-gray-600 dark:text-gray-400 dark:text-gray-300 mt-2">Help us improve SkyLara with your feedback</p>
      </div>

      <div className="p-8 max-w-4xl mx-auto">
        <div className="grid grid-cols-3 gap-8">
          {/* Form */}
          <form onSubmit={handleSubmit} className="col-span-2 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {/* Title */}
            <div className="mb-6">
              <label htmlFor="title" className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Idea Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="E.g., Dark mode for night operations"
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E86C1] focus:border-transparent"
                maxLength={100}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formData.title.length}/100 characters
              </p>
            </div>

            {/* Description */}
            <div className="mb-6">
              <label htmlFor="description" className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your idea in detail. What problem does it solve? How would it help?"
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E86C1] focus:border-transparent"
                maxLength={1000}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formData.description.length}/1000 characters
              </p>
            </div>

            {/* Category */}
            <div className="mb-6">
              <label htmlFor="category" className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Category *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E86C1] focus:border-transparent bg-white dark:bg-slate-800"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div className="mb-6">
              <label htmlFor="priority" className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Priority *
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E86C1] focus:border-transparent bg-white dark:bg-slate-800"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Module */}
            <div className="mb-6">
              <label htmlFor="module" className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Affected Module *
              </label>
              <select
                id="module"
                name="module"
                value={formData.module}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E86C1] focus:border-transparent bg-white dark:bg-slate-800"
              >
                {MODULES.map((mod) => (
                  <option key={mod.value} value={mod.value}>
                    {mod.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div className="mb-8">
              <label htmlFor="tags" className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Tags (optional)
              </label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="Separate with commas: performance, mobile, accessibility"
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E86C1] focus:border-transparent"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!isValid || loading}
                className="flex-1 px-4 py-3 bg-[#2E86C1] text-white rounded-lg hover:bg-[#1B4F72] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Idea'}
              </button>
              <Link
                href="/dashboard/ideas"
                className="px-4 py-3 bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                Cancel
              </Link>
            </div>
          </form>

          {/* Preview Panel */}
          <div className="col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6 sticky top-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Preview</h3>

              <div className="space-y-4">
                {formData.title && (
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide font-semibold mb-1">
                      Title
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white">{formData.title}</p>
                  </div>
                )}

                {formData.description && (
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide font-semibold mb-1">
                      Description
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-3">
                      {formData.description}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide font-semibold mb-2">
                    Meta
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {CATEGORIES.find((c) => c.value === formData.category)?.label}
                    </span>
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded capitalize">
                      {formData.priority}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-slate-700 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Once submitted, your idea will be reviewed by the SkyLara team.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
