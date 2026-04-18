'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  Loader2,
  Briefcase,
  FileText,
  DollarSign,
  Eye,
  HelpCircle,
  Send,
  Save,
} from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Role Basics', icon: Briefcase },
  { id: 2, label: 'Description', icon: FileText },
  { id: 3, label: 'Compensation', icon: DollarSign },
  { id: 4, label: 'Visibility', icon: Eye },
  { id: 5, label: 'Questions', icon: HelpCircle },
  { id: 6, label: 'Review', icon: Send },
];

const ROLE_CATEGORIES = [
  { value: 'TI', label: 'Tandem Instructor' },
  { value: 'AFFI', label: 'AFF Instructor' },
  { value: 'COACH', label: 'Coach' },
  { value: 'PILOT', label: 'Pilot' },
  { value: 'RIGGER', label: 'Rigger' },
  { value: 'MANIFEST_STAFF', label: 'Manifest Staff' },
  { value: 'DZ_MANAGER', label: 'DZ Manager' },
  { value: 'CAMERA', label: 'Camera' },
  { value: 'PACKER', label: 'Packer' },
  { value: 'OTHER', label: 'Other' },
];

const EMPLOYMENT_TYPES = [
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'FREELANCE', label: 'Freelance' },
  { value: 'SEASONAL', label: 'Seasonal' },
];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const LOCATION_MODES = [
  { value: 'ONSITE', label: 'On-Site' },
  { value: 'REMOTE', label: 'Remote' },
  { value: 'HYBRID', label: 'Hybrid' },
];

const VISIBILITY_TYPES = [
  { value: 'PUBLIC', label: 'Public - Visible to everyone' },
  { value: 'INTERNAL', label: 'Internal - Only visible to existing staff' },
  { value: 'TARGETED', label: 'Targeted - Visible to matching candidates' },
  { value: 'UNLISTED', label: 'Unlisted - Accessible only via direct link' },
];

const PAY_PERIODS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
  { value: 'per-jump', label: 'Per Jump' },
];

const TARGET_TYPES = [
  { value: 'role', label: 'Role' },
  { value: 'license', label: 'License Level' },
  { value: 'jumps', label: 'Total Jumps' },
  { value: 'nationality', label: 'Nationality' },
  { value: 'skill', label: 'Skill' },
];

const OPERATORS = [
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Not Equals' },
  { value: 'gt', label: 'Greater Than' },
  { value: 'gte', label: 'Greater Than or Equal' },
  { value: 'lt', label: 'Less Than' },
  { value: 'lte', label: 'Less Than or Equal' },
  { value: 'in', label: 'In (comma-separated)' },
];

interface TargetRule {
  targetType: string;
  operator: string;
  value: string;
}

interface CustomQuestion {
  key: string;
  label: string;
}

interface JobFormData {
  title: string;
  roleCategory: string;
  employmentType: string;
  priority: string;
  locationMode: string;
  city: string;
  country: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  salaryMin: string;
  salaryMax: string;
  currency: string;
  payPeriod: string;
  benefits: string[];
  visibilityType: string;
  targetRules: TargetRule[];
  customQuestions: CustomQuestion[];
  recruiterNote: string;
}

const initialFormData: JobFormData = {
  title: '',
  roleCategory: 'TI',
  employmentType: 'FULL_TIME',
  priority: 'MEDIUM',
  locationMode: 'ONSITE',
  city: '',
  country: '',
  description: '',
  responsibilities: [''],
  requirements: [''],
  salaryMin: '',
  salaryMax: '',
  currency: 'USD',
  payPeriod: 'annual',
  benefits: [''],
  visibilityType: 'PUBLIC',
  targetRules: [],
  customQuestions: [],
  recruiterNote: '',
};

