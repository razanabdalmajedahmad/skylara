'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Lightbulb, Plus, Filter, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';

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
  } | null;
  reviewedBy?: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  new: { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-200' },
  'under-review': { bg: 'bg-yellow-50', text: 'text-yellow-700', badge: 'bg-yellow-200' },
  planned: { bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-200' },
  'in-progress': { bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-200' },
  done: { bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-200' },
  rejected: { bg: 'bg-gray-50', text: 'text-gray-700', badge: 'bg-gray-200' },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const FALLBACK_IDEAS: Idea[] = [];

/**
 * Normalize API status values to the frontend lowercase/hyphenated format.
 * The Prisma schema stores lowercase values (new, under-review, planned, etc.)
 * but the PATCH route uses uppercase (SUBMITTED, REVIEWED, etc.).
 * Handle both cases for resilience.
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

export default function IdeasPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'review'>('all');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIdeas = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      const queryString = params.toString();
      const endpoint = queryString ? `/ideas?${queryString}` : '/ideas';

      const response = await apiGet<{ success: boolean; data: { ideas: ApiIdea[]; count: number } }>(endpoint);

      if (response.success && response.data?.ideas) {
        setIdeas(response.data.ideas.map(mapApiIdea));
      } else {
        setIdeas([]);
      }
    } catch {
      setIdeas(FALLBACK_IDEAS);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const filteredIdeas = useMemo(() => {
    let filteredList = ideas;

    // Filter by tab (status/priority filters are sent to the API, tab filtering is local)
    if (activeTab === 'mine') {
      const userName = user ? `${user.firstName} ${user.lastName}` : '';
      filteredList = filteredList.filter((idea) => idea.submittedBy === userName);
    } else if (activeTab === 'review') {
      filteredList = filteredList.filter((idea) => idea.status === 'under-review' || idea.status === 'new');
    }

    return filteredList;
  }, [ideas, activeTab, user]);

  const isAdmin = (user?.roles || []).includes('PLATFORM_ADMIN');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ideas & Feedback</h1>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-300 mt-1">Share your feature requests and improvements</p>
        </div>
        <Link
          href="/dashboard/ideas/new"
          className="flex items-center gap-2 px-4 py-3 bg-[#2E86C1] text-white rounded-lg hover:bg-[#1B4F72] transition-colors font-semibold"
        >
          <Plus size={20} />
          Submit New Idea
        </Link>
      </div>

      <div className="p-6">
        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'text-[#2E86C1] border-[#2E86C1]'
                : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900'
            }`}
          >
            All Ideas
          </button>
          <button
            onClick={() => setActiveTab('mine')}
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              activeTab === 'mine'
                ? 'text-[#2E86C1] border-[#2E86C1]'
                : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900'
            }`}
          >
            My Ideas
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('review')}
              className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'review'
                  ? 'text-[#2E86C1] border-[#2E86C1]'
                  : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900'
              }`}
            >
              Review Queue
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Status:</span>
          </div>
          <button
            onClick={() => setStatusFilter(null)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              statusFilter === null
                ? 'bg-[#2E86C1] text-white'
                : 'bg-gray-200 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          {Object.entries(STATUS_COLORS).map(([status, colors]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors capitalize ${
                statusFilter === status
                  ? `${colors.badge} ${colors.text}`
                  : 'bg-gray-200 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
              }`}
            >
              {status.replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700">
            <Loader2 size={36} className="text-[#2E86C1] animate-spin mb-4" />
            <p className="text-gray-600 dark:text-gray-400 dark:text-gray-300 font-medium">Loading ideas...</p>
          </div>
        ) : filteredIdeas.length > 0 ? (
          <div className="space-y-3">
            {filteredIdeas.map((idea) => (
              <Link
                key={idea.id}
                href={`/dashboard/ideas/${idea.id}`}
                className={`block p-4 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 hover:border-[#2E86C1] hover:shadow-md transition-all cursor-pointer ${
                  STATUS_COLORS[idea.status]?.bg || 'bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`text-lg font-semibold ${STATUS_COLORS[idea.status]?.text || 'text-gray-900'}`}>
                        {idea.title}
                      </h3>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          STATUS_COLORS[idea.status]?.badge || 'bg-gray-200'
                        } ${STATUS_COLORS[idea.status]?.text || 'text-gray-700'} capitalize`}
                      >
                        {idea.status.replace('-', ' ')}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded capitalize ${PRIORITY_COLORS[idea.priority] || 'bg-gray-100 text-gray-700'}`}>
                        {idea.priority}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">{idea.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                      <span>{idea.submittedBy}</span>
                      <span>{new Date(idea.submittedDate).toLocaleDateString()}</span>
                      <span className="text-[#2E86C1] font-semibold flex items-center gap-1">
                        <Lightbulb size={14} />
                        {idea.upvotes}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-white dark:bg-slate-800 border border-gray-300">
                    <Lightbulb size={24} className="text-[#2E86C1]" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700">
            <Lightbulb size={48} className="text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {activeTab === 'all' ? 'No ideas yet' : 'No ideas match your filters'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 dark:text-gray-300 text-center max-w-md mb-6">
              {activeTab === 'all'
                ? 'Be the first to share your ideas for improving SkyLara!'
                : 'Try adjusting your filters or submit a new idea.'}
            </p>
            <Link
              href="/dashboard/ideas/new"
              className="flex items-center gap-2 px-4 py-2 bg-[#2E86C1] text-white rounded-lg hover:bg-[#1B4F72] transition-colors"
            >
              <Plus size={18} />
              Submit New Idea
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
