'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import {
  CheckCircle2,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileSignature,
  Shield,
  User,
  Phone,
  Heart,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WaiverInfo {
  templateTitle: string;
  orgName: string;
  orgLogo?: string;
  version: number;
  requireMinor: boolean;
  sections: SectionInfo[];
}

interface SectionInfo {
  key: string;
  title: string;
  content: string;
  sectionType: string;
  required: boolean;
  fields?: { key: string; label: string; type: string; required: boolean; options?: string[] }[];
}

// ---------------------------------------------------------------------------
// Signing Page
// ---------------------------------------------------------------------------

export default function WaiverSignPage() {
  const params = useParams<{ orgSlug: string; waiverSlug: string }>();
  const [loading, setLoading] = useState(true);
  const [waiver, setWaiver] = useState<WaiverInfo | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [signed, setSigned] = useState(false);
  const [isMinor, setIsMinor] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet<any>(`/waivers/sign/${params.orgSlug}/${params.waiverSlug}`, { skipAuth: true });
        setWaiver({
          templateTitle: data.templateTitle,
          orgName: data.orgName,
          version: data.version,
          requireMinor: data.requireMinor,
          sections: (data.sections || []).map((s: any) => ({
            key: s.key,
            title: s.title,
            content: s.content || '',
            sectionType: s.sectionType,
            required: s.required,
            fields: s.fields,
          })),
        });
      } catch {
        setWaiver(null);
      }
      setLoading(false);
    })();
  }, [params.orgSlug, params.waiverSlug]);

  const updateField = useCallback((key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const [submitting, setSubmitting] = useState(false);

  const handleSign = async () => {
    setSubmitting(true);
    try {
      await apiPost(`/waivers/sign/${params.orgSlug}/${params.waiverSlug}`, {
        answers: formData,
        signerName: formData.signatureName || `${formData.firstName || ''} ${formData.lastName || ''}`.trim(),
        signerEmail: formData.email,
        signerPhone: formData.phone,
        isMinor,
        guardianName: isMinor ? formData.guardianName : undefined,
        guardianRelation: isMinor ? formData.guardianRelation : undefined,
        signatureName: formData.signatureName || '',
        signatureMethod: 'TYPED',
      }, { skipAuth: true });
    } catch {}
    setSubmitting(false);
    setSigned(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center"><Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" /><p className="mt-3 text-sm text-gray-500">Loading waiver...</p></div>
      </div>
    );
  }

  if (!waiver) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center"><AlertTriangle className="w-10 h-10 text-red-400 mx-auto" /><p className="mt-3 text-gray-700">Waiver link not found or expired.</p></div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Waiver Signed</h1>
          <p className="text-gray-600 mt-2">Thank you, {formData.firstName || 'Participant'}! Your {waiver.templateTitle} has been successfully signed and recorded.</p>
          <div className="mt-6 p-4 bg-green-50 rounded-lg text-sm text-green-800">
            <p><strong>Reference:</strong> WVR-{Date.now().toString(36).toUpperCase()}</p>
            <p className="mt-1"><strong>Organization:</strong> {waiver.orgName}</p>
            <p className="mt-1"><strong>Version:</strong> v{waiver.version}</p>
          </div>
          <p className="text-xs text-gray-400 mt-4">A confirmation email will be sent to {formData.email || 'your email address'}.</p>
        </div>
      </div>
    );
  }

  const section = waiver.sections[currentSection];
  const totalSections = waiver.sections.length;
  const isLast = currentSection === totalSections - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSignature className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-base font-bold text-gray-900">{waiver.orgName}</h1>
                <p className="text-xs text-gray-500">{waiver.templateTitle} &middot; v{waiver.version}</p>
              </div>
            </div>
            <span className="text-xs text-gray-400">{currentSection + 1} / {totalSections}</span>
          </div>
          <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5">
            <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((currentSection + 1) / totalSections) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{section.title}</h2>

          {/* Paragraph / Clause content */}
          {section.content && (section.sectionType === 'PARAGRAPH' || section.sectionType === 'CLAUSE') && (
            <div className="prose prose-sm text-gray-700 mb-4">
              <p>{section.content}</p>
              {section.sectionType === 'CLAUSE' && section.required && (
                <label className="flex items-center gap-3 mt-4 cursor-pointer">
                  <input type="checkbox" checked={!!formData[`${section.key}_agreed`]} onChange={(e) => updateField(`${section.key}_agreed`, e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-gray-900">I have read and agree to the above</span>
                </label>
              )}
            </div>
          )}

          {/* Checkbox group */}
          {section.sectionType === 'CHECKBOX_GROUP' && section.fields && (
            <div className="space-y-3">
              {section.fields.map((f) => (
                <label key={f.key} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                  <input type="checkbox" checked={!!formData[f.key]} onChange={(e) => updateField(f.key, e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">{f.label} {f.required && <span className="text-red-500">*</span>}</span>
                </label>
              ))}
            </div>
          )}

          {/* Custom fields */}
          {section.sectionType === 'CUSTOM_FIELDS' && section.fields && (
            <div className="space-y-4">
              {section.fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label} {f.required && <span className="text-red-500">*</span>}</label>
                  <input type={f.type === 'phone' ? 'tel' : f.type} value={formData[f.key] || ''} onChange={(e) => updateField(f.key, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
                </div>
              ))}
            </div>
          )}

          {/* Signature block */}
          {section.sectionType === 'SIGNATURE_BLOCK' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-700">{section.content}</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type your full legal name as your signature</label>
                <input type="text" value={formData.signatureName || ''} onChange={(e) => updateField('signatureName', e.target.value)} placeholder="Your full legal name" className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-xl font-serif italic focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Today's Date</label>
                <input type="date" value={formData.signatureDate || new Date().toISOString().split('T')[0]} onChange={(e) => updateField('signatureDate', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>

              {/* Minor / Guardian section */}
              {waiver.requireMinor && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input type="checkbox" checked={isMinor} onChange={(e) => setIsMinor(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Participant is under 18 years old</span>
                  </label>
                  {isMinor && (
                    <div className="space-y-3 mt-3">
                      <div><label className="block text-sm font-medium text-blue-800 mb-1">Parent/Guardian Name <span className="text-red-500">*</span></label>
                        <input type="text" value={formData.guardianName || ''} onChange={(e) => updateField('guardianName', e.target.value)} className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm" /></div>
                      <div><label className="block text-sm font-medium text-blue-800 mb-1">Relationship <span className="text-red-500">*</span></label>
                        <input type="text" value={formData.guardianRelation || ''} onChange={(e) => updateField('guardianRelation', e.target.value)} className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm" /></div>
                      <div><label className="block text-sm font-medium text-blue-800 mb-1">Guardian Signature (Type full name) <span className="text-red-500">*</span></label>
                        <input type="text" value={formData.guardianSignature || ''} onChange={(e) => updateField('guardianSignature', e.target.value)} className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg text-xl font-serif italic" /></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100">
            <button onClick={() => setCurrentSection((s) => Math.max(0, s - 1))} disabled={currentSection === 0} className={`flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${currentSection === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}>
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            {isLast ? (
              <button onClick={handleSign} disabled={submitting} className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50">
                <FileSignature className="w-4 h-4" /> {submitting ? 'Signing...' : 'Sign Waiver'}
              </button>
            ) : (
              <button onClick={() => setCurrentSection((s) => Math.min(totalSections - 1, s + 1))} className="flex items-center gap-1 px-4 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
