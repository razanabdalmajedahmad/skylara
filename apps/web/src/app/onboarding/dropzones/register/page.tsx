'use client';

import { useState } from 'react';
import { CheckCircle, MapPin, Plane } from 'lucide-react';
import { apiPost } from '@/lib/api';

const AIRCRAFT = ['Cessna 182', 'Cessna 206', 'Cessna 208 Caravan', 'PAC 750', 'King Air', 'Pilatus Porter', 'Twin Otter', 'Skyvan', 'Let 410', 'Dornier 228'];
const DISCIPLINES = ['Belly', 'Freefly', 'Wingsuit', 'CRW', 'AFF', 'Tandem', 'Coach Jumps', 'Canopy Courses'];

export default function DropzoneRegisterPage() {
  const [form, setForm] = useState<Record<string, any>>({ aircraftTypes: [], disciplinesSupported: [], accommodationOptions: [], altitudeOptions: [], staffRoles: [] });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));
  const toggleArray = (key: string, val: string) => {
    const arr = form[key] || [];
    update(key, arr.includes(val) ? arr.filter((v: string) => v !== val) : [...arr, val]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.dzName || !form.contactEmail || !form.country || !form.city) { /* Toast notification would go here */ return; }
    setSubmitting(true);
    try {
      const data = await apiPost('/onboarding/dropzones', form, { skipAuth: true });
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
          <p className="text-gray-600 mb-4">Thank you for registering <strong>{form.dzName}</strong>. Our team will review your application and reach out.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 text-white p-8 lg:p-12">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-3"><Plane className="h-6 w-6" /><span className="text-sm font-medium text-emerald-200">SkyLara Dropzone Partner Program</span></div>
          <h1 className="text-3xl lg:text-4xl font-bold">Register Your Dropzone</h1>
          <p className="text-emerald-200 mt-2">Join the SkyLara network and modernize your DZ operations.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 lg:p-8 -mt-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className="block text-xs font-medium text-gray-500 mb-1">Dropzone Name *</label><input type="text" value={form.dzName || ''} onChange={e => update('dzName', e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm" required /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Country *</label><input type="text" value={form.country || ''} onChange={e => update('country', e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm" required /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">City *</label><input type="text" value={form.city || ''} onChange={e => update('city', e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm" required /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Contact Email *</label><input type="email" value={form.contactEmail || ''} onChange={e => update('contactEmail', e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm" required /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Ops Phone</label><input type="tel" value={form.contactPhone || ''} onChange={e => update('contactPhone', e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Website</label><input type="url" value={form.website || ''} onChange={e => update('website', e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Timezone</label><input type="text" value={form.timezone || ''} onChange={e => update('timezone', e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm" placeholder="e.g. Europe/Prague" /></div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Aircraft Types</label>
            <div className="flex flex-wrap gap-2">
              {AIRCRAFT.map(a => (
                <button key={a} type="button" onClick={() => toggleArray('aircraftTypes', a)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${(form.aircraftTypes || []).includes(a) ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-white text-gray-600 border-gray-200'}`}
                >{a}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Disciplines Supported</label>
            <div className="flex flex-wrap gap-2">
              {DISCIPLINES.map(d => (
                <button key={d} type="button" onClick={() => toggleArray('disciplinesSupported', d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${(form.disciplinesSupported || []).includes(d) ? 'bg-teal-100 text-teal-700 border-teal-300' : 'bg-white text-gray-600 border-gray-200'}`}
                >{d}</button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.gearRentalAvailable || false} onChange={e => update('gearRentalAvailable', e.target.checked)} className="rounded" /><span className="text-sm">Gear Rental Available</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.studentGearAvailable || false} onChange={e => update('studentGearAvailable', e.target.checked)} className="rounded" /><span className="text-sm">Student Gear</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.packingAvailable || false} onChange={e => update('packingAvailable', e.target.checked)} className="rounded" /><span className="text-sm">Packing Service</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.eventHostingInterest || false} onChange={e => update('eventHostingInterest', e.target.checked)} className="rounded" /><span className="text-sm">Event Hosting Interest</span></label>
          </div>

          <button type="submit" disabled={submitting} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold disabled:opacity-50">
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}
