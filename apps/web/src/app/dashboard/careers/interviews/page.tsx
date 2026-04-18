'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import {
  Video,
  Calendar,
  Clock,
  MapPin,
  Link2,
  User,
  ChevronDown,
  Loader2,
  Inbox,
  CheckCircle,
  XCircle,
  MessageSquare,
  Filter,
  ExternalLink,
  Send,
} from 'lucide-react';

interface Interview {
  id: string;
  applicationId: string;
  applicantName: string;
  applicantEmail: string;
  jobTitle: string;
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
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  CONFIRMED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  NO_SHOW: 'bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-400',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const TYPE_LABELS: Record<string, string> = {
  PHONE: 'Phone Screen',
  VIDEO: 'Video Call',
  ONSITE: 'On-Site',
  PRACTICAL: 'Practical/Jump',
  PANEL: 'Panel Interview',
};

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isUpcoming(dateStr: string): boolean {
  return new Date(dateStr).getTime() > Date.now();
}

function getTimeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff < 0) return 'Past';
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `in ${days}d`;
  if (hours > 0) return `in ${hours}h`;
  const mins = Math.floor(diff / 60000);
  return `in ${mins}m`;
}

const inputClasses = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';
const selectClasses = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

export default function InterviewsPage() {
  const router = useRouter();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Feedback state
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({ rating: 3, summary: '', recommendation: 'ADVANCE' });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchInterviews = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const qs = params.toString();
      const res = await apiGet<{ data: Interview[]; total: number }>(`/careers/interviews${qs ? `?${qs}` : ''}`);
      setInterviews(res.data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load interviews', 'error');
      setInterviews([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchInterviews();
  }, [fetchInterviews]);

  const handleStatusUpdate = async (interviewId: string, status: string) => {
    setActionLoading(interviewId);
    try {
      await apiPatch(`/careers/interviews/${interviewId}`, { status });
      showToast(`Interview ${status.toLowerCase()}`);
      await fetchInterviews();
    } catch (err: any) {
      showToast(err.message || 'Failed to update interview', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackId) return;
    setSubmittingFeedback(true);
    try {
      await apiPost(`/careers/interviews/${feedbackId}/feedback`, feedbackForm);
      showToast('Feedback submitted');
      setFeedbackId(null);
      setFeedbackForm({ rating: 3, summary: '', recommendation: 'ADVANCE' });
      await fetchInterviews();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit feedback', 'error');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const upcoming = interviews.filter((i) => isUpcoming(i.scheduledAt) && i.status !== 'CANCELLED');
  const past = interviews.filter((i) => !isUpcoming(i.scheduledAt) || i.status === 'CANCELLED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Interviews</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-w-[140px]"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {interviews.length} interview{interviews.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-500 dark:text-gray-400">Loading interviews...</span>
        </div>
      ) : interviews.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 py-16 text-center">
          <Video className="w-12 h-12 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No interviews found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-1">
            {statusFilter ? 'Try changing the status filter' : 'Schedule interviews from application detail pages'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" /> Upcoming ({upcoming.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcoming.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()).map((interview) => (
                  <div key={interview.id} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">{interview.applicantName}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{interview.jobTitle}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${STATUS_COLORS[interview.status]}`}>
                          {interview.status}
                        </span>
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{getTimeUntil(interview.scheduledAt)}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Video className="w-3.5 h-3.5 text-gray-400" />
                        <span>{TYPE_LABELS[interview.type] || interview.type}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formatDateTime(interview.scheduledAt)}</span>
                        {interview.timezone && <span className="text-xs text-gray-400">({interview.timezone})</span>}
                      </div>
                      {interview.location && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span>{interview.location}</span>
                        </div>
                      )}
                      {interview.meetingLink && (
                        <div className="flex items-center gap-2">
                          <Link2 className="w-3.5 h-3.5 text-gray-400" />
                          <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-xs flex items-center gap-1">
                            Join Meeting <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {interview.interviewerName && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span>{interview.interviewerName}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                      {interview.status === 'SCHEDULED' && (
                        <button
                          onClick={() => handleStatusUpdate(interview.id, 'CONFIRMED')}
                          disabled={actionLoading === interview.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === interview.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Confirm
                        </button>
                      )}
                      <button
                        onClick={() => handleStatusUpdate(interview.id, 'CANCELLED')}
                        disabled={actionLoading === interview.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === interview.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />} Cancel
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/careers/applications/${interview.applicationId}`)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-md hover:bg-gray-100 transition-colors ml-auto"
                      >
                        View Application <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past / Completed */}
          {past.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-gray-400" /> Past ({past.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {past.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()).map((interview) => (
                  <div key={interview.id} className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-5 opacity-90">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">{interview.applicantName}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{interview.jobTitle}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${STATUS_COLORS[interview.status]}`}>
                        {interview.status}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDateTime(interview.scheduledAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <Video className="w-3.5 h-3.5" />
                        <span>{TYPE_LABELS[interview.type] || interview.type}</span>
                      </div>
                    </div>

                    {interview.feedback && (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Rating: {interview.feedback.rating}/5</span>
                          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                            interview.feedback.recommendation === 'HIRE' ? 'bg-green-100 text-green-700' :
                            interview.feedback.recommendation === 'REJECT' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>{interview.feedback.recommendation}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{interview.feedback.summary}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      {!interview.feedback && interview.status !== 'CANCELLED' && (
                        <button
                          onClick={() => setFeedbackId(interview.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" /> Add Feedback
                        </button>
                      )}
                      <button
                        onClick={() => router.push(`/dashboard/careers/applications/${interview.applicationId}`)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-md hover:bg-gray-100 transition-colors ml-auto"
                      >
                        View Application <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>

                    {feedbackId === interview.id && (
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
                          <button onClick={() => setFeedbackId(null)} className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800">Cancel</button>
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
            </div>
          )}
        </div>
      )}

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
