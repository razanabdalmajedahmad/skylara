'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';

export default function NewIncidentPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    type: 'Equipment',
    severity: 'MEDIUM',
    description: '',
    affectedAthletes: '',
    witnesses: '',
    actionTaken: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiPost('/incidents', {
        type: formData.type,
        severity: formData.severity,
        description: formData.description,
        affectedAthletes: formData.affectedAthletes,
        witnesses: formData.witnesses,
        actionTaken: formData.actionTaken,
      });
      router.push('/dashboard/incidents');
    } catch (error) {
      console.error('Failed to submit incident:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white dark:text-gray-100">Report Incident</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Document safety events and operational issues</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 shadow-sm p-6">
          {/* Type */}
          <div className="mb-6">
            <label htmlFor="type" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Incident Type
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option>Equipment</option>
              <option>Medical</option>
              <option>Weather</option>
              <option>Aircraft</option>
              <option>Procedural</option>
              <option>Other</option>
            </select>
          </div>

          {/* Severity */}
          <div className="mb-6">
            <label htmlFor="severity" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Severity Level
            </label>
            <select
              id="severity"
              name="severity"
              value={formData.severity}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={5}
              placeholder="Provide detailed description of the incident..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Affected Athletes */}
          <div className="mb-6">
            <label htmlFor="affectedAthletes" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Affected Athletes
            </label>
            <input
              id="affectedAthletes"
              type="text"
              name="affectedAthletes"
              value={formData.affectedAthletes}
              onChange={handleChange}
              placeholder="Names or IDs of affected athletes (comma-separated)"
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Witnesses */}
          <div className="mb-6">
            <label htmlFor="witnesses" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Witnesses
            </label>
            <input
              id="witnesses"
              type="text"
              name="witnesses"
              value={formData.witnesses}
              onChange={handleChange}
              placeholder="Names or IDs of witnesses (comma-separated)"
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Taken */}
          <div className="mb-6">
            <label htmlFor="actionTaken" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Action Taken
            </label>
            <textarea
              id="actionTaken"
              name="actionTaken"
              value={formData.actionTaken}
              onChange={handleChange}
              rows={3}
              placeholder="What immediate actions were taken in response to this incident?"
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Incident Report'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
