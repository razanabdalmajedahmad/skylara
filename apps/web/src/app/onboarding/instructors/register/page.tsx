'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Shield } from 'lucide-react';
import { apiPost } from '@/lib/api';

const DISCIPLINES = ['Belly', 'Backfly', 'Head Up', 'Head Down', 'Angle', 'Tracking', 'Wingsuit', 'Canopy', 'AFF', 'Mixed'];
const LANGUAGES = ['English', 'German', 'French', 'Spanish', 'Italian', 'Czech', 'Dutch', 'Arabic', 'Russian', 'Portuguese'];

function InstructorRegisterForm() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState<Record<string, any>>({
    applicationType: 'INSTRUCTOR', disciplines: [], coachingTypes: [], languages: [],
    tunnelCoaching: false, canopyCoaching: false, insuranceConfirmed: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));
  const toggleArray = (key: string, val: string) => {
    const arr = form[key] || [];
    update(key, arr.includes(val) ? arr.filter((v: string) => v !== val) : [...arr, val]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.firstName || !form.lastName) { /* Toast notification would go here */ return; }
    setSubmitting(true);
    try {
      const dzRaw = searchParams.get('dz');
      const dropzoneId =
        dzRaw && /^\d+$/.test(dzRaw) ? parseInt(dzRaw, 10) : undefined;
      const payload = dropzoneId ? { ...form, dropzoneId } : form;
      const data = await apiPost('/onboarding/instructors', payload, { skipAuth: true });
      if (data.success) setSubmitted(true);
      else { /* Toast notification would go here */ }
    } catch { /* Toast notification would go here */ }
    finally { setSubmitting(false); }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h1>
          <p className="text-gray-600 mb-4">Thank you for applying as an {form.applicationType.toLowerCase()}. We&apos;ll review your application and get back to you soon.</p>
          <p className="text-sm text-gray-500">You&apos;ll receive an email once your application is reviewed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white p-8 lg:p-12">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-3"><Shield className="h-6 w-6" /><span className="text-sm font-medium text-purple-200">SkyLara Coach & Instructor Onboarding</span></div>
          <h1 className="text-3xl lg:text-4xl font-bold">Join as an Instructor</h1>
          <p className="text-purple-200 mt-2">Apply to join SkyLara as a skydiving instructor. Share your skills with jumpers worldwide.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 lg:p-8 -mt-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 space-y-6">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Application Type *</label>
            <div className="flex flex-wrap gap-2">
              {['COACH', 'INSTRUCTOR', 'TI', 'AFFI'].map(t => (
                <button key={t} type="button" onClick={() => update('applicationType', t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border ${form.applicationType === t ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300'}`}
                >{t}</button>
              ))}
            </div>
          </div>

          {/* Personal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">First Name *</label><input type="text" value={form.firstName || ''} onChange={e => update('firstName', e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm" required /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Last Name *</label><input type="text" value={form.lastName || ''} onChange={e => update('lastName', e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm" required /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Email *</label><input type="email" value={form.email || ''} onChange={e => update('email', e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm" required /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Phone</label><input type="tel" value={form.phone || ''} onChange={e => update('phone', e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Nationality</label><input type="text" value={form.nationality || ''} onChange={e => update('nationality', e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Home DZ</label><input type="text" value={form.homeDropzone || ''} onChange={e => update('homeDropzone', e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm" /></div>
          </div>

          {/* Experience */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Total Jumps</label><input type="number" value={form.totalJumps || ''} onChange={e => update('totalJumps', parseInt(e.target.value) || undefined)} className="w-full px-3 py-2.5 border rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Tunnel Hours</label><input type="number" value={form.tunnelHours || ''} onChange={e => update('tunnelHours', parseInt(e.target.value) || undefined)} className="w-full px-3 py-2.5 border rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">License Type</label><input type="text" value={form.licenseType || ''} onChange={e => update('licenseType', e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm" placeholder="e.g. D, Coach, TI" /></div>
          </div>

          {/* Disciplines */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Disciplines</label>
            <div className="flex flex-wrap gap-2">
              {DISCIPLINES.map(d => (
                <button key={d} type="button" onClick={() => toggleArray('disciplines', d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${(form.disciplines || []).includes(d) ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-white text-gray-600 border-gray-200'}`}
                >{d}</button>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Languages</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map(l => (
                <button key={l} type="button" onClick={() => toggleArray('languages', l)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${(form.languages || []).includes(l) ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white text-gray-600 border-gray-200'}`}
                >{l}</button>
              ))}
            </div>
          </div>

          {/* Capabilities */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.tunnelCoaching} onChange={e => update('tunnelCoaching', e.target.checked)} className="rounded" /><span className="text-sm">Tunnel Coaching</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.canopyCoaching} onChange={e => update('canopyCoaching', e.target.checked)} className="rounded" /><span className="text-sm">Canopy Coaching</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.insuranceConfirmed} onChange={e => update('insuranceConfirmed', e.target.checked)} className="rounded" /><span className="text-sm">Insurance Confirmed</span></label>
          </div>

          {/* Additional */}
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Travel Base</label><input type="text" value={form.travelBase || ''} onChange={e => update('travelBase', e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm" placeholder="e.g. Prague, Czech Republic" /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Availability</label><input type="text" value={form.availabilityDates || ''} onChange={e => update('availabilityDates', e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm" placeholder="e.g. May-October, weekends" /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Bio</label><textarea value={form.bio || ''} onChange={e => update('bio', e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm" rows={3} placeholder="Tell us about your coaching experience..." /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Emergency Contact</label><input type="text" value={form.emergencyContact || ''} onChange={e => update('emergencyContact', e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm" /></div>

          <button type="submit" disabled={submitting} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold disabled:opacity-50">
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function InstructorRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-gray-600">Loading…</div>}>
      <InstructorRegisterForm />
    </Suspense>
  );
}
