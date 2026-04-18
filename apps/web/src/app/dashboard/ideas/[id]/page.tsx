'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Lightbulb, MessageCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPatch, apiPost } from '@/lib/api';

interface Idea {
  id: string;
  title: string;
  description: string;
  status: 'new' | 'under-review' | 'planned' | 'in-progress' | 'done' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  module: string;
  submittedBy: string;
  submittedDate: string;
  upvotes: number;
}

interface ApiIdea {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  affectedModule?: string | null;
  tags?: string[];
  adminNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  submittedBy?: {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
  } | null;
  reviewedBy?: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
}

const STATUS_TIMELINE = [
  { status: 'new', label: 'New' },
  { status: 'under-review', label: 'Under Review' },
  { status: 'planned', label: 'Planned' },
  { status: 'in-progress', label: 'In Progress' },
  { status: 'done', label: 'Done' },
];

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  'under-review': 'bg-yellow-100 text-yellow-700',
  planned: 'bg-purple-100 text-purple-700',
  'in-progress': 'bg-orange-100 text-orange-700',
  done: 'bg-green-100 text-green-700',
  rejected: 'bg-gray-100 text-gray-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

/**
 * Map from frontend status values to the API's PATCH status enum.
 * The PATCH route expects uppercase: SUBMITTED, REVIEWED, PLANNED, IN_PROGRESS, COMPLETED, REJECTED.
 */
const STATUS_TO_API: Record<string, string> = {
  new: 'SUBMITTED',
  'under-review': 'REVIEWED',
  planned: 'PLANNED',
  'in-progress': 'IN_PROGRESS',
  done: 'COMPLETED',
  rejected: 'REJECTED',
};

/**
 * Normalize API status values to the frontend lowercase/hyphenated format.
 */
function normalizeStatus(status: string): Idea['status'] {
  const map: Record<string, Idea['status']> = {
    new: 'new',
    submitted: 'new',
    'under-review': 'under-review',
    reviewed: 'under-review',
    planned: 'planned',
    'in-progress': 'in-progress',
    in_progress: 'in-progress',
    done: 'done',
    completed: 'done',
    rejected: 'rejected',
  };
  return map[status.toLowerCase()] || 'new';
}

function normalizePriority(priority: string): Idea['priority'] {
  const lower = priority.toLowerCase();
  if (lower === 'low' || lower === 'medium' || lower === 'high' || lower === 'critical') {
    return lower;
  }
  return 'medium';
}

function mapApiIdea(apiIdea: ApiIdea): Idea {
  const submitterName = apiIdea.submittedBy
    ? `${apiIdea.submittedBy.firstName} ${apiIdea.submittedBy.lastName}`
    : 'Unknown';

  return {
    id: apiIdea.id,
    title: apiIdea.title,
    description: apiIdea.description,
    status: normalizeStatus(apiIdea.status),
    priority: normalizePriority(apiIdea.priority),
    category: apiIdea.category,
    module: apiIdea.affectedModule || '',
    submittedBy: submitterName,
    submittedDate: apiIdea.createdAt,
    upvotes: 0,
  };
}

const FALLBACK_IDEA: Idea = {
  id: '',
  title: '',
  description: '',
  status: 'new',
  priority: 'medium',
  category: '',
  module: '',
  submittedBy: '',
  submittedDate: '',
  upvotes: 0,
};

