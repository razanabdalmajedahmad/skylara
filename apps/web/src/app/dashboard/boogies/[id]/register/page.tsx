'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle, Zap, MessageCircle, CalendarPlus, Share2, Users } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface FormField {
  field: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  profileMapped?: boolean;
}

export default function BoogieRegisterPage() {
  const params = useParams();
  const router = useRouter();
  const boogieId = params?.id as string;
  const { user } = useAuth();

  const [boogie, setBoogie] = useState<any>(null);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    async function load() {
      const [bRes, fRes] = await Promise.all([
        apiGet<{ success: boolean; data: any }>(`/boogies/${boogieId}`).catch(() => null),
        apiGet<{ success: boolean; data: any }>(`/boogies/${boogieId}/form-schema`).catch(() => null),
      ]);
      if (bRes?.data) setBoogie(bRes.data);

      const fields: FormField[] = Array.isArray(fRes?.data) && fRes.data.length > 0
        ? fRes.data
        : [
            { field: 'email', label: 'Email', type: 'email', required: true, profileMapped: true },
            { field: 'firstName', label: 'First Name', type: 'text', required: true, profileMapped: true },
            { field: 'lastName', label: 'Last Name', type: 'text', required: true, profileMapped: true },
            { field: 'numberOfJumps', label: 'Total Jumps', type: 'number', required: true, profileMapped: true },
            { field: 'licenseType', label: 'License', type: 'select', options: ['A', 'B', 'C', 'D', 'Student'], required: true },
            { field: 'termsAccepted', label: 'I accept the terms', type: 'checkbox', required: true },
          ];
      setFormFields(fields);

      // Prefill from logged-in user profile
      if (user) {
        const prefilled: Record<string, any> = {};
        if (user.email) prefilled.email = user.email;
        if (user.firstName) prefilled.firstName = user.firstName;
        if (user.lastName) prefilled.lastName = user.lastName;
        setFormData(prefilled);
      }
    }
    load();
  }, [boogieId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    for (const f of formFields) {
      if (f.required && !formData[f.field]) {
        setError(`${f.label} is required`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        email: formData.email || user?.email || '',
        firstName: formData.firstName || user?.firstName || '',
        lastName: formData.lastName || user?.lastName || '',
        phone: formData.phone,
        nationality: formData.nationality,
        homeDropzone: formData.homeDropzone,
        numberOfJumps: formData.numberOfJumps ? parseInt(formData.numberOfJumps) : undefined,
        tunnelTime: formData.tunnelTime ? parseInt(formData.tunnelTime) : undefined,
        licenseType: formData.licenseType,
        licenseNumber: formData.licenseNumber,
        aadConfirmed: formData.aadConfirmed === true || formData.aadConfirmed === 'true',
        gearOwnership: formData.gearOwnership,
        accommodationChoice: formData.accommodationChoice,
        jerseySize: formData.jerseySize,
        foodRestrictions: formData.foodRestrictions,
        emergencyContact: formData.emergencyContact,
        termsAccepted: formData.termsAccepted === true || formData.termsAccepted === 'true',
        waiverAccepted: formData.waiverAccepted === true || formData.waiverAccepted === 'true',
        notes: formData.notes,
        formData: formData,
      };

      const res = await apiPost<{ success: boolean; data: any }>(`/boogies/${boogieId}/registrations`, payload);
      if (res?.success) {
        setSubmitted(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!boogie) return <div className="p-8 text-center">Loading...</div>;

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Registration Submitted!</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Your registration for <strong>{boogie.title}</strong> has been received.</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {boogie.approvalMode === 'AUTO_APPROVE'
              ? 'You have been automatically approved. See you there!'
              : 'Your registration is pending review. We will notify you once approved.'}
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
            <button
              onClick={() => {
                // Generate iCalendar file
                const start = new Date(boogie.startDate).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
                const end = new Date(boogie.endDate).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
                const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${start}\nDTEND:${end}\nSUMMARY:${boogie.title}\nLOCATION:${boogie.city || ''}, ${boogie.country || ''}\nDESCRIPTION:${boogie.subtitle || boogie.title}\nEND:VEVENT\nEND:VCALENDAR`;
                const blob = new Blob([ics], { type: 'text/calendar' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `${boogie.title.replace(/\s+/g, '-')}.ics`; a.click();
                URL.revokeObjectURL(url);
              }}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <CalendarPlus className="h-5 w-5" /> Add to Calendar
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`I just registered for ${boogie.title}! ${boogie.city ? boogie.city + ', ' + boogie.country : ''} — ${new Date(boogie.startDate).toLocaleDateString()}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <MessageCircle className="h-5 w-5" /> Share on WhatsApp
            </a>
            <button onClick={() => router.push('/dashboard/boogies')} className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg font-semibold">
              Back to Events
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Hero */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white p-8 lg:p-12">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-6 w-6" />
            <span className="text-sm font-medium text-purple-200">{boogie.eventType?.replace(/_/g, ' ')}</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold">{boogie.title}</h1>
          {boogie.subtitle && <p className="text-purple-200 mt-2 text-lg">{boogie.subtitle}</p>}
          <p className="text-purple-300 mt-3 text-sm">
            {new Date(boogie.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            {boogie.city && ` · ${boogie.city}, ${boogie.country}`}
          </p>
          {/* Quick Action CTAs */}
          <div className="flex flex-wrap gap-2 mt-4">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Hi! I have a question about ${boogie.title}`)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium text-white transition-colors"
            >
              <MessageCircle className="h-4 w-4" /> Ask on WhatsApp
            </a>
            <button
              onClick={() => {
                const start = new Date(boogie.startDate).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
                const end = new Date(boogie.endDate).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
                const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${start}\nDTEND:${end}\nSUMMARY:${boogie.title}\nLOCATION:${boogie.city || ''}\nEND:VEVENT\nEND:VCALENDAR`;
                const blob = new Blob([ics], { type: 'text/calendar' });
                const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${boogie.title.replace(/\s+/g, '-')}.ics`; a.click(); URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium text-white transition-colors"
            >
              <CalendarPlus className="h-4 w-4" /> Add to Calendar
            </button>
            <button
              onClick={() => { navigator.share?.({ title: boogie.title, text: boogie.subtitle || '', url: window.location.href }).catch(() => { navigator.clipboard.writeText(window.location.href); showToast('Link copied!'); }); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium text-white transition-colors"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto p-4 lg:p-8 -mt-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 lg:p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Register for this event</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {user ? `Logged in as ${user.firstName} ${user.lastName} — some fields are prefilled.` : 'Fill in your details below.'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {formFields.map((f) => (
              <div key={f.field}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {f.label} {f.required && <span className="text-red-500">*</span>}
                  {f.profileMapped && user && <span className="text-xs text-purple-500 ml-1">(prefilled)</span>}
                </label>
                {f.type === 'select' ? (
                  <select
                    value={formData[f.field] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [f.field]: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required={f.required}
                  >
                    <option value="">Select...</option>
                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === 'checkbox' ? (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData[f.field] === true}
                      onChange={(e) => setFormData(prev => ({ ...prev, [f.field]: e.target.checked }))}
                      className="w-4 h-4 rounded text-purple-600"
                      required={f.required}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{f.label}</span>
                  </label>
                ) : f.type === 'textarea' ? (
                  <textarea
                    value={formData[f.field] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [f.field]: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    rows={3}
                    required={f.required}
                  />
                ) : (
                  <input
                    type={f.type || 'text'}
                    value={formData[f.field] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [f.field]: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    required={f.required}
                  />
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50 mt-6"
            >
              {submitting ? 'Submitting...' : 'Submit Registration'}
            </button>
          </form>
        </div>
      </div>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm rounded-lg shadow-lg animate-fade-in">
          <CheckCircle className="h-4 w-4 text-emerald-400" /> {toast}
        </div>
      )}
    </div>
  );
}
