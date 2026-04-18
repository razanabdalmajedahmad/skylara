'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  FileText,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Search,
  Save,
  Edit3,
  X,
  Check,
  Tag,
  Clock,
  User,
  Shield,
  Workflow,
  MessageSquare,
  UserCheck,
  Headphones,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api';
import { logger } from '@/lib/logger';

interface PromptTemplate {
  id: string;
  name: string;
  type: 'system' | 'user' | 'workflow';
  category: string;
  roleScope: string[];
  content: string;
  lastModified: string;
  modifiedBy: string;
}

type PromptType = 'system' | 'user' | 'workflow';
type PromptCategory = 'Assistant Persona' | 'Onboarding' | 'Support' | 'Workflow' | 'Escalation';

const CATEGORIES: PromptCategory[] = ['Assistant Persona', 'Onboarding', 'Support', 'Workflow', 'Escalation'];
const TYPES: PromptType[] = ['system', 'user', 'workflow'];
const ROLES = ['admin', 'dzo', 'jump_master', 'instructor', 'safety_officer', 'packer', 'athlete'];

const TYPE_CONFIG: Record<PromptType, { label: string; className: string; icon: React.ElementType }> = {
  system: { label: 'System', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: Shield },
  user: { label: 'User', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: User },
  workflow: { label: 'Workflow', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Workflow },
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Assistant Persona': MessageSquare,
  'Onboarding': UserCheck,
  'Support': Headphones,
  'Workflow': Workflow,
  'Escalation': AlertTriangle,
};

const FALLBACK_PROMPTS: PromptTemplate[] = [];

export default function PromptsPage() {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        setLoading(true);
        const response = await apiGet<{ data: PromptTemplate[] }>('/ai/prompts');
        if (response?.data && Array.isArray(response.data)) {
          setPrompts(response.data);
        } else {
          setPrompts([]);
        }
      } catch (err) {
        logger.error('Failed to fetch prompts', { page: 'ai-prompts' });
        setPrompts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPrompts();
  }, []);

  const filteredPrompts = useMemo(() => {
    return prompts.filter((prompt) => {
      const matchesSearch =
        prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prompt.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || prompt.type === filterType;
      const matchesCategory = filterCategory === 'all' || prompt.category === filterCategory;
      return matchesSearch && matchesType && matchesCategory;
    });
  }, [prompts, searchQuery, filterType, filterCategory]);

  const handleEdit = (prompt: PromptTemplate) => {
    setEditingId(prompt.id);
    setEditContent(prompt.content);
    setExpandedId(prompt.id);
  };

  const handleSave = async (promptId: string) => {
    setSaving(true);
    try {
      await apiPost(`/ai/prompts/${promptId}`, { content: editContent });
    } catch (err) {
      // proceed with local update
    }

    setPrompts((prev) =>
      prev.map((p) =>
        p.id === promptId
          ? { ...p, content: editContent, lastModified: new Date().toISOString(), modifiedBy: user?.firstName || 'You' }
          : p
      )
    );
    setEditingId(null);
    setEditContent('');
    setSaving(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 p-6">
        <Link
          href="/dashboard/ai"
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white dark:hover:text-white mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to AI Hub
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prompt Templates</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-300">
              {prompts.length} templates across {CATEGORIES.length} categories
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Prompts List */}
        <div className="space-y-3">
          {filteredPrompts.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl p-12 text-center">
              <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No prompts found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your filters</p>
            </div>
          ) : (
            filteredPrompts.map((prompt) => {
              const TypeIcon = TYPE_CONFIG[prompt.type].icon;
              const CatIcon = CATEGORY_ICONS[prompt.category] || FileText;
              const isExpanded = expandedId === prompt.id;
              const isEditing = editingId === prompt.id;

              return (
                <div
                  key={prompt.id}
                  className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl overflow-hidden"
                >
                  {/* Header Row */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{prompt.name}</h3>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1 ${TYPE_CONFIG[prompt.type].className}`}>
                            <TypeIcon className="w-3 h-3" />
                            {TYPE_CONFIG[prompt.type].label}
                          </span>
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded flex items-center gap-1">
                            <CatIcon className="w-3 h-3" />
                            {prompt.category}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Modified {new Date(prompt.lastModified).toLocaleDateString()} by {prompt.modifiedBy}
                          </span>
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            Roles: {prompt.roleScope.length === ROLES.length ? 'All' : prompt.roleScope.join(', ')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleCopy(prompt.content, prompt.id)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Copy"
                        >
                          {copiedId === prompt.id ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        {!isEditing && (
                          <button
                            onClick={() => handleEdit(prompt)}
                            className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setExpandedId(isExpanded && !isEditing ? null : prompt.id)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-700 p-5 bg-gray-50 dark:bg-gray-800/50">
                      {isEditing ? (
                        <div className="space-y-3">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={8}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                          />
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={handleCancelEdit}
                              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSave(prompt.id)}
                              disabled={saving}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              Save Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                          {prompt.content}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
