'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  MessageSquare,
  Video,
  User,
  Award,
  Globe,
  Plane,
  CheckCircle,
  Clock,
  Send,
  Plus,
  Loader2,
  Inbox,
  Download,
  Shield,
  ChevronDown,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface ApplicationDetail {
  id: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  jobTitle: string;
  jobPostId: string;
  stage: string;
  source: string;
  sourceType: string;
  submittedAt: string;
  profileSnapshot: {
    nationality?: string;
    city?: string;
    country?: string;
    totalJumps?: number;
    licenseLevel?: string;
    skills?: string[];
  } | null;
  coverLetter: string | null;
  answers: Record<string, string> | null;
  salaryExpectation: string | null;
  availableFrom: string | null;
  willingToRelocate: boolean;
  stageHistory: {
    stage: string;
    changedAt: string;
    changedBy: string;
    reason: string | null;
  }[];
  documents: {
    id: string;
    name: string;
    type: string;
    url: string;
    verified: boolean;
    uploadedAt: string;
  }[];
  notes: {
    id: string;
    content: string;
    authorName: string;
    createdAt: string;
  }[];
  interviews: {
    id: string;
    type: string;
    scheduledAt: string;
    timezone: string;
    location: string;
    meetingLink: string;
    status: string;
    interviewerName: string;
    feedback: {
      rating: number;
      summary: string;
      recommendation: string;
    } | null;
  }[];
}

