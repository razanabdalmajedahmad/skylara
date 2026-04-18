'use client';

import { useState } from 'react';
import { API_BASE_URL } from '@/lib/constants';
import {
  MapPin,
  Phone,
  Mail,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`${API_BASE_URL}/public/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || 'Failed to send message');
      }
      setSuccess(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Contact Us</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-10">Have a question? We would love to hear from you.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Contact Info */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Address</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Contact the dropzone for address details</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                <Phone className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Phone</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Contact the dropzone for phone details</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <Mail className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Email</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Contact the dropzone for email details</p>
              </div>
            </div>
          </div>

          {/* Map Placeholder */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 h-56 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400 dark:text-gray-500">Map will be displayed here</p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Send a Message</h2>

          {success && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-sm text-green-700 dark:text-green-400 mb-4">
              <CheckCircle className="w-4 h-4 shrink-0" /> Message sent successfully. We will get back to you soon.
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
              <input
                type="text"
                required
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
