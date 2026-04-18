'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiPut, apiPost } from '@/lib/api';
import {
  Type, AlignLeft, CheckSquare, PenTool, FileSignature, User, Phone,
  Heart, Camera, Settings, Plus, Trash2, GripVertical, ChevronLeft,
  Save, Eye, Upload as UploadIcon, ChevronUp, ChevronDown, Copy,
  Shield, FileText, Mail, Calendar, Hash, ToggleLeft, List,
  Upload, MapPin, X, Loader2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SectionDef {
  id: string;
  key: string;
  type: string;
  label: string;
  content: string;
  required: boolean;
  fields: FieldDef[];
}

interface FieldDef {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  placeholder: string;
  options: string[];
}

// ---------------------------------------------------------------------------
// Section library palette
// ---------------------------------------------------------------------------

const SECTION_LIBRARY = [
  { type: 'heading', label: 'Heading', icon: Type, desc: 'Section title / hero banner' },
  { type: 'paragraph', label: 'Rich Text', icon: AlignLeft, desc: 'Paragraph or intro text' },
  { type: 'clause', label: 'Legal Clause', icon: FileText, desc: 'Clause with agreement checkbox' },
  { type: 'checkbox_group', label: 'Checkbox Group', icon: CheckSquare, desc: 'Multiple acknowledgements' },
  { type: 'initials', label: 'Initials', icon: PenTool, desc: 'Initials field' },
  { type: 'signature', label: 'Signature Block', icon: FileSignature, desc: 'Signature with name and date' },
  { type: 'participant_details', label: 'Participant Details', icon: User, desc: 'Name, email, phone, DOB' },
  { type: 'emergency_contact', label: 'Emergency Contact', icon: Phone, desc: 'Emergency contact info' },
  { type: 'medical_questions', label: 'Medical Declaration', icon: Heart, desc: 'Health questions' },
  { type: 'photo_consent', label: 'Photo/Video Consent', icon: Camera, desc: 'Media release' },
  { type: 'custom_fields', label: 'Custom Fields', icon: Settings, desc: 'Add custom form fields' },
  { type: 'guardian_block', label: 'Guardian Section', icon: Shield, desc: 'Parent/guardian for minors' },
  { type: 'conditional_group', label: 'Conditional Group', icon: ToggleLeft, desc: 'Show/hide based on condition' },
  { type: 'file_upload', label: 'File Upload', icon: Upload, desc: 'Document or photo upload' },
];

const FIELD_TYPES = [
  'text', 'textarea', 'email', 'phone', 'date', 'number',
  'checkbox', 'radio', 'select', 'initials', 'signature',
  'file', 'country', 'date_of_birth',
];

const FIELD_TYPE_ICONS: Record<string, typeof Type> = {
  text: Type, textarea: AlignLeft, email: Mail, phone: Phone,
  date: Calendar, number: Hash, checkbox: CheckSquare, radio: List,
  select: List, initials: PenTool, signature: FileSignature,
  file: Upload, country: MapPin, date_of_birth: Calendar,
};

// Default fields auto-populated when adding known section types
const DEFAULT_FIELDS: Record<string, FieldDef[]> = {
  participant_details: [
    { id: '', key: 'first_name', label: 'First Name', type: 'text', required: true, placeholder: 'Enter first name', options: [] },
    { id: '', key: 'last_name', label: 'Last Name', type: 'text', required: true, placeholder: 'Enter last name', options: [] },
    { id: '', key: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'you@example.com', options: [] },
    { id: '', key: 'phone', label: 'Phone Number', type: 'phone', required: false, placeholder: '+1 (555) 000-0000', options: [] },
    { id: '', key: 'date_of_birth', label: 'Date of Birth', type: 'date_of_birth', required: true, placeholder: 'MM/DD/YYYY', options: [] },
    { id: '', key: 'country', label: 'Country', type: 'country', required: false, placeholder: 'Select country', options: [] },
  ],
  emergency_contact: [
    { id: '', key: 'ec_name', label: 'Contact Name', type: 'text', required: true, placeholder: 'Full name', options: [] },
    { id: '', key: 'ec_relationship', label: 'Relationship', type: 'select', required: true, placeholder: 'Select', options: ['Parent', 'Spouse', 'Sibling', 'Friend', 'Other'] },
    { id: '', key: 'ec_phone', label: 'Contact Phone', type: 'phone', required: true, placeholder: '+1 (555) 000-0000', options: [] },
  ],
  medical_questions: [
    { id: '', key: 'med_fit', label: 'I am physically fit to participate', type: 'checkbox', required: true, placeholder: '', options: [] },
    { id: '', key: 'med_conditions', label: 'Do you have any medical conditions?', type: 'select', required: true, placeholder: '', options: ['No', 'Yes - details below'] },
    { id: '', key: 'med_details', label: 'Medical Details', type: 'textarea', required: false, placeholder: 'Describe any conditions, medications, or allergies', options: [] },
  ],
  guardian_block: [
    { id: '', key: 'guardian_name', label: 'Parent/Guardian Full Name', type: 'text', required: true, placeholder: 'Legal guardian name', options: [] },
    { id: '', key: 'guardian_relationship', label: 'Relationship to Minor', type: 'select', required: true, placeholder: '', options: ['Parent', 'Legal Guardian', 'Other'] },
    { id: '', key: 'guardian_phone', label: 'Guardian Phone', type: 'phone', required: true, placeholder: '+1 (555) 000-0000', options: [] },
    { id: '', key: 'guardian_signature', label: 'Guardian Signature', type: 'signature', required: true, placeholder: 'Type full legal name', options: [] },
  ],
  checkbox_group: [
    { id: '', key: 'ack_1', label: 'I understand and accept the risks involved', type: 'checkbox', required: true, placeholder: '', options: [] },
    { id: '', key: 'ack_2', label: 'I have read and agree to all terms above', type: 'checkbox', required: true, placeholder: '', options: [] },
  ],
  photo_consent: [
    { id: '', key: 'photo_agree', label: 'I consent to photography/video recording', type: 'checkbox', required: false, placeholder: '', options: [] },
  ],
};

const DEFAULT_CONTENT: Record<string, string> = {
  heading: 'Section Title',
  paragraph: '',
  clause: 'I voluntarily assume all risks associated with participation in this activity, including but not limited to serious injury or death. I release and discharge the organization, its officers, employees, and agents from all liability.',
  signature: 'By signing below, I acknowledge that I have read, understood, and agree to all terms and conditions stated in this waiver.',
  photo_consent: 'I hereby grant permission to use my likeness in photographs, videos, and other media for promotional and educational purposes.',
  medical_questions: 'Please disclose any medical conditions, medications, or physical limitations that may affect your participation.',
  conditional_group: 'This section is displayed conditionally based on participant responses.',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stampIds(fields: FieldDef[]): FieldDef[] {
  return fields.map((f, i) => ({ ...f, id: `f${Date.now()}_${i}` }));
}

// ---------------------------------------------------------------------------
// Canvas section preview renderers
// ---------------------------------------------------------------------------

function SectionPreview({ section }: { section: SectionDef }) {
  const t = section.type;

  if (t === 'heading') {
    return (
      <div className="py-1">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">{section.label}</h3>
        {section.content && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{section.content}</p>}
      </div>
    );
  }

  if (t === 'paragraph') {
    return (
      <div className="py-1">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{section.label}</h4>
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">{section.content || 'Enter text content...'}</p>
      </div>
    );
  }

  if (t === 'clause') {
    return (
      <div className="py-1">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{section.label}</h4>
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5">
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">{section.content || 'Legal clause text...'}</p>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-amber-200 dark:border-amber-800">
            <div className="w-4 h-4 rounded border-2 border-amber-400 flex-shrink-0" />
            <span className="text-xs text-amber-700 dark:text-amber-400">I agree to the above terms</span>
          </div>
        </div>
      </div>
    );
  }

  if (t === 'checkbox_group') {
    return (
      <div className="py-1">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">{section.label}</h4>
        {section.content && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{section.content}</p>}
        <div className="space-y-1.5">
          {section.fields.length > 0 ? section.fields.map((f) => (
            <div key={f.id} className="flex items-start gap-2">
              <div className="w-4 h-4 mt-0.5 rounded border-2 border-gray-300 dark:border-slate-600 dark:border-gray-600 flex-shrink-0" />
              <span className="text-xs text-gray-700 dark:text-gray-300">{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}</span>
            </div>
          )) : (
            <p className="text-xs text-gray-400 italic">No checkbox items yet</p>
          )}
        </div>
      </div>
    );
  }

  if (t === 'signature') {
    return (
      <div className="py-1">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{section.label}</h4>
        {section.content && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{section.content}</p>}
        <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg p-3 text-center">
          <FileSignature className="w-5 h-5 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto" />
          <p className="text-[10px] text-gray-400 mt-1">Signature capture area</p>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded px-2 py-1.5">
            <p className="text-[10px] text-gray-400">Printed Name</p>
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded mt-1 w-3/4" />
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded px-2 py-1.5">
            <p className="text-[10px] text-gray-400">Date</p>
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded mt-1 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (t === 'initials') {
    return (
      <div className="py-1">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{section.label}</h4>
        {section.content && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{section.content}</p>}
        <div className="inline-flex items-center gap-2">
          <div className="w-12 h-10 border-2 border-dashed border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded flex items-center justify-center">
            <PenTool className="w-4 h-4 text-gray-300 dark:text-gray-600 dark:text-gray-400" />
          </div>
          <span className="text-[10px] text-gray-400">Initials here</span>
        </div>
      </div>
    );
  }

  // Field-based sections: participant_details, emergency_contact, medical_questions, custom_fields, guardian_block
  if (['participant_details', 'emergency_contact', 'medical_questions', 'custom_fields', 'guardian_block'].includes(t)) {
    return (
      <div className="py-1">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">{section.label}</h4>
        {section.content && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{section.content}</p>}
        {section.fields.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {section.fields.map((f) => {
              const FIcon = FIELD_TYPE_ICONS[f.type] || Type;
              if (f.type === 'checkbox') {
                return (
                  <div key={f.id} className="col-span-2 flex items-start gap-2">
                    <div className="w-3.5 h-3.5 mt-0.5 rounded border-2 border-gray-300 dark:border-slate-600 dark:border-gray-600 flex-shrink-0" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}</span>
                  </div>
                );
              }
              if (f.type === 'textarea') {
                return (
                  <div key={f.id} className="col-span-2">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}</p>
                    <div className="h-8 bg-gray-100 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-slate-700 dark:border-gray-600 px-2 py-1">
                      <p className="text-[10px] text-gray-400">{f.placeholder || '...'}</p>
                    </div>
                  </div>
                );
              }
              if (f.type === 'signature') {
                return (
                  <div key={f.id} className="col-span-2">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}</p>
                    <div className="h-8 border-2 border-dashed border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded flex items-center justify-center">
                      <FileSignature className="w-3.5 h-3.5 text-gray-300" />
                    </div>
                  </div>
                );
              }
              return (
                <div key={f.id} className={f.type === 'email' ? 'col-span-2' : ''}>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}</p>
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-slate-700 dark:border-gray-600 px-2 py-1 h-6">
                    <FIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <p className="text-[10px] text-gray-400 truncate">{f.placeholder || f.type}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No fields configured - click to add</p>
        )}
      </div>
    );
  }

  if (t === 'photo_consent') {
    return (
      <div className="py-1">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{section.label}</h4>
        <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg p-2.5">
          <div className="flex items-start gap-2">
            <Camera className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2">{section.content || 'Photo/video consent text...'}</p>
          </div>
          {section.fields.map((f) => (
            <div key={f.id} className="flex items-center gap-2 mt-2">
              <div className="w-4 h-4 rounded border-2 border-purple-300 dark:border-purple-700 flex-shrink-0" />
              <span className="text-xs text-purple-700 dark:text-purple-400">{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (t === 'conditional_group') {
    return (
      <div className="py-1">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{section.label}</h4>
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5">
          <div className="flex items-center gap-2 mb-1.5">
            <ToggleLeft className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium uppercase">Conditional</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">{section.content || 'Configure condition in settings...'}</p>
          {section.fields.length > 0 && (
            <div className="mt-2 space-y-1 border-t border-blue-200 dark:border-blue-800 pt-2">
              {section.fields.map((f) => (
                <div key={f.id} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-blue-300 rounded-full" />
                  <span className="text-[10px] text-gray-600 dark:text-gray-400">{f.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (t === 'file_upload') {
    return (
      <div className="py-1">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{section.label}</h4>
        {section.content && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{section.content}</p>}
        <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg p-4 text-center">
          <Upload className="w-5 h-5 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto" />
          <p className="text-[10px] text-gray-400 mt-1">Drag & drop or click to upload</p>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="py-1">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{section.label}</h4>
      {section.content && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{section.content}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WaiverBuilderPage() {
  const params = useParams<{ templateId: string }>();
  const router = useRouter();

  const [templateTitle, setTemplateTitle] = useState('');
  const [sections, setSections] = useState<SectionDef[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(true);

  // Drag state
  const dragItem = useRef<string | null>(null);
  const dragOverItem = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    if (params.templateId === 'new') {
      setTemplateTitle('New Waiver Template');
      setSections([
        { id: 's1', key: 'intro', type: 'paragraph', label: 'Introduction', content: 'Enter waiver introduction text here.', required: false, fields: [] },
        { id: 's2', key: 'signature', type: 'signature', label: 'Signature', content: 'By signing below, I acknowledge that I have read, understood, and agree to all terms.', required: true, fields: [] },
      ]);
      setSelectedSectionId('s1');
      setLoadingTemplate(false);
      return;
    }
    (async () => {
      try {
        const data = await apiGet<any>(`/waivers/templates/${params.templateId}`);
        setTemplateTitle(data.title || 'Untitled');
        const latestVersion = data.versions?.[0];
        if (latestVersion?.sections?.length) {
          setSections(latestVersion.sections.map((s: any, i: number) => ({
            id: `s${s.id || i}`,
            key: s.key,
            type: s.sectionType?.toLowerCase()?.replace(/_/g, '_') || 'paragraph',
            label: s.title,
            content: s.content || '',
            required: s.required,
            fields: (s.fields || []).map((f: any) => ({
              id: `f${f.id || f.key}`,
              key: f.key,
              label: f.label,
              type: (f.fieldType || f.type || 'text').toLowerCase(),
              required: f.required,
              placeholder: f.placeholder || '',
              options: f.optionsJson || f.options || [],
            })),
          })));
          setSelectedSectionId(`s${latestVersion.sections[0]?.id || 0}`);
        } else {
          setSections([{ id: 's1', key: 'intro', type: 'paragraph', label: 'Introduction', content: '', required: false, fields: [] }]);
          setSelectedSectionId('s1');
        }
      } catch {
        setTemplateTitle('Waiver Template');
        setSections([{ id: 's1', key: 'intro', type: 'paragraph', label: 'Introduction', content: '', required: false, fields: [] }]);
        setSelectedSectionId('s1');
      }
      setLoadingTemplate(false);
    })();
  }, [params.templateId]);

  const selectedSection = sections.find((s) => s.id === selectedSectionId);

  // --- Section CRUD ---

  const addSection = (type: string) => {
    const id = `s${Date.now()}`;
    const lib = SECTION_LIBRARY.find((s) => s.type === type);
    const defaultFields = DEFAULT_FIELDS[type];
    const newSection: SectionDef = {
      id,
      key: `${type}_${Date.now()}`,
      type,
      label: lib?.label || 'New Section',
      content: DEFAULT_CONTENT[type] || '',
      required: ['signature', 'clause', 'initials'].includes(type),
      fields: defaultFields ? stampIds(defaultFields) : (type === 'custom_fields' ? [{ id: `f${Date.now()}`, key: 'field_1', label: 'New Field', type: 'text', required: false, placeholder: '', options: [] }] : []),
    };
    setSections((prev) => [...prev, newSection]);
    setSelectedSectionId(id);
    setIsDirty(true);
  };

  const duplicateSection = (id: string) => {
    const src = sections.find((s) => s.id === id);
    if (!src) return;
    const newId = `s${Date.now()}`;
    const dup: SectionDef = {
      ...src,
      id: newId,
      key: `${src.key}_copy`,
      label: `${src.label} (Copy)`,
      fields: src.fields.map((f, i) => ({ ...f, id: `f${Date.now()}_${i}` })),
    };
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const newArr = [...prev];
      newArr.splice(idx + 1, 0, dup);
      return newArr;
    });
    setSelectedSectionId(newId);
    setIsDirty(true);
  };

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    if (selectedSectionId === id) setSelectedSectionId(null);
    setIsDirty(true);
  };

  const moveSection = (id: string, dir: 'up' | 'down') => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if ((dir === 'up' && idx === 0) || (dir === 'down' && idx === prev.length - 1)) return prev;
      const newArr = [...prev];
      const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
      [newArr[idx], newArr[swapIdx]] = [newArr[swapIdx], newArr[idx]];
      return newArr;
    });
    setIsDirty(true);
  };

  const updateSection = (id: string, updates: Partial<SectionDef>) => {
    setSections((prev) => prev.map((s) => s.id === id ? { ...s, ...updates } : s));
    setIsDirty(true);
  };

  // --- Drag-and-drop ---

  const handleDragStart = (id: string) => { dragItem.current = id; };
  const handleDragEnter = (id: string) => { dragOverItem.current = id; setDragOverId(id); };
  const handleDragEnd = () => {
    if (dragItem.current && dragOverItem.current && dragItem.current !== dragOverItem.current) {
      setSections((prev) => {
        const from = prev.findIndex((s) => s.id === dragItem.current);
        const to = prev.findIndex((s) => s.id === dragOverItem.current);
        if (from === -1 || to === -1) return prev;
        const newArr = [...prev];
        const [moved] = newArr.splice(from, 1);
        newArr.splice(to, 0, moved);
        return newArr;
      });
      setIsDirty(true);
    }
    dragItem.current = null;
    dragOverItem.current = null;
    setDragOverId(null);
  };

  // --- Field CRUD ---

  const addField = (sectionId: string) => {
    const fid = `f${Date.now()}`;
    setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, fields: [...s.fields, { id: fid, key: `field_${Date.now()}`, label: 'New Field', type: 'text', required: false, placeholder: '', options: [] }] } : s));
    setIsDirty(true);
  };

  const removeField = (sectionId: string, fieldId: string) => {
    setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) } : s));
    setIsDirty(true);
  };

  const updateField = (sectionId: string, fieldId: string, updates: Partial<FieldDef>) => {
    setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, fields: s.fields.map((f) => f.id === fieldId ? { ...f, ...updates } : f) } : s));
    setIsDirty(true);
  };

  const moveField = (sectionId: string, fieldId: string, dir: 'up' | 'down') => {
    setSections((prev) => prev.map((s) => {
      if (s.id !== sectionId) return s;
      const idx = s.fields.findIndex((f) => f.id === fieldId);
      if ((dir === 'up' && idx === 0) || (dir === 'down' && idx === s.fields.length - 1)) return s;
      const newFields = [...s.fields];
      const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
      [newFields[idx], newFields[swapIdx]] = [newFields[swapIdx], newFields[idx]];
      return { ...s, fields: newFields };
    }));
    setIsDirty(true);
  };

  // --- Save / Publish ---

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPut(`/waivers/templates/${params.templateId}/version/content`, {
        title: templateTitle,
        sections: sections.map((s) => ({
          key: s.key, type: s.type, label: s.label, content: s.content, required: s.required,
          fields: s.fields.map((f) => ({ key: f.key, label: f.label, type: f.type, required: f.required, placeholder: f.placeholder, options: f.options })),
        })),
      });
      setIsDirty(false);
    } catch {}
    setSaving(false);
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      if (isDirty) await handleSave();
      await apiPost(`/waivers/templates/${params.templateId}/publish`);
      router.push('/dashboard/waivers');
    } catch {}
    setPublishing(false);
  };

  // --- Loading state ---

  if (loadingTemplate) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" /><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading template...</p></div>
      </div>
    );
  }

  const sectionIcon = (type: string) => {
    const lib = SECTION_LIBRARY.find((s) => s.type === type);
    const Icon = lib?.icon || FileText;
    return <Icon className="w-4 h-4" />;
  };

  // Sections that support content editing
  const CONTENT_SECTIONS = ['paragraph', 'clause', 'photo_consent', 'signature', 'heading', 'medical_questions', 'conditional_group', 'file_upload', 'initials'];
  // Sections that support field editing
  const FIELD_SECTIONS = ['participant_details', 'emergency_contact', 'medical_questions', 'custom_fields', 'checkbox_group', 'guardian_block', 'conditional_group', 'photo_consent'];

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Top bar */}
      <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
          <div>
            <input type="text" value={templateTitle} onChange={(e) => { setTemplateTitle(e.target.value); setIsDirty(true); }} className="text-lg font-bold text-gray-900 dark:text-white bg-transparent border-none focus:outline-none focus:ring-0 p-0" />
            <p className="text-xs text-gray-500 dark:text-gray-400">Template ID: {params.templateId} &middot; {sections.length} sections &middot; {sections.reduce((a, s) => a + s.fields.length, 0)} fields</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded-full">Unsaved</span>}
          <a href={`/sign/skyhighdz/preview`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"><Eye className="w-4 h-4" /> Preview</a>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button onClick={handlePublish} disabled={publishing} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadIcon className="w-4 h-4" />} {publishing ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: Section library */}
        <div className="w-56 bg-white dark:bg-slate-800 dark:bg-gray-800 border-r border-gray-200 dark:border-slate-700 dark:border-gray-700 flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Add Block</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {SECTION_LIBRARY.map((lib) => {
              const Icon = lib.icon;
              return (
                <button key={lib.type} onClick={() => addSection(lib.type)} className="w-full flex items-center gap-2 px-2.5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors text-left group">
                  <div className="w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                    <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-xs leading-tight">{lib.label}</p>
                    <p className="text-[10px] text-gray-400 truncate leading-tight">{lib.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center panel: Canvas */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-2">
            {sections.map((section) => (
              <div
                key={section.id}
                draggable
                onDragStart={() => handleDragStart(section.id)}
                onDragEnter={() => handleDragEnter(section.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => setSelectedSectionId(section.id)}
                className={`bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                  selectedSectionId === section.id
                    ? 'border-blue-500 shadow-md ring-1 ring-blue-200 dark:ring-blue-800'
                    : dragOverId === section.id
                    ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10'
                    : 'border-gray-200 dark:border-slate-700 dark:border-gray-700 hover:border-gray-300 dark:border-slate-600 dark:hover:border-gray-600'
                }`}
              >
                {/* Section toolbar */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 dark:text-gray-400 cursor-grab active:cursor-grabbing" />
                    <span className="text-gray-400">{sectionIcon(section.type)}</span>
                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 dark:text-gray-400 uppercase tracking-wider">{section.type.replace(/_/g, ' ')}</span>
                    {section.required && <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded font-medium">Required</span>}
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100" style={{ opacity: selectedSectionId === section.id ? 1 : undefined }}>
                    <button onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'up'); }} className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Move up"><ChevronUp className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'down'); }} className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Move down"><ChevronDown className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); duplicateSection(section.id); }} className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded" title="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); removeSection(section.id); }} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                {/* Section preview */}
                <SectionPreview section={section} />
              </div>
            ))}

            {/* Add section button */}
            <button onClick={() => addSection('paragraph')} className="w-full border-2 border-dashed border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg p-6 text-center text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors group">
              <Plus className="w-6 h-6 mx-auto mb-1 group-hover:scale-110 transition-transform" />
              <p className="text-sm">Add Section</p>
            </button>
          </div>
        </div>

        {/* Right panel: Settings */}
        <div className="w-80 bg-white dark:bg-slate-800 dark:bg-gray-800 border-l border-gray-200 dark:border-slate-700 dark:border-gray-700 flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {selectedSection ? 'Section Settings' : 'Select a section'}
            </p>
            {selectedSection && (
              <button onClick={() => setSelectedSectionId(null)} className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-400 rounded"><X className="w-3.5 h-3.5" /></button>
            )}
          </div>

          {selectedSection ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Section label */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Label</label>
                <input type="text" value={selectedSection.label} onChange={(e) => updateSection(selectedSection.id, { label: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>

              {/* Section key */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Key <span className="text-gray-400 font-normal">(for API)</span></label>
                <input type="text" value={selectedSection.key} onChange={(e) => updateSection(selectedSection.id, { key: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Section type (read-only) */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
                  {sectionIcon(selectedSection.type)}
                  <span className="capitalize">{selectedSection.type.replace(/_/g, ' ')}</span>
                </div>
              </div>

              {/* Required toggle */}
              <div className="flex items-center justify-between py-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Required</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={selectedSection.required} onChange={(e) => updateSection(selectedSection.id, { required: e.target.checked })} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white dark:bg-slate-800 after:rounded-full after:h-4 after:w-4 after:transition-all" />
                </label>
              </div>

              {/* Divider */}
              <hr className="border-gray-200 dark:border-slate-700 dark:border-gray-700" />

              {/* Content for text-based sections */}
              {CONTENT_SECTIONS.includes(selectedSection.type) && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {selectedSection.type === 'heading' ? 'Subtitle / Description' : 'Content'}
                  </label>
                  <textarea
                    value={selectedSection.content}
                    onChange={(e) => updateSection(selectedSection.id, { content: e.target.value })}
                    rows={selectedSection.type === 'clause' ? 6 : selectedSection.type === 'heading' ? 2 : 4}
                    placeholder={selectedSection.type === 'heading' ? 'Optional subtitle text...' : 'Enter content...'}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-y"
                  />
                </div>
              )}

              {/* Fields editor */}
              {(FIELD_SECTIONS.includes(selectedSection.type) || selectedSection.fields.length > 0) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Fields ({selectedSection.fields.length})</label>
                    <button onClick={() => addField(selectedSection.id)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"><Plus className="w-3 h-3" /> Add</button>
                  </div>
                  {selectedSection.fields.length > 0 ? (
                    <div className="space-y-2">
                      {selectedSection.fields.map((field, fIdx) => {
                        const FIcon = FIELD_TYPE_ICONS[field.type] || Type;
                        return (
                          <div key={field.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2 border border-gray-200 dark:border-slate-700 dark:border-gray-600">
                            {/* Field header */}
                            <div className="flex items-center gap-2">
                              <FIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <input type="text" value={field.label} onChange={(e) => updateField(selectedSection.id, field.id, { label: e.target.value })} className="text-sm font-medium bg-transparent border-none focus:outline-none text-gray-900 dark:text-white flex-1 min-w-0" />
                              <div className="flex items-center gap-0.5 flex-shrink-0">
                                <button onClick={() => moveField(selectedSection.id, field.id, 'up')} disabled={fIdx === 0} className="p-0.5 text-gray-400 hover:text-gray-600 dark:text-gray-400 disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                                <button onClick={() => moveField(selectedSection.id, field.id, 'down')} disabled={fIdx === selectedSection.fields.length - 1} className="p-0.5 text-gray-400 hover:text-gray-600 dark:text-gray-400 disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                                <button onClick={() => removeField(selectedSection.id, field.id)} className="p-0.5 text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            </div>
                            {/* Field config */}
                            <div className="grid grid-cols-2 gap-2">
                              <select value={field.type} onChange={(e) => updateField(selectedSection.id, field.id, { type: e.target.value })} className="text-xs px-2 py-1.5 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-md bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                {FIELD_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                              </select>
                              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                <input type="checkbox" checked={field.required} onChange={(e) => updateField(selectedSection.id, field.id, { required: e.target.checked })} className="w-3.5 h-3.5 rounded border-gray-300 dark:border-slate-600 text-blue-600" />
                                Required
                              </label>
                            </div>
                            {/* Placeholder (for non-checkbox types) */}
                            {field.type !== 'checkbox' && (
                              <input type="text" value={field.placeholder} onChange={(e) => updateField(selectedSection.id, field.id, { placeholder: e.target.value })} placeholder="Placeholder text..." className="w-full text-xs px-2 py-1.5 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-md bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-700 dark:text-gray-300" />
                            )}
                            {/* Options editor for select/radio */}
                            {['select', 'radio'].includes(field.type) && (
                              <div>
                                <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">Options (one per line)</label>
                                <textarea
                                  value={(field.options || []).join('\n')}
                                  onChange={(e) => updateField(selectedSection.id, field.id, { options: e.target.value.split('\n').filter(Boolean) })}
                                  rows={3}
                                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                                  className="w-full text-xs px-2 py-1.5 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-md bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-700 dark:text-gray-300 resize-y"
                                />
                              </div>
                            )}
                            {/* Key (collapsed) */}
                            <input type="text" value={field.key} onChange={(e) => updateField(selectedSection.id, field.id, { key: e.target.value })} className="w-full text-[10px] px-2 py-1 border border-gray-200 dark:border-slate-700 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 font-mono" title="Field key" />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <button onClick={() => addField(selectedSection.id)} className="w-full border border-dashed border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg p-3 text-center text-xs text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors">
                      <Plus className="w-4 h-4 mx-auto mb-1" /> Add Fields
                    </button>
                  )}
                </div>
              )}

              {/* Quick actions */}
              <hr className="border-gray-200 dark:border-slate-700 dark:border-gray-700" />
              <div className="flex gap-2">
                <button onClick={() => duplicateSection(selectedSection.id)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Copy className="w-3.5 h-3.5" /> Duplicate
                </button>
                <button onClick={() => removeSection(selectedSection.id)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center px-4">
              <div>
                <Settings className="w-8 h-8 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Click a section on the canvas to edit its settings</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-1">Or drag blocks from the left panel</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
