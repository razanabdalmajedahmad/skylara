'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  FileText,
  Pencil,
  Search,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { apiGet, apiPost, APIError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MedicalDeclaration {
  id: number;
  hasConditions: boolean;
  conditions: string | null;
  medications: string | null;
  lastPhysical: string | null;
  clearedToJump: boolean;
  doctorName: string | null;
  doctorPhone: string | null;
  notes: string | null;
  signedAt: string;
  expiresAt: string | null;
  userId?: number;
}

interface FormState {
  hasConditions: boolean;
  conditions: string;
  medications: string;
  lastPhysical: string;
  clearedToJump: boolean;
  doctorName: string;
  doctorPhone: string;
  notes: string;
  expiresAt: string;
}

type ClearanceStatus = 'cleared' | 'expiring_soon' | 'expired' | 'not_cleared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STAFF_ROLES = [
  'MANIFEST_STAFF',
  'DZ_MANAGER',
  'DZ_OWNER',
  'PLATFORM_ADMIN',
  'SAFETY_OFFICER',
];

function isStaffUser(roles: string[]): boolean {
  return roles.some((r) => STAFF_ROLES.includes(r));
}

function getClearanceStatus(decl: MedicalDeclaration): ClearanceStatus {
  if (!decl.clearedToJump) return 'not_cleared';
  if (!decl.expiresAt) return 'cleared';

  const now = new Date();
  const expires = new Date(decl.expiresAt);
  if (expires < now) return 'expired';

  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  if (expires.getTime() - now.getTime() < thirtyDaysMs) return 'expiring_soon';
  return 'cleared';
}

function statusColor(status: ClearanceStatus) {
  switch (status) {
    case 'cleared':
      return { bg: '#ECFDF5', border: '#10B981', text: '#047857', label: 'Cleared' };
    case 'expiring_soon':
      return { bg: '#FFFBEB', border: '#F59E0B', text: '#B45309', label: 'Expiring Soon' };
    case 'expired':
      return { bg: '#FEF2F2', border: '#EF4444', text: '#B91C1C', label: 'Expired' };
    case 'not_cleared':
      return { bg: '#FEF2F2', border: '#EF4444', text: '#B91C1C', label: 'Not Cleared' };
  }
}

function formatDate(d: string | null): string {
  if (!d) return '--';
  try {
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '--';
  }
}

function emptyForm(): FormState {
  return {
    hasConditions: false,
    conditions: '',
    medications: '',
    lastPhysical: '',
    clearedToJump: false,
    doctorName: '',
    doctorPhone: '',
    notes: '',
    expiresAt: '',
  };
}

function declarationToForm(d: MedicalDeclaration): FormState {
  return {
    hasConditions: d.hasConditions,
    conditions: d.conditions ?? '',
    medications: d.medications ?? '',
    lastPhysical: d.lastPhysical ? d.lastPhysical.slice(0, 10) : '',
    clearedToJump: d.clearedToJump,
    doctorName: d.doctorName ?? '',
    doctorPhone: d.doctorPhone ?? '',
    notes: d.notes ?? '',
    expiresAt: d.expiresAt ? d.expiresAt.slice(0, 10) : '',
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ClearanceStatus }) {
  const s = statusColor(status);
  const Icon = status === 'cleared' ? ShieldCheck : status === 'expiring_soon' ? AlertTriangle : ShieldAlert;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      <Icon size={14} />
      {s.label}
    </span>
  );
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 mb-4">
      <XCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm text-red-800">{message}</p>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-400 hover:text-red-600 text-sm">
          Dismiss
        </button>
      )}
    </div>
  );
}

function SuccessBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-green-300 bg-green-50 p-4 mb-4">
      <CheckCircle2 size={18} className="text-green-600 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm text-green-800">{message}</p>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-green-400 hover:text-green-600 text-sm">
          Dismiss
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Declaration Card (read-only view)
// ---------------------------------------------------------------------------

