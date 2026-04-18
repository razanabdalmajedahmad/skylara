'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Zap,
  CalendarDays,
  MapPin,
  UserCircle,
  Tag,
  Users,
  DollarSign,
  ClipboardList,
  ShieldCheck,
  Image as ImageIcon,
  CircleDot,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Save,
} from 'lucide-react';
import { apiPost } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVENT_TYPES = [
  { value: 'BOOGIE', label: 'Boogie' },
  { value: 'SKILLS_CAMP', label: 'Skills Camp' },
  { value: 'COACH_CAMP', label: 'Coach Camp' },
  { value: 'FREEFLY_CAMP', label: 'Freefly Camp' },
  { value: 'ANGLE_CAMP', label: 'Angle Camp' },
  { value: 'TRACKING_CAMP', label: 'Tracking Camp' },
  { value: 'WINGSUIT_CAMP', label: 'Wingsuit Camp' },
  { value: 'CANOPY_CAMP', label: 'Canopy Camp' },
  { value: 'EXPEDITION', label: 'Expedition' },
  { value: 'COMPETITION', label: 'Competition' },
  { value: 'TANDEM_PROMO', label: 'Tandem Promo' },
  { value: 'ORGANIZER_CAMP', label: 'Organizer Camp' },
];

const DISCIPLINES = [
  { value: 'BELLY', label: 'Belly' },
  { value: 'FREEFLY', label: 'Freefly' },
  { value: 'HEAD_DOWN', label: 'Head Down' },
  { value: 'WINGSUIT', label: 'Wingsuit' },
  { value: 'CRW', label: 'CRW' },
  { value: 'ANGLE', label: 'Angle' },
  { value: 'TRACKING', label: 'Tracking' },
  { value: 'CANOPY', label: 'Canopy Piloting' },
  { value: 'MIXED', label: 'Mixed' },
];

const STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'REGISTRATION_OPEN', label: 'Registration Open' },
  { value: 'REGISTRATION_CLOSED', label: 'Registration Closed' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Complete' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const CURRENCIES = [
  { value: 'AED', label: 'AED - UAE Dirham' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'SAR', label: 'SAR - Saudi Riyal' },
  { value: 'QAR', label: 'QAR - Qatari Riyal' },
  { value: 'BHD', label: 'BHD - Bahraini Dinar' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PackageItem {
  name: string;
  description: string;
  price: number;
  maxSlots: number;
}

interface SlotLimit {
  discipline: string;
  limit: number;
}

interface FormData {
  // Basic Details
  title: string;
  subtitle: string;
  description: string;
  eventType: string;
  // Dates & Time
  startDate: string;
  endDate: string;
  registrationOpenDate: string;
  registrationCloseDate: string;
  // Location
  dropzone: string;
  country: string;
  city: string;
  locationNotes: string;
  // Organizer
  organizerName: string;
  organizerEmail: string;
  coOrganizers: string;
  // Category
  discipline: string;
  disciplines: string[];
  // Capacity
  maxParticipants: number;
  slotLimits: SlotLimit[];
  waitlistEnabled: boolean;
  // Pricing
  currency: string;
  basePrice: number;
  earlyBirdPrice: number;
  earlyBirdDeadline: string;
  depositAmount: number;
  packages: PackageItem[];
  // Registration Settings
  registrationOpen: boolean;
  approvalRequired: boolean;
  minimumJumpCount: number;
  // Waiver Requirements
  waivers: string[];
  // Media
  heroImageUrl: string;
  descriptionImages: string[];
  // Status
  status: string;
}

type SectionKey =
  | 'basic'
  | 'dates'
  | 'location'
  | 'organizer'
  | 'category'
  | 'capacity'
  | 'pricing'
  | 'registration'
  | 'waivers'
  | 'media'
  | 'status';

interface FieldError {
  field: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function in30Days(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Section Card Component
// ---------------------------------------------------------------------------

function SectionCard({
  id,
  icon,
  title,
  subtitle,
  open,
  onToggle,
  hasErrors,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  hasErrors: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className={`bg-white dark:bg-slate-800 rounded-xl border ${
        hasErrors
          ? 'border-red-300 dark:border-red-500'
          : 'border-gray-200 dark:border-slate-700'
      } shadow-sm overflow-hidden transition-colors`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 text-blue-600 dark:text-blue-400">
            {icon}
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {subtitle}
            </p>
          </div>
          {hasErrors && (
            <AlertCircle className="h-4 w-4 text-red-500 ml-2" />
          )}
        </div>
        {open ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>
      {open && (
        <div className="px-6 pb-6 border-t border-gray-100 dark:border-slate-700 pt-5">
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field Error Display
// ---------------------------------------------------------------------------

function FieldErrorMsg({ errors, field }: { errors: FieldError[]; field: string }) {
  const err = errors.find((e) => e.field === field);
  if (!err) return null;
  return <p className="text-xs text-red-500 mt-1">{err.message}</p>;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function NewBoogiePage() {
  const router = useRouter();
  const { user } = useAuth();

  // Sections open/collapsed state
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    basic: true,
    dates: true,
    location: false,
    organizer: false,
    category: false,
    capacity: false,
    pricing: false,
    registration: false,
    waivers: false,
    media: false,
    status: false,
  });

  const toggleSection = useCallback((key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Form state
  const [form, setForm] = useState<FormData>({
    title: '',
    subtitle: '',
    description: '',
    eventType: 'BOOGIE',
    startDate: in30Days(),
    endDate: '',
    registrationOpenDate: todayStr(),
    registrationCloseDate: '',
    dropzone: '',
    country: '',
    city: '',
    locationNotes: '',
    organizerName: user ? `${user.firstName} ${user.lastName}` : '',
    organizerEmail: user?.email || '',
    coOrganizers: '',
    discipline: 'MIXED',
    disciplines: ['MIXED'],
    maxParticipants: 100,
    slotLimits: [],
    waitlistEnabled: true,
    currency: 'AED',
    basePrice: 0,
    earlyBirdPrice: 0,
    earlyBirdDeadline: '',
    depositAmount: 0,
    packages: [],
    registrationOpen: false,
    approvalRequired: false,
    minimumJumpCount: 0,
    waivers: [],
    heroImageUrl: '',
    descriptionImages: [],
    status: 'DRAFT',
  });

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Temp inputs for array builders
  const [newWaiver, setNewWaiver] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  // ---------------------------------------------------------------------------
  // Change helpers
  // ---------------------------------------------------------------------------

  const set = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      // Clear field error when user types
      setErrors((prev) => prev.filter((e) => e.field !== key));
    },
    [],
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      if (type === 'number') {
        set(name as keyof FormData, Number(value) as any);
      } else {
        set(name as keyof FormData, value as any);
      }
    },
    [set],
  );

  const handleCheckbox = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, checked } = e.target;
      set(name as keyof FormData, checked as any);
    },
    [set],
  );

  // Multi-select disciplines
  const toggleDiscipline = useCallback(
    (val: string) => {
      setForm((prev) => {
        const exists = prev.disciplines.includes(val);
        const next = exists
          ? prev.disciplines.filter((d) => d !== val)
          : [...prev.disciplines, val];
        return { ...prev, disciplines: next, discipline: next[0] || 'MIXED' };
      });
    },
    [],
  );

  // Slot limits
  const addSlotLimit = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      slotLimits: [...prev.slotLimits, { discipline: 'BELLY', limit: 20 }],
    }));
  }, []);

  const updateSlotLimit = useCallback(
    (idx: number, field: 'discipline' | 'limit', value: string | number) => {
      setForm((prev) => ({
        ...prev,
        slotLimits: prev.slotLimits.map((s, i) =>
          i === idx ? { ...s, [field]: value } : s,
        ),
      }));
    },
    [],
  );

  const removeSlotLimit = useCallback((idx: number) => {
    setForm((prev) => ({
      ...prev,
      slotLimits: prev.slotLimits.filter((_, i) => i !== idx),
    }));
  }, []);

  // Packages
  const addPackage = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      packages: [
        ...prev.packages,
        { name: '', description: '', price: 0, maxSlots: 0 },
      ],
    }));
  }, []);

  const updatePackage = useCallback(
    (idx: number, field: keyof PackageItem, value: string | number) => {
      setForm((prev) => ({
        ...prev,
        packages: prev.packages.map((p, i) =>
          i === idx ? { ...p, [field]: value } : p,
        ),
      }));
    },
    [],
  );

  const removePackage = useCallback((idx: number) => {
    setForm((prev) => ({
      ...prev,
      packages: prev.packages.filter((_, i) => i !== idx),
    }));
  }, []);

  // Waivers
  const addWaiver = useCallback(() => {
    const val = newWaiver.trim();
    if (!val) return;
    setForm((prev) => ({ ...prev, waivers: [...prev.waivers, val] }));
    setNewWaiver('');
  }, [newWaiver]);

  const removeWaiver = useCallback((idx: number) => {
    setForm((prev) => ({
      ...prev,
      waivers: prev.waivers.filter((_, i) => i !== idx),
    }));
  }, []);

  // Description images
  const addDescriptionImage = useCallback(() => {
    const val = newImageUrl.trim();
    if (!val) return;
    setForm((prev) => ({
      ...prev,
      descriptionImages: [...prev.descriptionImages, val],
    }));
    setNewImageUrl('');
  }, [newImageUrl]);

  const removeDescriptionImage = useCallback((idx: number) => {
    setForm((prev) => ({
      ...prev,
      descriptionImages: prev.descriptionImages.filter((_, i) => i !== idx),
    }));
  }, []);

  // ---------------------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------------------

  const showToast = useCallback(
    (type: 'success' | 'error', message: string) => {
      setToast({ type, message });
      setTimeout(() => setToast(null), 5000);
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  const validate = useCallback((): FieldError[] => {
    const errs: FieldError[] = [];

    if (!form.title.trim()) {
      errs.push({ field: 'title', message: 'Event name is required' });
    }
    if (!form.eventType) {
      errs.push({ field: 'eventType', message: 'Event type is required' });
    }
    if (!form.startDate) {
      errs.push({ field: 'startDate', message: 'Start date is required' });
    }
    if (!form.endDate) {
      errs.push({ field: 'endDate', message: 'End date is required' });
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      errs.push({ field: 'endDate', message: 'End date must be after start date' });
    }
    if (
      form.registrationCloseDate &&
      form.registrationOpenDate &&
      form.registrationCloseDate < form.registrationOpenDate
    ) {
      errs.push({
        field: 'registrationCloseDate',
        message: 'Registration close must be after registration open',
      });
    }
    if (form.maxParticipants <= 0) {
      errs.push({
        field: 'maxParticipants',
        message: 'Must have at least 1 participant slot',
      });
    }
    if (form.basePrice < 0) {
      errs.push({ field: 'basePrice', message: 'Price cannot be negative' });
    }
    if (form.earlyBirdPrice < 0) {
      errs.push({ field: 'earlyBirdPrice', message: 'Early bird price cannot be negative' });
    }
    if (form.earlyBirdPrice > 0 && form.earlyBirdPrice >= form.basePrice && form.basePrice > 0) {
      errs.push({
        field: 'earlyBirdPrice',
        message: 'Early bird price should be less than the base price',
      });
    }
    if (form.minimumJumpCount < 0) {
      errs.push({
        field: 'minimumJumpCount',
        message: 'Jump count cannot be negative',
      });
    }
    if (form.disciplines.length === 0) {
      errs.push({ field: 'disciplines', message: 'Select at least one discipline' });
    }

    return errs;
  }, [form]);

  // Figure out which sections have errors
  const sectionHasErrors = useCallback(
    (key: SectionKey) => {
      const fieldMap: Record<SectionKey, string[]> = {
        basic: ['title', 'eventType'],
        dates: ['startDate', 'endDate', 'registrationCloseDate'],
        location: [],
        organizer: [],
        category: ['disciplines'],
        capacity: ['maxParticipants'],
        pricing: ['basePrice', 'earlyBirdPrice'],
        registration: ['minimumJumpCount'],
        waivers: [],
        media: [],
        status: [],
      };
      const fields = fieldMap[key] || [];
      return errors.some((e) => fields.includes(e.field));
    },
    [errors],
  );

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      // Open sections that have errors
      const sectionKeys: SectionKey[] = [
        'basic',
        'dates',
        'location',
        'organizer',
        'category',
        'capacity',
        'pricing',
        'registration',
        'waivers',
        'media',
        'status',
      ];
      const fieldToSection: Record<string, SectionKey> = {
        title: 'basic',
        eventType: 'basic',
        startDate: 'dates',
        endDate: 'dates',
        registrationCloseDate: 'dates',
        disciplines: 'category',
        maxParticipants: 'capacity',
        basePrice: 'pricing',
        earlyBirdPrice: 'pricing',
        minimumJumpCount: 'registration',
      };
      const sectionsToOpen = new Set<SectionKey>();
      validationErrors.forEach((err) => {
        const sec = fieldToSection[err.field];
        if (sec) sectionsToOpen.add(sec);
      });
      setOpenSections((prev) => {
        const next = { ...prev };
        sectionsToOpen.forEach((s) => {
          next[s] = true;
        });
        return next;
      });
      showToast('error', 'Please fix the errors before submitting');
      return;
    }

    setSubmitting(true);
    setErrors([]);

    try {
      const payload = {
        title: form.title,
        subtitle: form.subtitle || null,
        description: form.description || null,
        eventType: form.eventType,
        startDate: form.startDate,
        endDate: form.endDate,
        registrationOpenDate: form.registrationOpenDate || null,
        registrationCloseDate: form.registrationCloseDate || null,
        dropzone: form.dropzone || null,
        country: form.country || null,
        city: form.city || null,
        locationNotes: form.locationNotes || null,
        organizerName: form.organizerName || null,
        organizerEmail: form.organizerEmail || null,
        coOrganizers: form.coOrganizers
          ? form.coOrganizers.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        discipline: form.discipline,
        disciplines: form.disciplines,
        maxParticipants: form.maxParticipants,
        slotLimits: form.slotLimits,
        waitlistEnabled: form.waitlistEnabled,
        currency: form.currency,
        basePrice: form.basePrice,
        earlyBirdPrice: form.earlyBirdPrice || null,
        earlyBirdDeadline: form.earlyBirdDeadline || null,
        depositAmount: form.depositAmount || null,
        packages: form.packages.filter((p) => p.name.trim()),
        registrationOpen: form.registrationOpen,
        approvalRequired: form.approvalRequired,
        minimumJumpCount: form.minimumJumpCount,
        waivers: form.waivers,
        heroImageUrl: form.heroImageUrl || null,
        descriptionImages: form.descriptionImages,
        status: form.status,
      };

      await apiPost('/boogies', payload);
      showToast('success', 'Event created successfully');
      setTimeout(() => {
        router.push('/dashboard/boogies');
      }, 800);
    } catch (err: any) {
      const message =
        err?.message || 'Failed to create event. Please try again.';
      showToast('error', message);
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Shared field styles
  // ---------------------------------------------------------------------------

  const inputCls =
    'w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500';

  const labelCls = 'block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5';

  const selectCls =
    'w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors appearance-none';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 hover:opacity-80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/boogies"
              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-semibold transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Link>
            <div className="h-6 w-px bg-gray-200 dark:bg-slate-600" />
            <div className="flex items-center gap-2.5">
              <Zap className="h-6 w-6 text-purple-600" />
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  Create New Event
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  Fill out the sections below to set up your boogie or event
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/boogies"
              className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleSubmit as any}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Create Event
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Form body */}
      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto px-4 lg:px-8 py-8">
        <div className="space-y-5">
          {/* ================================================================
              1. Basic Details
              ================================================================ */}
          <SectionCard
            id="section-basic"
            icon={<Zap className="h-5 w-5" />}
            title="Basic Details"
            subtitle="Event name, description, and type"
            open={openSections.basic}
            onToggle={() => toggleSection('basic')}
            hasErrors={sectionHasErrors('basic')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className={labelCls}>Event Name *</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleInput}
                  placeholder="e.g. Blame It On The Boogie 2026"
                  className={inputCls}
                  maxLength={120}
                />
                <FieldErrorMsg errors={errors} field="title" />
                <p className="text-xs text-gray-400 mt-1">
                  {form.title.length}/120 characters
                </p>
              </div>

              <div className="md:col-span-2">
                <label className={labelCls}>Subtitle</label>
                <input
                  type="text"
                  name="subtitle"
                  value={form.subtitle}
                  onChange={handleInput}
                  placeholder="A short tagline for the event"
                  className={inputCls}
                  maxLength={200}
                />
              </div>

              <div>
                <label className={labelCls}>Event Type *</label>
                <select
                  name="eventType"
                  value={form.eventType}
                  onChange={handleInput}
                  className={selectCls}
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <FieldErrorMsg errors={errors} field="eventType" />
              </div>

              <div className="md:col-span-2">
                <label className={labelCls}>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleInput}
                  rows={5}
                  placeholder="Describe the event, what jumpers can expect, schedule highlights..."
                  className={inputCls}
                  maxLength={5000}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {form.description.length}/5000 characters
                </p>
              </div>
            </div>
          </SectionCard>

          {/* ================================================================
              2. Dates & Time
              ================================================================ */}
          <SectionCard
            id="section-dates"
            icon={<CalendarDays className="h-5 w-5" />}
            title="Dates & Time"
            subtitle="Event and registration dates"
            open={openSections.dates}
            onToggle={() => toggleSection('dates')}
            hasErrors={sectionHasErrors('dates')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelCls}>Start Date *</label>
                <input
                  type="date"
                  name="startDate"
                  value={form.startDate}
                  onChange={handleInput}
                  className={inputCls}
                />
                <FieldErrorMsg errors={errors} field="startDate" />
              </div>
              <div>
                <label className={labelCls}>End Date *</label>
                <input
                  type="date"
                  name="endDate"
                  value={form.endDate}
                  onChange={handleInput}
                  min={form.startDate}
                  className={inputCls}
                />
                <FieldErrorMsg errors={errors} field="endDate" />
              </div>
              <div>
                <label className={labelCls}>Registration Opens</label>
                <input
                  type="date"
                  name="registrationOpenDate"
                  value={form.registrationOpenDate}
                  onChange={handleInput}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Registration Closes</label>
                <input
                  type="date"
                  name="registrationCloseDate"
                  value={form.registrationCloseDate}
                  onChange={handleInput}
                  min={form.registrationOpenDate}
                  className={inputCls}
                />
                <FieldErrorMsg errors={errors} field="registrationCloseDate" />
              </div>
            </div>
          </SectionCard>

          {/* ================================================================
              3. Location
              ================================================================ */}
          <SectionCard
            id="section-location"
            icon={<MapPin className="h-5 w-5" />}
            title="Location"
            subtitle="Dropzone and venue details"
            open={openSections.location}
            onToggle={() => toggleSection('location')}
            hasErrors={sectionHasErrors('location')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className={labelCls}>Dropzone Name</label>
                <input
                  type="text"
                  name="dropzone"
                  value={form.dropzone}
                  onChange={handleInput}
                  placeholder="e.g. Skydive Dubai, Skydive Empuriabrava"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Country</label>
                <input
                  type="text"
                  name="country"
                  value={form.country}
                  onChange={handleInput}
                  placeholder="e.g. UAE"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>City</label>
                <input
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleInput}
                  placeholder="e.g. Dubai"
                  className={inputCls}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Location Notes</label>
                <textarea
                  name="locationNotes"
                  value={form.locationNotes}
                  onChange={handleInput}
                  rows={3}
                  placeholder="Meeting point, transport details, on-site facilities..."
                  className={inputCls}
                />
              </div>
            </div>
          </SectionCard>

          {/* ================================================================
              4. Organizer
              ================================================================ */}
          <SectionCard
            id="section-organizer"
            icon={<UserCircle className="h-5 w-5" />}
            title="Organizer"
            subtitle="Primary organizer and co-organizers"
            open={openSections.organizer}
            onToggle={() => toggleSection('organizer')}
            hasErrors={sectionHasErrors('organizer')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelCls}>Primary Organizer Name</label>
                <input
                  type="text"
                  name="organizerName"
                  value={form.organizerName}
                  onChange={handleInput}
                  placeholder="Full name"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Organizer Email</label>
                <input
                  type="email"
                  name="organizerEmail"
                  value={form.organizerEmail}
                  onChange={handleInput}
                  placeholder="organizer@email.com"
                  className={inputCls}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Co-Organizers</label>
                <input
                  type="text"
                  name="coOrganizers"
                  value={form.coOrganizers}
                  onChange={handleInput}
                  placeholder="Comma-separated names or emails"
                  className={inputCls}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Separate multiple co-organizers with commas
                </p>
              </div>
            </div>
          </SectionCard>

          {/* ================================================================
              5. Category / Disciplines
              ================================================================ */}
          <SectionCard
            id="section-category"
            icon={<Tag className="h-5 w-5" />}
            title="Category & Disciplines"
            subtitle="Select the disciplines for this event"
            open={openSections.category}
            onToggle={() => toggleSection('category')}
            hasErrors={sectionHasErrors('category')}
          >
            <div>
              <label className={labelCls}>Disciplines *</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Select all that apply. At least one is required.
              </p>
              <div className="flex flex-wrap gap-2">
                {DISCIPLINES.map((d) => {
                  const active = form.disciplines.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDiscipline(d.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                        active
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:border-blue-400'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              <FieldErrorMsg errors={errors} field="disciplines" />
            </div>
          </SectionCard>

          {/* ================================================================
              6. Capacity
              ================================================================ */}
          <SectionCard
            id="section-capacity"
            icon={<Users className="h-5 w-5" />}
            title="Capacity"
            subtitle="Participant limits and waitlist"
            open={openSections.capacity}
            onToggle={() => toggleSection('capacity')}
            hasErrors={sectionHasErrors('capacity')}
          >
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Max Participants *</label>
                  <input
                    type="number"
                    name="maxParticipants"
                    value={form.maxParticipants}
                    onChange={handleInput}
                    min={1}
                    className={inputCls}
                  />
                  <FieldErrorMsg errors={errors} field="maxParticipants" />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    id="waitlistEnabled"
                    name="waitlistEnabled"
                    checked={form.waitlistEnabled}
                    onChange={handleCheckbox}
                    className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="waitlistEnabled"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Enable waitlist when full
                  </label>
                </div>
              </div>

              {/* Slot limits */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className={labelCls}>Slot Limits per Discipline</label>
                  <button
                    type="button"
                    onClick={addSlotLimit}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Limit
                  </button>
                </div>
                {form.slotLimits.length === 0 && (
                  <p className="text-xs text-gray-400">
                    No slot limits set. All participants share the total capacity.
                  </p>
                )}
                <div className="space-y-2">
                  {form.slotLimits.map((sl, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3"
                    >
                      <select
                        value={sl.discipline}
                        onChange={(e) =>
                          updateSlotLimit(idx, 'discipline', e.target.value)
                        }
                        className={`${selectCls} flex-1`}
                      >
                        {DISCIPLINES.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={sl.limit}
                        onChange={(e) =>
                          updateSlotLimit(idx, 'limit', Number(e.target.value))
                        }
                        min={0}
                        className={`${inputCls} w-28`}
                        placeholder="Limit"
                      />
                      <button
                        type="button"
                        onClick={() => removeSlotLimit(idx)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ================================================================
              7. Pricing
              ================================================================ */}
          <SectionCard
            id="section-pricing"
            icon={<DollarSign className="h-5 w-5" />}
            title="Pricing"
            subtitle="Base price, early bird, deposits, and packages"
            open={openSections.pricing}
            onToggle={() => toggleSection('pricing')}
            hasErrors={sectionHasErrors('pricing')}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Currency</label>
                  <select
                    name="currency"
                    value={form.currency}
                    onChange={handleInput}
                    className={selectCls}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Base Price</label>
                  <input
                    type="number"
                    name="basePrice"
                    value={form.basePrice}
                    onChange={handleInput}
                    min={0}
                    step={0.01}
                    className={inputCls}
                    placeholder="0.00"
                  />
                  <FieldErrorMsg errors={errors} field="basePrice" />
                </div>
                <div>
                  <label className={labelCls}>Early Bird Price</label>
                  <input
                    type="number"
                    name="earlyBirdPrice"
                    value={form.earlyBirdPrice}
                    onChange={handleInput}
                    min={0}
                    step={0.01}
                    className={inputCls}
                    placeholder="0.00"
                  />
                  <FieldErrorMsg errors={errors} field="earlyBirdPrice" />
                </div>
                <div>
                  <label className={labelCls}>Early Bird Deadline</label>
                  <input
                    type="date"
                    name="earlyBirdDeadline"
                    value={form.earlyBirdDeadline}
                    onChange={handleInput}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Deposit Amount</label>
                  <input
                    type="number"
                    name="depositAmount"
                    value={form.depositAmount}
                    onChange={handleInput}
                    min={0}
                    step={0.01}
                    className={inputCls}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Packages */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className={labelCls}>Packages</label>
                  <button
                    type="button"
                    onClick={addPackage}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Package
                  </button>
                </div>
                {form.packages.length === 0 && (
                  <p className="text-xs text-gray-400">
                    No packages defined. Add tiered offerings like
                    &quot;Weekend Pass&quot; or &quot;Full Week + Tunnel&quot;.
                  </p>
                )}
                <div className="space-y-4">
                  {form.packages.map((pkg, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 dark:border-slate-700 dark:border-slate-600 rounded-lg p-4 relative"
                    >
                      <button
                        type="button"
                        onClick={() => removePackage(idx)}
                        className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>Package Name</label>
                          <input
                            type="text"
                            value={pkg.name}
                            onChange={(e) =>
                              updatePackage(idx, 'name', e.target.value)
                            }
                            placeholder="e.g. Full Week Pass"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Price</label>
                          <input
                            type="number"
                            value={pkg.price}
                            onChange={(e) =>
                              updatePackage(idx, 'price', Number(e.target.value))
                            }
                            min={0}
                            step={0.01}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Max Slots</label>
                          <input
                            type="number"
                            value={pkg.maxSlots}
                            onChange={(e) =>
                              updatePackage(
                                idx,
                                'maxSlots',
                                Number(e.target.value),
                              )
                            }
                            min={0}
                            className={inputCls}
                            placeholder="0 = unlimited"
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Description</label>
                          <input
                            type="text"
                            value={pkg.description}
                            onChange={(e) =>
                              updatePackage(idx, 'description', e.target.value)
                            }
                            placeholder="What's included"
                            className={inputCls}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ================================================================
              8. Registration Settings
              ================================================================ */}
          <SectionCard
            id="section-registration"
            icon={<ClipboardList className="h-5 w-5" />}
            title="Registration Settings"
            subtitle="Registration controls and requirements"
            open={openSections.registration}
            onToggle={() => toggleSection('registration')}
            hasErrors={sectionHasErrors('registration')}
          >
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="registrationOpen"
                    name="registrationOpen"
                    checked={form.registrationOpen}
                    onChange={handleCheckbox}
                    className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="registrationOpen"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Registration currently open
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="approvalRequired"
                    name="approvalRequired"
                    checked={form.approvalRequired}
                    onChange={handleCheckbox}
                    className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="approvalRequired"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Require organizer approval
                  </label>
                </div>
              </div>
              <div className="max-w-xs">
                <label className={labelCls}>Minimum Jump Count</label>
                <input
                  type="number"
                  name="minimumJumpCount"
                  value={form.minimumJumpCount}
                  onChange={handleInput}
                  min={0}
                  className={inputCls}
                  placeholder="0 = no minimum"
                />
                <FieldErrorMsg errors={errors} field="minimumJumpCount" />
                <p className="text-xs text-gray-400 mt-1">
                  Set to 0 for no restriction
                </p>
              </div>
            </div>
          </SectionCard>

          {/* ================================================================
              9. Waiver Requirements
              ================================================================ */}
          <SectionCard
            id="section-waivers"
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Waiver Requirements"
            subtitle="Required waivers for participants"
            open={openSections.waivers}
            onToggle={() => toggleSection('waivers')}
            hasErrors={sectionHasErrors('waivers')}
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  value={newWaiver}
                  onChange={(e) => setNewWaiver(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addWaiver();
                    }
                  }}
                  placeholder="e.g. DZ Standard Waiver, Medical Clearance"
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={addWaiver}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  Add
                </button>
              </div>
              {form.waivers.length === 0 && (
                <p className="text-xs text-gray-400">
                  No waivers required. Add any waivers participants must sign.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {form.waivers.map((w, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium"
                  >
                    {w}
                    <button
                      type="button"
                      onClick={() => removeWaiver(idx)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* ================================================================
              10. Media
              ================================================================ */}
          <SectionCard
            id="section-media"
            icon={<ImageIcon className="h-5 w-5" />}
            title="Media"
            subtitle="Cover image and gallery"
            open={openSections.media}
            onToggle={() => toggleSection('media')}
            hasErrors={sectionHasErrors('media')}
          >
            <div className="space-y-5">
              <div>
                <label className={labelCls}>Cover Image URL</label>
                <input
                  type="url"
                  name="heroImageUrl"
                  value={form.heroImageUrl}
                  onChange={handleInput}
                  placeholder="https://example.com/cover.jpg"
                  className={inputCls}
                />
                {form.heroImageUrl && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 dark:border-slate-600 max-w-sm relative h-40">
                    <Image
                      src={form.heroImageUrl}
                      alt="Cover preview"
                      fill
                      sizes="384px"
                      unoptimized
                      className="object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>Description Images</label>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addDescriptionImage();
                      }
                    }}
                    placeholder="https://example.com/image.jpg"
                    className={`${inputCls} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={addDescriptionImage}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    Add
                  </button>
                </div>
                {form.descriptionImages.length === 0 && (
                  <p className="text-xs text-gray-400">
                    No additional images added.
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  {form.descriptionImages.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative group w-24 h-24 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 dark:border-slate-600"
                    >
                      <Image
                        src={url}
                        alt={`Gallery ${idx + 1}`}
                        width={96}
                        height={96}
                        unoptimized
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '';
                          (e.target as HTMLImageElement).className =
                            'w-full h-full bg-gray-100 dark:bg-slate-700';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeDescriptionImage(idx)}
                        className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ================================================================
              11. Status
              ================================================================ */}
          <SectionCard
            id="section-status"
            icon={<CircleDot className="h-5 w-5" />}
            title="Status"
            subtitle="Set the initial event status"
            open={openSections.status}
            onToggle={() => toggleSection('status')}
            hasErrors={sectionHasErrors('status')}
          >
            <div className="max-w-sm">
              <label className={labelCls}>Event Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleInput}
                className={selectCls}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Most new events should start as &quot;Draft&quot; until fully
                configured.
              </p>
            </div>
          </SectionCard>
        </div>

        {/* ================================================================
            Bottom action bar
            ================================================================ */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm px-6 py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {errors.length > 0 ? (
              <span className="text-red-500 font-medium">
                {errors.length} validation{' '}
                {errors.length === 1 ? 'error' : 'errors'} remaining
              </span>
            ) : (
              'All fields look good'
            )}
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/boogies"
              className="px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 dark:text-gray-300 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Create Event
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
