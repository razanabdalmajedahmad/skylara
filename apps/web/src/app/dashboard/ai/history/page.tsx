'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  Search,
  Trash2,
  Clock,
  ChevronRight,
  Bot,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiDelete } from '@/lib/api';

interface Conversation {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
}

const FALLBACK_HISTORY: Conversation[] = [];

export default function AIHistoryPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true);
        const res = await apiGet<{ conversations: Conversation[]; total: number }>('/assistant/conversations?take=50');
        if (res?.conversations && res.conversations.length > 0) {
          setConversations(res.conversations);
        } else {
          setConversations([]);
        }
      } catch {
        setConversations(FALLBACK_HISTORY);
      } finally {
        setLoading(false);
      }
    }
    if (user) fetchHistory();
  }, [user]);

  const handleDelete = async (id: string) => {
    try {
      await apiDelete(`/assistant/conversations/${id}`);
    } catch { /* API may not be available */ }
    setConversations(prev => prev.filter(c => c.id !== id));
    setDeleteConfirm(null);
  };

  const filtered = conversations.filter(c =>
    !search || c.title.toLowerCase().includes(search.toLowerCase())
  );

  // Group by date
  const grouped: Record<string, Conversation[]> = {};
  for (const conv of filtered) {
    const d = new Date(conv.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let label: string;
    if (d.toDateString() === today.toDateString()) {
      label = 'Today';
    } else if (d.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday';
    } else if (d.getTime() > today.getTime() - 7 * 86400000) {
      label = 'This Week';
    } else {
      label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(conv);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent p-4 lg:p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <Link href="/dashboard/ai" className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white dark:text-gray-400 dark:hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to AI Hub
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Clock className="w-7 h-7 text-blue-500" /> Conversation History
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{conversations.length} conversations</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Loading history...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              {search ? 'No conversations match your search' : 'No conversations yet'}
            </p>
            <Link href="/dashboard/ai/assistant" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
              Start a Conversation
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([label, convs]) => (
              <div key={label}>
                <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 px-1">{label}</h2>
                <div className="space-y-2">
                  {convs.map(conv => (
                    <div key={conv.id} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 hover:border-gray-300 dark:border-slate-600 dark:hover:border-gray-600 transition-colors group">
                      <Link href={`/dashboard/ai/assistant?conversation=${conv.id}`} className="flex items-center gap-3 p-4">
                        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{conv.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500 dark:text-gray-400">{conv.messageCount} messages</span>
                            <span className="text-xs text-gray-400">
                              {new Date(conv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteConfirm(conv.id); }}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteConfirm(null)}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Conversation</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">This will permanently delete this conversation and all its messages.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