function DeclarationCard({
  declaration,
  onEdit,
  isLookup,
}: {
  declaration: MedicalDeclaration;
  onEdit?: () => void;
  isLookup?: boolean;
}) {
  const status = getClearanceStatus(declaration);
  const sc = statusColor(status);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Status header */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: `3px solid ${sc.border}` }}
      >
        <div className="flex items-center gap-3">
          <FileText size={20} className="text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-900">
            {isLookup ? 'User Medical Declaration' : 'Your Medical Declaration'}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          {onEdit && (
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-[#1A4F8A] hover:bg-[#164063] transition-colors"
            >
              <Pencil size={14} />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        <Field label="Physician Clearance" value={declaration.clearedToJump ? 'Yes' : 'No'} />
        <Field label="Has Medical Conditions" value={declaration.hasConditions ? 'Yes' : 'No'} />
        {declaration.conditions && <Field label="Conditions" value={declaration.conditions} span />}
        {declaration.medications && <Field label="Medications" value={declaration.medications} span />}
        <Field label="Last Physical Exam" value={formatDate(declaration.lastPhysical)} />
        <Field label="Signed At" value={formatDate(declaration.signedAt)} />
        <Field label="Physician Name" value={declaration.doctorName ?? '--'} />
        <Field label="Physician Phone" value={declaration.doctorPhone ?? '--'} />
        {declaration.expiresAt && (
          <Field label="Expires" value={formatDate(declaration.expiresAt)} />
        )}
        {declaration.notes && <Field label="Notes" value={declaration.notes} span />}
      </div>
    </div>
  );
}

function Field({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? 'md:col-span-2' : ''}>
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</dt>
      <dd className="text-sm text-slate-900">{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Declaration Form
// ---------------------------------------------------------------------------

function DeclarationForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial: FormState;
  onSubmit: (data: FormState) => void;
  onCancel?: () => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);

  const set = useCallback(
    <K extends keyof FormState>(key: K, val: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: val }));
    },
    [],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Medical Declaration Form</h2>
        <p className="text-sm text-slate-500 mt-1">
          Complete this form to declare your medical fitness to skydive. All information is kept confidential.
        </p>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Has medical conditions */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.hasConditions}
            onChange={(e) => set('hasConditions', e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-[#1A4F8A] focus:ring-[#1A4F8A]"
          />
          <span className="text-sm font-medium text-slate-700">
            I have medical conditions relevant to skydiving
          </span>
        </label>

        {/* Conditions textarea (shown when hasConditions) */}
        {form.hasConditions && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Medical Conditions</label>
            <textarea
              value={form.conditions}
              onChange={(e) => set('conditions', e.target.value)}
              rows={3}
              placeholder="Describe any relevant medical conditions..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4F8A] focus:border-transparent"
            />
          </div>
        )}

        {/* Current Medications */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Current Medications <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={form.medications}
            onChange={(e) => set('medications', e.target.value)}
            rows={2}
            placeholder="List any medications you are currently taking..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4F8A] focus:border-transparent"
          />
        </div>

        {/* Date / Physician row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Last Physical Exam Date</label>
            <input
              type="date"
              value={form.lastPhysical}
              onChange={(e) => set('lastPhysical', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4F8A] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Physician Name</label>
            <input
              type="text"
              value={form.doctorName}
              onChange={(e) => set('doctorName', e.target.value)}
              placeholder="Dr. Jane Smith"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4F8A] focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Physician Phone</label>
            <input
              type="tel"
              value={form.doctorPhone}
              onChange={(e) => set('doctorPhone', e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4F8A] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Declaration Expiry Date <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={form.expiresAt}
              onChange={(e) => set('expiresAt', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4F8A] focus:border-transparent"
            />
          </div>
        </div>

        {/* Physician Clearance */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.clearedToJump}
            onChange={(e) => set('clearedToJump', e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-[#1A4F8A] focus:ring-[#1A4F8A]"
          />
          <span className="text-sm font-medium text-slate-700">
            I have been cleared by a physician to skydive
          </span>
        </label>

        {/* Additional Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Additional Notes <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={2}
            placeholder="Any additional information..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4F8A] focus:border-transparent"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white bg-[#1A4F8A] hover:bg-[#164063] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? 'Saving...' : 'Submit Declaration'}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Staff Lookup Section
// ---------------------------------------------------------------------------

function StaffLookup() {
  const [userId, setUserId] = useState('');
  const [lookupResult, setLookupResult] = useState<MedicalDeclaration | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupNotFound, setLookupNotFound] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = userId.trim();
    if (!trimmed) return;

    setLookupLoading(true);
    setLookupError('');
    setLookupResult(null);
    setLookupNotFound(false);

    try {
      const res = await apiGet<{ success: boolean; data: MedicalDeclaration }>(
        `/medical-declaration/${encodeURIComponent(trimmed)}`,
      );
      if (res.success && res.data) {
        setLookupResult(res.data);
      } else {
        setLookupNotFound(true);
      }
    } catch (err: unknown) {
      if (err instanceof APIError && err.status === 404) {
        setLookupNotFound(true);
      } else if (err instanceof APIError) {
        setLookupError(err.message || 'Failed to look up declaration.');
      } else {
        setLookupError('An unexpected error occurred.');
      }
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
        <Search size={18} className="text-slate-500" />
        <h2 className="text-lg font-semibold text-slate-900">Staff: Look Up User Declaration</h2>
      </div>

      <div className="px-6 py-5">
        <form onSubmit={handleLookup} className="flex items-end gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4F8A] focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={lookupLoading || !userId.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#1A4F8A] hover:bg-[#164063] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {lookupLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Look Up
          </button>
        </form>

        {lookupError && <ErrorBanner message={lookupError} onDismiss={() => setLookupError('')} />}

        {lookupNotFound && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
            <AlertTriangle size={18} className="text-amber-500 shrink-0" />
            <p className="text-sm text-amber-800">No active medical declaration found for this user.</p>
          </div>
        )}

        {lookupResult && <DeclarationCard declaration={lookupResult} isLookup />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MedicalDeclarationPage() {
  const { user, loading: authLoading } = useAuth();

  const [declaration, setDeclaration] = useState<MedicalDeclaration | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDeclaration = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet<{ success: boolean; data: MedicalDeclaration }>('/medical-declaration/me');
      if (res.success && res.data) {
        setDeclaration(res.data);
      }
    } catch (err: unknown) {
      if (err instanceof APIError && err.status === 404) {
        // No declaration yet -- this is fine, user will create one
        setDeclaration(null);
      } else if (err instanceof APIError) {
        setError(err.message || 'Failed to load your medical declaration.');
      } else {
        setError('An unexpected error occurred while loading your declaration.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      fetchDeclaration();
    }
  }, [authLoading, user, fetchDeclaration]);

  const handleSubmit = async (form: FormState) => {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const payload: Record<string, unknown> = {
        hasConditions: form.hasConditions,
        clearedToJump: form.clearedToJump,
      };
      if (form.conditions) payload.conditions = form.conditions;
      if (form.medications) payload.medications = form.medications;
      if (form.lastPhysical) payload.lastPhysical = form.lastPhysical;
      if (form.doctorName) payload.doctorName = form.doctorName;
      if (form.doctorPhone) payload.doctorPhone = form.doctorPhone;
      if (form.notes) payload.notes = form.notes;
      if (form.expiresAt) payload.expiresAt = form.expiresAt;

      const res = await apiPost<{ success: boolean; data: { operation: string } }>(
        '/medical-declaration',
        payload as Record<string, any>,
      );

      if (res.success) {
        setSuccess(
          res.data?.operation === 'updated'
            ? 'Medical declaration updated successfully.'
            : 'Medical declaration submitted successfully.',
        );
        setEditing(false);
        await fetchDeclaration();
      } else {
        setError('Failed to save your medical declaration. Please try again.');
      }
    } catch (err: unknown) {
      if (err instanceof APIError) {
        setError(err.message || 'Failed to save medical declaration.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Auth loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-[#0EA5E9]" />
      </div>
    );
  }

  if (!user) return null;

  const userRoles = user.roles ?? [];
  const showStaffLookup = isStaffUser(userRoles);

  return (
    <div className="min-h-screen bg-[#F0F4F8] p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <ShieldCheck size={22} className="text-[#1A4F8A]" />
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Medical Declaration</h1>
        </div>
        <p className="text-sm text-slate-500 ml-9">
          Manage your medical fitness declaration for skydiving operations
        </p>
      </div>

      {/* Banners */}
      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}
      {success && <SuccessBanner message={success} onDismiss={() => setSuccess('')} />}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={28} className="animate-spin text-[#0EA5E9]" />
          <p className="text-sm text-slate-500">Loading your medical declaration...</p>
        </div>
      ) : editing ? (
        <DeclarationForm
          initial={declaration ? declarationToForm(declaration) : emptyForm()}
          onSubmit={handleSubmit}
          onCancel={declaration ? () => setEditing(false) : undefined}
          submitting={submitting}
        />
      ) : declaration ? (
        <div className="space-y-6">
          {/* Expiration warning */}
          {getClearanceStatus(declaration) === 'expiring_soon' && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
              <Clock size={18} className="text-amber-500 shrink-0" />
              <p className="text-sm text-amber-800">
                Your medical declaration expires on{' '}
                <span className="font-semibold">{formatDate(declaration.expiresAt)}</span>. Please
                renew it before it expires.
              </p>
            </div>
          )}
          {getClearanceStatus(declaration) === 'expired' && (
            <div className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 p-4">
              <ShieldAlert size={18} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-800">
                Your medical declaration expired on{' '}
                <span className="font-semibold">{formatDate(declaration.expiresAt)}</span>. Please
                submit a new declaration to continue jumping.
              </p>
            </div>
          )}
          <DeclarationCard declaration={declaration} onEdit={() => setEditing(true)} />
        </div>
      ) : (
        /* No declaration: show form directly */
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-blue-300 bg-blue-50 p-4">
            <FileText size={18} className="text-blue-500 shrink-0" />
            <p className="text-sm text-blue-800">
              You have not submitted a medical declaration yet. Please complete the form below.
            </p>
          </div>
          <DeclarationForm
            initial={emptyForm()}
            onSubmit={handleSubmit}
            onCancel={undefined}
            submitting={submitting}
          />
        </div>
      )}

      {/* Staff Lookup */}
      {showStaffLookup && (
        <div className="mt-8">
          <StaffLookup />
        </div>
      )}
    </div>
  );
}