export default function IdeaDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminStatus, setAdminStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const isAdmin = (user?.roles || []).includes('PLATFORM_ADMIN');

  const fetchIdea = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiGet<{ success: boolean; data: ApiIdea }>(
        `/ideas/${params.id}`
      );

      if (response.success && response.data) {
        const mapped = mapApiIdea(response.data);
        setIdea(mapped);
        setAdminStatus(mapped.status);
        setAdminNotes(response.data.adminNotes || '');
      } else {
        setIdea(FALLBACK_IDEA);
        setAdminStatus(FALLBACK_IDEA.status);
      }
    } catch {
      setIdea(FALLBACK_IDEA);
      setAdminStatus(FALLBACK_IDEA.status);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      fetchIdea();
    }
  }, [params.id, fetchIdea]);

  const handleAdminSave = async () => {
    if (!idea) return;
    try {
      setSaving(true);
      const apiStatus = STATUS_TO_API[adminStatus] || adminStatus;
      const body: Record<string, string> = {};
      if (adminStatus !== idea.status) {
        body.status = apiStatus;
      }
      if (adminNotes) {
        body.adminNotes = adminNotes;
      }

      const response = await apiPatch<{ success: boolean; data: ApiIdea }>(
        `/ideas/${idea.id}`,
        body
      );

      if (response.success && response.data) {
        const mapped = mapApiIdea(response.data);
        setIdea(mapped);
        setAdminStatus(mapped.status);
        setAdminNotes(response.data.adminNotes || '');
      }
    } catch {
      // Silently fail -- the UI stays at its current state
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-transparent flex flex-col items-center justify-center">
        <Loader2 size={36} className="text-[#2E86C1] animate-spin mb-4" />
        <p className="text-gray-600 dark:text-gray-400 dark:text-gray-300 font-medium">Loading idea...</p>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-transparent flex flex-col items-center justify-center">
        <Lightbulb size={48} className="text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Idea not found</h3>
        <Link
          href="/dashboard/ideas"
          className="text-[#2E86C1] hover:text-[#1B4F72] font-semibold"
        >
          Back to Ideas
        </Link>
      </div>
    );
  }

  const currentStatusIndex = STATUS_TIMELINE.findIndex((s) => s.status === idea.status);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6">
        <Link
          href="/dashboard/ideas"
          className="flex items-center gap-2 text-[#2E86C1] hover:text-[#1B4F72] mb-4 font-semibold"
        >
          <ChevronLeft size={20} />
          Back to Ideas
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{idea.title}</h1>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-semibold px-3 py-1 rounded-full capitalize ${STATUS_COLORS[idea.status] || 'bg-gray-100 text-gray-700'}`}>
                {idea.status.replace('-', ' ')}
              </span>
              <span className={`text-sm font-semibold px-3 py-1 rounded-full capitalize ${PRIORITY_COLORS[idea.priority] || 'bg-gray-100 text-gray-700'}`}>
                {idea.priority} Priority
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[#2E86C1] font-semibold text-lg">
            <Lightbulb size={24} />
            {idea.upvotes}
          </div>
        </div>
      </div>

      <div className="p-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="col-span-2">
            {/* Description */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-8 mb-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Description</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{idea.description}</p>
            </div>

            {/* Status Timeline */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-8 mb-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Progress</h2>
              <div className="flex items-center justify-between">
                {STATUS_TIMELINE.map((step, idx) => (
                  <div key={step.status} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white mb-2 ${
                        idx <= currentStatusIndex ? 'bg-[#2E86C1]' : 'bg-gray-300'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 text-center">
                      {step.label}
                    </span>
                    {idx < STATUS_TIMELINE.length - 1 && (
                      <div
                        className={`h-1 w-full mt-4 ${
                          idx < currentStatusIndex ? 'bg-[#2E86C1]' : 'bg-gray-300'
                        }`}
                        style={{ marginLeft: '-50%', marginRight: '-50%' }}
                      ></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Comments Section - Future */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-8">
              <div className="flex items-center gap-2 mb-6">
                <MessageCircle size={24} className="text-gray-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Comments</h2>
              </div>
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                <p className="text-sm">Comments will be available in a future update.</p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-span-1 space-y-6">
            {/* Idea Details */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide font-semibold mb-1">
                    Category
                  </p>
                  <p className="text-gray-900 dark:text-white">{idea.category}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide font-semibold mb-1">
                    Module
                  </p>
                  <p className="text-gray-900 dark:text-white capitalize">{idea.module}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide font-semibold mb-1">
                    Submitted By
                  </p>
                  <p className="text-gray-900 dark:text-white">{idea.submittedBy}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide font-semibold mb-1">
                    Date
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(idea.submittedDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Admin Panel */}
            {isAdmin && (
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                <button
                  onClick={() => setShowAdminPanel(!showAdminPanel)}
                  className="w-full text-left font-semibold text-blue-900 hover:text-blue-700 transition-colors"
                >
                  {showAdminPanel ? '\u25BC' : '\u25B6'} Admin Panel
                </button>

                {showAdminPanel && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Change Status
                      </label>
                      <select
                        value={adminStatus}
                        onChange={(e) => setAdminStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-sm"
                      >
                        {STATUS_TIMELINE.map((step) => (
                          <option key={step.status} value={step.status}>
                            {step.label}
                          </option>
                        ))}
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Internal Notes
                      </label>
                      <textarea
                        placeholder="Add notes for the team..."
                        rows={3}
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>

                    <button
                      onClick={handleAdminSave}
                      disabled={saving}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Action */}
            <button
              onClick={async () => {
                try {
                  await apiPost(`/ideas/${idea.id}/upvote`, {});
                  setIdea((prev) => prev ? { ...prev, upvotes: prev.upvotes + 1 } : prev);
                } catch { /* already upvoted or API unavailable */ }
              }}
              className="w-full px-4 py-3 bg-[#2E86C1] text-white rounded-lg hover:bg-[#1B4F72] transition-colors font-semibold"
            >
              Upvote ({idea.upvotes})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