const STAGE_COLORS: Record<string, string> = {
  APPLIED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  INITIAL_REVIEW: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  SHORTLISTED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  INTERVIEW_SCHEDULED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  TECHNICAL_EVALUATION: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  FINAL_REVIEW: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  OFFER: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  HIRED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const ALL_STAGES = [
  'APPLIED', 'INITIAL_REVIEW', 'SHORTLISTED', 'INTERVIEW_SCHEDULED',
  'TECHNICAL_EVALUATION', 'FINAL_REVIEW', 'OFFER', 'HIRED', 'REJECTED',
];

const INTERVIEW_TYPES = [
  { value: 'PHONE', label: 'Phone Screen' },
  { value: 'VIDEO', label: 'Video Call' },
  { value: 'ONSITE', label: 'On-Site' },
  { value: 'PRACTICAL', label: 'Practical/Jump' },
  { value: 'PANEL', label: 'Panel Interview' },
];

function formatStage(stage: string): string {
  return stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const inputClasses = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';
const selectClasses = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params.id as string;

  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'notes' | 'interviews'>('overview');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Stage change
  const [newStage, setNewStage] = useState('');
  const [stageReason, setStageReason] = useState('');
  const [changingStage, setChangingStage] = useState(false);

  // Add note
  const [noteContent, setNoteContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Add interview
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [interviewForm, setInterviewForm] = useState({
    type: 'VIDEO',
    scheduledAt: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    location: '',
    meetingLink: '',
    interviewerName: '',
  });
  const [schedulingInterview, setSchedulingInterview] = useState(false);

  // Feedback form
  const [feedbackInterviewId, setFeedbackInterviewId] = useState<string | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({ rating: 3, summary: '', recommendation: 'ADVANCE' });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchApp = useCallback(async () => {
    try {
      const res = await apiGet<ApplicationDetail>(`/careers/applications/${appId}`);
      setApp(res);
      setNewStage(res.stage);
    } catch (err: any) {
      showToast(err.message || 'Failed to load application', 'error');
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  const handleStageChange = async () => {
    if (!newStage || newStage === app?.stage) return;
    setChangingStage(true);
    try {
      await apiPatch(`/careers/applications/${appId}/stage`, {
        stage: newStage,
        reason: stageReason || undefined,
      });
      showToast(`Stage updated to ${formatStage(newStage)}`);
      setStageReason('');
      await fetchApp();
    } catch (err: any) {
      showToast(err.message || 'Failed to update stage', 'error');
    } finally {
      setChangingStage(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    setAddingNote(true);
    try {
      await apiPost(`/careers/applications/${appId}/note`, { content: noteContent });
      showToast('Note added');
      setNoteContent('');
      await fetchApp();
    } catch (err: any) {
      showToast(err.message || 'Failed to add note', 'error');
    } finally {
      setAddingNote(false);
    }
  };

  const handleScheduleInterview = async () => {
    if (!interviewForm.scheduledAt) {
      showToast('Please select a date and time', 'error');
      return;
    }
    setSchedulingInterview(true);
    try {
      await apiPost(`/careers/applications/${appId}/interviews`, interviewForm);
      showToast('Interview scheduled');
      setShowInterviewForm(false);
      setInterviewForm({ type: 'VIDEO', scheduledAt: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, location: '', meetingLink: '', interviewerName: '' });
      await fetchApp();
    } catch (err: any) {
      showToast(err.message || 'Failed to schedule interview', 'error');
    } finally {
      setSchedulingInterview(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackInterviewId) return;
    setSubmittingFeedback(true);
    try {
      await apiPost(`/careers/interviews/${feedbackInterviewId}/feedback`, feedbackForm);
      showToast('Feedback submitted');
      setFeedbackInterviewId(null);
      setFeedbackForm({ rating: 3, summary: '', recommendation: 'ADVANCE' });
      await fetchApp();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit feedback', 'error');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading application...</span>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="text-center py-20">
        <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">Application not found</p>
        <button onClick={() => router.push('/dashboard/careers/applications')} className="mt-4 text-sm text-blue-600 hover:underline">
          Back to Applications
        </button>
      </div>
    );
  }

  const profile = app.profileSnapshot;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/careers/applications')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{app.applicantName}</h2>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {app.applicantEmail}</span>
            {app.applicantPhone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {app.applicantPhone}</span>}
            <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {app.sourceType || app.source || 'Direct'}</span>
          </div>
        </div>
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${STAGE_COLORS[app.stage]}`}>
          {formatStage(app.stage)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Snapshot */}
          {profile && (
            <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Profile Snapshot</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {profile.nationality && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Nationality</p>
                      <p className="text-sm text-gray-900 dark:text-white">{profile.nationality}</p>
                    </div>
                  </div>
                )}
                {(profile.city || profile.country) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Location</p>
                      <p className="text-sm text-gray-900 dark:text-white">{[profile.city, profile.country].filter(Boolean).join(', ')}</p>
                    </div>
                  </div>
                )}
                {profile.totalJumps !== undefined && (
                  <div className="flex items-center gap-2">
                    <Plane className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total Jumps</p>
                      <p className="text-sm text-gray-900 dark:text-white">{profile.totalJumps?.toLocaleString()}</p>
                    </div>
                  </div>
                )}
                {profile.licenseLevel && (
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">License</p>
                      <p className="text-sm text-gray-900 dark:text-white">{profile.licenseLevel}</p>
                    </div>
                  </div>
                )}
                {profile.skills && profile.skills.length > 0 && (
                  <div className="col-span-2 flex items-start gap-2">
                    <Shield className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Skills</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {profile.skills.map((s) => (
                          <span key={s} className="px-2 py-0.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stage Timeline */}
          {app.stageHistory && app.stageHistory.length > 0 && (
            <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Stage Timeline</h3>
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gray-200 dark:bg-gray-700" />
                {app.stageHistory.map((event, i) => (
                  <div key={i} className="relative">
                    <div className={`absolute -left-4 top-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                      i === 0 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${STAGE_COLORS[event.stage] || 'bg-gray-100 text-gray-600'}`}>
                          {formatStage(event.stage)}
                        </span>
                        <span className="text-xs text-gray-400">{formatDateTime(event.changedAt)}</span>
                      </div>
                      {event.changedBy && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">by {event.changedBy}</p>}
                      {event.reason && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 italic">{event.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
            <div className="flex gap-1">
              {[
                { id: 'overview' as const, label: 'Overview', icon: User },
                { id: 'documents' as const, label: 'Documents', icon: FileText },
                { id: 'notes' as const, label: `Notes (${app.notes?.length || 0})`, icon: MessageSquare },
                { id: 'interviews' as const, label: `Interviews (${app.interviews?.length || 0})`, icon: Video },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5 space-y-5">
              {app.coverLetter && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Cover Letter</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{app.coverLetter}</p>
                </div>
              )}

              {app.answers && Object.keys(app.answers).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Application Answers</h4>
                  <div className="space-y-3">
                    {Object.entries(app.answers).map(([key, value]) => (
                      <div key={key} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                        <p className="text-sm text-gray-900 dark:text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {app.salaryExpectation && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Salary Expectation</p>
                    <p className="text-sm text-gray-900 dark:text-white font-medium">{app.salaryExpectation}</p>
                  </div>
                )}
                {app.availableFrom && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Available From</p>
                    <p className="text-sm text-gray-900 dark:text-white">{formatDate(app.availableFrom)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Willing to Relocate</p>
                  <p className="text-sm text-gray-900 dark:text-white">{app.willingToRelocate ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {!app.coverLetter && !app.answers && !app.salaryExpectation && (
                <div className="text-center py-6">
                  <Inbox className="w-8 h-8 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No additional overview information available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5">
              {app.documents && app.documents.length > 0 ? (
                <div className="space-y-3">
                  {app.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{doc.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{doc.type} - {formatDate(doc.uploadedAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.verified ? (
                          <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3.5 h-3.5" /> Verified</span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-yellow-600"><Clock className="w-3.5 h-3.5" /> Pending</span>
                        )}
                        {doc.url && (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md">
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No documents uploaded</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Add Note</h4>
                <textarea className={`${inputClasses} min-h-[80px]`} placeholder="Type your note here..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} rows={3} />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleAddNote}
                    disabled={addingNote || !noteContent.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Add Note
                  </button>
                </div>
              </div>

              {app.notes && app.notes.length > 0 ? (
                <div className="space-y-3">
                  {app.notes.map((note) => (
                    <div key={note.id} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{note.authorName}</span>
                        <span className="text-xs text-gray-400">{formatDateTime(note.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-8 text-center">
                  <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No notes yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'interviews' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowInterviewForm(!showInterviewForm)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Schedule Interview
                </button>
              </div>

              {showInterviewForm && (
                <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800 p-5 space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">New Interview</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
                      <select className={selectClasses} value={interviewForm.type} onChange={(e) => setInterviewForm((p) => ({ ...p, type: e.target.value }))}>
                        {INTERVIEW_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date & Time</label>
                      <input type="datetime-local" className={inputClasses} value={interviewForm.scheduledAt} onChange={(e) => setInterviewForm((p) => ({ ...p, scheduledAt: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Location</label>
                      <input type="text" className={inputClasses} placeholder="e.g. DZ Office" value={interviewForm.location} onChange={(e) => setInterviewForm((p) => ({ ...p, location: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Meeting Link</label>
                      <input type="text" className={inputClasses} placeholder="https://meet.google.com/..." value={interviewForm.meetingLink} onChange={(e) => setInterviewForm((p) => ({ ...p, meetingLink: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Interviewer Name</label>
                      <input type="text" className={inputClasses} placeholder="John Doe" value={interviewForm.interviewerName} onChange={(e) => setInterviewForm((p) => ({ ...p, interviewerName: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Timezone</label>
                      <input type="text" className={inputClasses} value={interviewForm.timezone} onChange={(e) => setInterviewForm((p) => ({ ...p, timezone: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowInterviewForm(false)} className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800">Cancel</button>
                    <button
                      onClick={handleScheduleInterview}
                      disabled={schedulingInterview}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {schedulingInterview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />} Schedule
                    </button>
                  </div>
                </div>
              )}

              {app.interviews && app.interviews.length > 0 ? (
                <div className="space-y-3">
                  {app.interviews.map((interview) => (
                    <div key={interview.id} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{interview.type} Interview</span>
                            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                              interview.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                              interview.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                              interview.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>{interview.status}</span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {formatDateTime(interview.scheduledAt)}
                            {interview.timezone && <span className="text-gray-400">({interview.timezone})</span>}
                          </p>
                          {interview.interviewerName && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Interviewer: {interview.interviewerName}</p>}
                          {interview.location && <p className="text-xs text-gray-500 dark:text-gray-400">Location: {interview.location}</p>}
                          {interview.meetingLink && (
                            <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-0.5 block">
                              Join Meeting
                            </a>
                          )}
                        </div>
                        {!interview.feedback && interview.status !== 'CANCELLED' && (
                          <button
                            onClick={() => setFeedbackInterviewId(interview.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Add Feedback
                          </button>
                        )}
                      </div>

                      {interview.feedback && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700 dark:border-gray-700">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Rating: {interview.feedback.rating}/5</span>
                            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                              interview.feedback.recommendation === 'HIRE' ? 'bg-green-100 text-green-700' :
                              interview.feedback.recommendation === 'REJECT' ? 'bg-red-100 text-red-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>{interview.feedback.recommendation}</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{interview.feedback.summary}</p>
                        </div>
                      )}

                      {feedbackInterviewId === interview.id && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700 dark:border-gray-700 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Rating (1-5)</label>
                              <input type="number" min="1" max="5" className={inputClasses} value={feedbackForm.rating} onChange={(e) => setFeedbackForm((p) => ({ ...p, rating: Number(e.target.value) }))} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Recommendation</label>
                              <select className={selectClasses} value={feedbackForm.recommendation} onChange={(e) => setFeedbackForm((p) => ({ ...p, recommendation: e.target.value }))}>
                                <option value="ADVANCE">Advance</option>
                                <option value="HIRE">Hire</option>
                                <option value="HOLD">Hold</option>
                                <option value="REJECT">Reject</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Summary</label>
                            <textarea className={`${inputClasses} min-h-[60px]`} placeholder="Interview feedback summary..." value={feedbackForm.summary} onChange={(e) => setFeedbackForm((p) => ({ ...p, summary: e.target.value }))} rows={2} />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setFeedbackInterviewId(null)} className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800">Cancel</button>
                            <button
                              onClick={handleSubmitFeedback}
                              disabled={submittingFeedback}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                              {submittingFeedback ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Submit
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-8 text-center">
                  <Video className="w-10 h-10 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No interviews scheduled</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Stage Change */}
          <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Change Stage</h3>
            <div className="space-y-3">
              <div className="relative">
                <select className={selectClasses} value={newStage} onChange={(e) => setNewStage(e.target.value)}>
                  {ALL_STAGES.map((s) => (
                    <option key={s} value={s}>{formatStage(s)}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <input
                type="text"
                className={inputClasses}
                placeholder="Reason (optional)"
                value={stageReason}
                onChange={(e) => setStageReason(e.target.value)}
              />
              <button
                onClick={handleStageChange}
                disabled={changingStage || newStage === app.stage}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {changingStage ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Update Stage
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => { setActiveTab('interviews'); setShowInterviewForm(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Video className="w-4 h-4 text-blue-500" /> Schedule Interview
              </button>
              <button
                onClick={() => {
                  setNewStage('REJECTED');
                  handleStageChange();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <XCircle className="w-4 h-4" /> Reject Candidate
              </button>
            </div>
          </div>

          {/* Application Info */}
          <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Application Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Job</span>
                <button onClick={() => router.push(`/dashboard/careers/jobs/${app.jobPostId}`)} className="text-blue-600 hover:underline truncate ml-2">{app.jobTitle}</button>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Submitted</span>
                <span className="text-gray-900 dark:text-white">{formatDate(app.submittedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Source</span>
                <span className="text-gray-900 dark:text-white">{app.sourceType || app.source || 'Direct'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Documents</span>
                <span className="text-gray-900 dark:text-white">{app.documents?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Interviews</span>
                <span className="text-gray-900 dark:text-white">{app.interviews?.length || 0}</span>
              </div>
            </div>
          </div>
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
