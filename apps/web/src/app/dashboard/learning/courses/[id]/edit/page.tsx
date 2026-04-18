'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiPatch } from '@/lib/api';
import Link from 'next/link';
import { ChevronLeft, Save } from 'lucide-react';

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

export default function EditCoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [form, setForm] = useState<CourseForm>({
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
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function fetchCourse() {
      try {
        const res = await apiGet<{ success: boolean; data: any }>(`/learning/courses/${courseId}`);
        if (res.success && res.data) {
          const c = res.data;
          setForm({
            title: c.title || '',
            description: c.description || '',
            shortDescription: c.shortDescription || '',
            category: c.category || 'General',
            level: c.level || 'ALL_LEVELS',
            accessType: c.accessType || 'FREE',
            visibility: c.visibility || 'PUBLIC',
            coverImageUrl: c.coverImageUrl || '',
            estimatedDuration: c.estimatedDuration || '',
            isFeatured: c.isFeatured || false,
          });
        }
      } catch {
        setError('Failed to load course.');
      } finally {
        setLoading(false);
      }
    }
    fetchCourse();
  }, [courseId]);

  const updateField = (field: keyof CourseForm, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        ...form,
        estimatedDuration: form.estimatedDuration === '' ? null : Number(form.estimatedDuration),
      };
      await apiPatch(`/learning/courses/${courseId}`, payload);
      setSuccess('Course updated successfully.');
    } catch (err: any) {
      setError(err?.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/learning/courses/${courseId}`}
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Course</h1>
        </div>
        <Link
          href={`/dashboard/learning/courses/${courseId}`}
          className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          Back to Course
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
          {success}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Short Description</label>
          <input
            type="text"
            value={form.shortDescription}
            onChange={(e) => updateField('shortDescription', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
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
            min={0}
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="editFeatured"
            checked={form.isFeatured}
            onChange={(e) => updateField('isFeatured', e.target.checked)}
            className="w-4 h-4 text-[#1B4F72] border-gray-300 dark:border-slate-600 rounded focus:ring-[#1B4F72]"
          />
          <label htmlFor="editFeatured" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Feature this course
          </label>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={handleSave}
            disabled={saving || !form.title.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-[#1B4F72] text-white rounded-lg hover:bg-[#164063] transition-colors text-sm font-medium disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