const inputClasses = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';
const selectClasses = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';
const labelClasses = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function NewJobPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<JobFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const updateField = <K extends keyof JobFormData>(key: K, value: JobFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addListItem = (key: 'responsibilities' | 'requirements' | 'benefits') => {
    setForm((prev) => ({ ...prev, [key]: [...prev[key], ''] }));
  };

  const removeListItem = (key: 'responsibilities' | 'requirements' | 'benefits', index: number) => {
    setForm((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));
  };

  const updateListItem = (key: 'responsibilities' | 'requirements' | 'benefits', index: number, value: string) => {
    setForm((prev) => {
      const arr = [...prev[key]];
      arr[index] = value;
      return { ...prev, [key]: arr };
    });
  };

  const addTargetRule = () => {
    setForm((prev) => ({
      ...prev,
      targetRules: [...prev.targetRules, { targetType: 'role', operator: 'eq', value: '' }],
    }));
  };

  const removeTargetRule = (index: number) => {
    setForm((prev) => ({
      ...prev,
      targetRules: prev.targetRules.filter((_, i) => i !== index),
    }));
  };

  const updateTargetRule = (index: number, field: keyof TargetRule, value: string) => {
    setForm((prev) => {
      const rules = [...prev.targetRules];
      rules[index] = { ...rules[index], [field]: value };
      return { ...prev, targetRules: rules };
    });
  };

  const addQuestion = () => {
    setForm((prev) => ({
      ...prev,
      customQuestions: [...prev.customQuestions, { key: '', label: '' }],
    }));
  };

  const removeQuestion = (index: number) => {
    setForm((prev) => ({
      ...prev,
      customQuestions: prev.customQuestions.filter((_, i) => i !== index),
    }));
  };

  const updateQuestion = (index: number, field: keyof CustomQuestion, value: string) => {
    setForm((prev) => {
      const qs = [...prev.customQuestions];
      qs[index] = { ...qs[index], [field]: value };
      return { ...prev, customQuestions: qs };
    });
  };

  const buildPayload = () => {
    const compensation: Record<string, any> = {};
    if (form.salaryMin) compensation.min = Number(form.salaryMin);
    if (form.salaryMax) compensation.max = Number(form.salaryMax);
    if (form.currency) compensation.currency = form.currency;
    if (form.payPeriod) compensation.period = form.payPeriod;

    return {
      title: form.title,
      roleCategory: form.roleCategory,
      employmentType: form.employmentType,
      priority: form.priority,
      locationMode: form.locationMode,
      city: form.city || undefined,
      country: form.country || undefined,
      description: form.description,
      responsibilities: form.responsibilities.filter((r) => r.trim()),
      requirements: form.requirements.filter((r) => r.trim()),
      compensation: Object.keys(compensation).length > 0 ? compensation : undefined,
      benefits: form.benefits.filter((b) => b.trim()),
      visibilityType: form.visibilityType,
      targetRules: form.targetRules.filter((r) => r.value.trim()),
      customQuestions: form.customQuestions.filter((q) => q.key.trim() && q.label.trim()),
      recruiterNote: form.recruiterNote || undefined,
    };
  };

  const handleSave = async (publish: boolean) => {
    if (!form.title.trim()) {
      showToast('Job title is required', 'error');
      setStep(1);
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      const res = await apiPost<{ id: string }>('/careers/jobs', payload);
      const jobId = res.id;

      if (publish && jobId) {
        await apiPost(`/careers/jobs/${jobId}/publish`);
        showToast('Job published successfully');
      } else {
        showToast('Job saved as draft');
      }

      setTimeout(() => {
        router.push('/dashboard/careers/jobs');
      }, 1000);
    } catch (err: any) {
      showToast(err.message || 'Failed to save job', 'error');
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return form.title.trim().length > 0;
      default: return true;
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Role Basics</h3>
            <div>
              <label className={labelClasses}>Job Title *</label>
              <input type="text" className={inputClasses} placeholder="e.g. Senior Tandem Instructor" value={form.title} onChange={(e) => updateField('title', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Role Category *</label>
                <select className={selectClasses} value={form.roleCategory} onChange={(e) => updateField('roleCategory', e.target.value)}>
                  {ROLE_CATEGORIES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClasses}>Employment Type</label>
                <select className={selectClasses} value={form.employmentType} onChange={(e) => updateField('employmentType', e.target.value)}>
                  {EMPLOYMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Priority</label>
                <select className={selectClasses} value={form.priority} onChange={(e) => updateField('priority', e.target.value)}>
                  {PRIORITY_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClasses}>Location Mode</label>
                <select className={selectClasses} value={form.locationMode} onChange={(e) => updateField('locationMode', e.target.value)}>
                  {LOCATION_MODES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>
            {form.locationMode !== 'REMOTE' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>City</label>
                  <input type="text" className={inputClasses} placeholder="e.g. Perris" value={form.city} onChange={(e) => updateField('city', e.target.value)} />
                </div>
                <div>
                  <label className={labelClasses}>Country</label>
                  <input type="text" className={inputClasses} placeholder="e.g. United States" value={form.country} onChange={(e) => updateField('country', e.target.value)} />
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Job Description</h3>
            <div>
              <label className={labelClasses}>Description</label>
              <textarea className={`${inputClasses} min-h-[120px]`} placeholder="Describe the role, team, and what success looks like..." value={form.description} onChange={(e) => updateField('description', e.target.value)} rows={5} />
            </div>
            <div>
              <label className={labelClasses}>Responsibilities</label>
              <div className="space-y-2">
                {form.responsibilities.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" className={inputClasses} placeholder={`Responsibility ${i + 1}`} value={item} onChange={(e) => updateListItem('responsibilities', i, e.target.value)} />
                    {form.responsibilities.length > 1 && (
                      <button onClick={() => removeListItem('responsibilities', i)} className="p-2 text-red-500 hover:text-red-700 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => addListItem('responsibilities')} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">
                  <Plus className="w-3.5 h-3.5" /> Add responsibility
                </button>
              </div>
            </div>
            <div>
              <label className={labelClasses}>Requirements</label>
              <div className="space-y-2">
                {form.requirements.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" className={inputClasses} placeholder={`Requirement ${i + 1}`} value={item} onChange={(e) => updateListItem('requirements', i, e.target.value)} />
                    {form.requirements.length > 1 && (
                      <button onClick={() => removeListItem('requirements', i)} className="p-2 text-red-500 hover:text-red-700 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => addListItem('requirements')} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">
                  <Plus className="w-3.5 h-3.5" /> Add requirement
                </button>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Compensation</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Minimum Salary</label>
                <input type="number" className={inputClasses} placeholder="e.g. 40000" value={form.salaryMin} onChange={(e) => updateField('salaryMin', e.target.value)} />
              </div>
              <div>
                <label className={labelClasses}>Maximum Salary</label>
                <input type="number" className={inputClasses} placeholder="e.g. 65000" value={form.salaryMax} onChange={(e) => updateField('salaryMax', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Currency</label>
                <input type="text" className={inputClasses} placeholder="USD" value={form.currency} onChange={(e) => updateField('currency', e.target.value)} />
              </div>
              <div>
                <label className={labelClasses}>Pay Period</label>
                <select className={selectClasses} value={form.payPeriod} onChange={(e) => updateField('payPeriod', e.target.value)}>
                  {PAY_PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClasses}>Benefits</label>
              <div className="space-y-2">
                {form.benefits.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" className={inputClasses} placeholder={`Benefit ${i + 1} (e.g. Free jump tickets)`} value={item} onChange={(e) => updateListItem('benefits', i, e.target.value)} />
                    {form.benefits.length > 1 && (
                      <button onClick={() => removeListItem('benefits', i)} className="p-2 text-red-500 hover:text-red-700 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => addListItem('benefits')} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">
                  <Plus className="w-3.5 h-3.5" /> Add benefit
                </button>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Visibility & Targeting</h3>
            <div>
              <label className={labelClasses}>Visibility Type</label>
              <select className={selectClasses} value={form.visibilityType} onChange={(e) => updateField('visibilityType', e.target.value)}>
                {VISIBILITY_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>

            {form.visibilityType === 'TARGETED' && (
              <div>
                <label className={labelClasses}>Target Rules</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Define criteria to target specific candidates for this role</p>
                <div className="space-y-3">
                  {form.targetRules.map((rule, i) => (
                    <div key={i} className="flex flex-col sm:flex-row gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <select className={`${selectClasses} sm:w-36`} value={rule.targetType} onChange={(e) => updateTargetRule(i, 'targetType', e.target.value)}>
                        {TARGET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <select className={`${selectClasses} sm:w-44`} value={rule.operator} onChange={(e) => updateTargetRule(i, 'operator', e.target.value)}>
                        {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <input type="text" className={`${inputClasses} flex-1`} placeholder="Value" value={rule.value} onChange={(e) => updateTargetRule(i, 'value', e.target.value)} />
                      <button onClick={() => removeTargetRule(i)} className="p-2 text-red-500 hover:text-red-700 self-center">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button onClick={addTargetRule} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">
                    <Plus className="w-3.5 h-3.5" /> Add target rule
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Application Questions</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Add custom questions that candidates must answer when applying</p>
            <div className="space-y-3">
              {form.customQuestions.map((q, i) => (
                <div key={i} className="flex flex-col sm:flex-row gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 block">Field Key</label>
                    <input type="text" className={inputClasses} placeholder="e.g. total_jumps" value={q.key} onChange={(e) => updateQuestion(i, 'key', e.target.value)} />
                  </div>
                  <div className="flex-[2]">
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 block">Question Label</label>
                    <input type="text" className={inputClasses} placeholder="e.g. How many total jumps do you have?" value={q.label} onChange={(e) => updateQuestion(i, 'label', e.target.value)} />
                  </div>
                  <button onClick={() => removeQuestion(i)} className="p-2 text-red-500 hover:text-red-700 self-end">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button onClick={addQuestion} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">
                <Plus className="w-3.5 h-3.5" /> Add question
              </button>
            </div>
            {form.customQuestions.length === 0 && (
              <div className="text-center py-6 border-2 border-dashed border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-lg">
                <HelpCircle className="w-8 h-8 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500 dark:text-gray-400">No custom questions added yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-1">Questions help screen candidates more effectively</p>
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Review & Publish</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Role Basics</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500 dark:text-gray-400">Title:</span> <span className="text-gray-900 dark:text-white font-medium">{form.title || '---'}</span></div>
                  <div><span className="text-gray-500 dark:text-gray-400">Category:</span> <span className="text-gray-900 dark:text-white">{ROLE_CATEGORIES.find((r) => r.value === form.roleCategory)?.label}</span></div>
                  <div><span className="text-gray-500 dark:text-gray-400">Type:</span> <span className="text-gray-900 dark:text-white">{EMPLOYMENT_TYPES.find((t) => t.value === form.employmentType)?.label}</span></div>
                  <div><span className="text-gray-500 dark:text-gray-400">Priority:</span> <span className="text-gray-900 dark:text-white">{form.priority}</span></div>
                  <div><span className="text-gray-500 dark:text-gray-400">Location:</span> <span className="text-gray-900 dark:text-white">{form.locationMode}{form.city ? ` - ${form.city}` : ''}{form.country ? `, ${form.country}` : ''}</span></div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{form.description || 'No description provided'}</p>
                {form.responsibilities.filter((r) => r.trim()).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Responsibilities:</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                      {form.responsibilities.filter((r) => r.trim()).map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
                {form.requirements.filter((r) => r.trim()).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Requirements:</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                      {form.requirements.filter((r) => r.trim()).map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Compensation</h4>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {form.salaryMin || form.salaryMax ? (
                    <p>{form.currency} {form.salaryMin && Number(form.salaryMin).toLocaleString()}{form.salaryMin && form.salaryMax ? ' - ' : ''}{form.salaryMax && Number(form.salaryMax).toLocaleString()} / {PAY_PERIODS.find((p) => p.value === form.payPeriod)?.label}</p>
                  ) : (
                    <p>No compensation details specified</p>
                  )}
                  {form.benefits.filter((b) => b.trim()).length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Benefits:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {form.benefits.filter((b) => b.trim()).map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Visibility</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{VISIBILITY_TYPES.find((v) => v.value === form.visibilityType)?.label}</p>
                {form.targetRules.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{form.targetRules.length} target rule(s) configured</p>
                )}
              </div>

              {form.customQuestions.filter((q) => q.key && q.label).length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Custom Questions ({form.customQuestions.filter((q) => q.key && q.label).length})</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                    {form.customQuestions.filter((q) => q.key && q.label).map((q, i) => <li key={i}>{q.label}</li>)}
                  </ul>
                </div>
              )}

              <div>
                <label className={labelClasses}>Recruiter Note (internal)</label>
                <textarea className={`${inputClasses} min-h-[80px]`} placeholder="Internal notes about this posting..." value={form.recruiterNote} onChange={(e) => updateField('recruiterNote', e.target.value)} rows={3} />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/careers/jobs')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Post New Job</h2>
      </div>

      {/* Step Indicator */}
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between overflow-x-auto gap-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isCompleted = step > s.id;
            return (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : isCompleted
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.id}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 dark:bg-gray-800 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4" /> Previous
        </button>

        <div className="flex items-center gap-3">
          {step === STEPS.length ? (
            <>
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 dark:bg-gray-800 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save as Draft
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Publish
              </button>
            </>
          ) : (
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
