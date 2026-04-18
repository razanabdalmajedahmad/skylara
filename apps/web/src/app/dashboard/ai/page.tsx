'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bot,
  BookOpen,
  Zap,
  FileText,
  ScrollText,
  Settings,
  Loader2,
  AlertCircle,
  TrendingUp,
  MessageSquare,
  Database,
  Activity,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';

interface AIStats {
  totalKnowledgeArticles: number;
  activeAutomations: number;
  assistantQueriesToday: number;
  promptTemplatesCount: number;
}

interface RecentActivity {
  id: string;
  type: 'query' | 'automation' | 'knowledge' | 'prompt';
  description: string;
  timestamp: string;
}

const FALLBACK_STATS: AIStats = {
  totalKnowledgeArticles: 0,
  activeAutomations: 0,
  assistantQueriesToday: 0,
  promptTemplatesCount: 0,
};

const FALLBACK_ACTIVITY: RecentActivity[] = [];

const AI_SECTIONS = [
  {
    title: 'Assistant',
    description: 'Full AI chat interface with knowledge search and conversation history',
    href: '/dashboard/ai/assistant',
    icon: MessageSquare,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50 dark:bg-blue-900/20',
    textColor: 'text-blue-700 dark:text-blue-300',
  },
  {
    title: 'Rollout Report',
    description: 'Prompt-safe rollout health: usage, fallback rates, limits, and failures',
    href: '/dashboard/ai/rollout',
    icon: BarChart3,
    color: 'bg-indigo-500',
    lightColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    textColor: 'text-indigo-700 dark:text-indigo-300',
  },
  {
    title: 'Org assistant template',
    description: 'Pin portal assistant prompt registry template for your organization (metadata only)',
    href: '/dashboard/ai/org-prompt-template',
    icon: FileText,
    color: 'bg-violet-500',
    lightColor: 'bg-violet-50 dark:bg-violet-900/20',
    textColor: 'text-violet-700 dark:text-violet-300',
  },
  {
    title: 'Recommendations',
    description: 'AI-generated operational insights, readiness alerts, and suggested actions',
    href: '/dashboard/ai/recommendations',
    icon: TrendingUp,
    color: 'bg-amber-500',
    lightColor: 'bg-amber-50 dark:bg-amber-900/20',
    textColor: 'text-amber-700 dark:text-amber-300',
  },
  {
    title: 'Conversation History',
    description: 'Browse, search, and manage past AI conversations',
    href: '/dashboard/ai/history',
    icon: Activity,
    color: 'bg-indigo-500',
    lightColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    textColor: 'text-indigo-700 dark:text-indigo-300',
  },
  {
    title: 'Knowledge Base',
    description: 'Manage help articles, categories, and training content for the AI',
    href: '/dashboard/ai/knowledge',
    icon: BookOpen,
    color: 'bg-emerald-500',
    lightColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    textColor: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    title: 'Automations',
    description: 'Configure automated workflows, reminders, and notification rules',
    href: '/dashboard/ai/automations',
    icon: Zap,
    color: 'bg-orange-500',
    lightColor: 'bg-orange-50 dark:bg-orange-900/20',
    textColor: 'text-orange-700 dark:text-orange-300',
  },
  {
    title: 'Prompt Templates',
    description: 'Edit system prompts, assistant persona, and workflow templates',
    href: '/dashboard/ai/prompts',
    icon: FileText,
    color: 'bg-purple-500',
    lightColor: 'bg-purple-50 dark:bg-purple-900/20',
    textColor: 'text-purple-700 dark:text-purple-300',
  },
  {
    title: 'Logs',
    description: 'View AI activity logs, queries, automation runs, and error history',
    href: '/dashboard/ai/logs',
    icon: ScrollText,
    color: 'bg-slate-500',
    lightColor: 'bg-slate-50 dark:bg-slate-900/20',
    textColor: 'text-slate-700 dark:text-slate-300',
  },
  {
    title: 'Settings',
    description: 'Configure AI behavior, role visibility, escalation, and data boundaries',
    href: '/dashboard/ai/settings',
    icon: Settings,
    color: 'bg-rose-500',
    lightColor: 'bg-rose-50 dark:bg-rose-900/20',
    textColor: 'text-rose-700 dark:text-rose-300',
  },
];

const STAT_CARDS = [
  { key: 'totalKnowledgeArticles' as const, label: 'Knowledge Articles', icon: Database, color: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'activeAutomations' as const, label: 'Active Automations', icon: Zap, color: 'text-amber-600 dark:text-amber-400' },
  { key: 'assistantQueriesToday' as const, label: 'Queries Today', icon: MessageSquare, color: 'text-blue-600 dark:text-blue-400' },
  { key: 'promptTemplatesCount' as const, label: 'Prompt Templates', icon: FileText, color: 'text-purple-600 dark:text-purple-400' },
];

function getActivityIcon(type: RecentActivity['type']) {
  switch (type) {
    case 'query': return MessageSquare;
    case 'automation': return Zap;
    case 'knowledge': return BookOpen;
    case 'prompt': return FileText;
  }
}

function getActivityColor(type: RecentActivity['type']) {
  switch (type) {
    case 'query': return 'text-blue-500';
    case 'automation': return 'text-amber-500';
    case 'knowledge': return 'text-emerald-500';
    case 'prompt': return 'text-purple-500';
  }
}

export default function AIHubPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AIStats>({ totalKnowledgeArticles: 0, activeAutomations: 0, assistantQueriesToday: 0, promptTemplatesCount: 0 });
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, activityRes] = await Promise.allSettled([
          apiGet<{ data: AIStats }>('/ai/stats'),
          apiGet<{ data: RecentActivity[] }>('/ai/activity/recent'),
        ]);

        if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
          setStats(statsRes.value.data);
        }
        if (activityRes.status === 'fulfilled' && activityRes.value?.data) {
          setActivity(activityRes.value.data);
        }
        setError(null);
      } catch (err) {
        setStats(FALLBACK_STATS);
        setActivity(FALLBACK_ACTIVITY);
        setError('Could not load live data. Stats may be unavailable.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Hub</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-300">
              Manage your AI assistant, knowledge base, automations, and more
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {STAT_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.key}
                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <Icon className={`w-5 h-5 ${card.color}`} />
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats[card.key]}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
              </div>
            );
          })}
        </div>

        {/* Section Cards */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sections</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {AI_SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <Link
                  key={section.title}
                  href={section.href}
                  className="group bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200"
                >
                  <div className={`inline-flex p-3 rounded-lg ${section.lightColor} mb-4`}>
                    <Icon className={`w-6 h-6 ${section.textColor}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">
                    {section.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {section.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
            <Link
              href="/dashboard/ai/logs"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all logs
            </Link>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-700">
            {activity.length === 0 ? (
              <div className="p-8 text-center">
                <Activity className="w-8 h-8 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity</p>
              </div>
            ) : (
              activity.map((item) => {
                const Icon = getActivityIcon(item.type);
                const colorClass = getActivityColor(item.type);
                return (
                  <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                    <Icon className={`w-5 h-5 flex-shrink-0 ${colorClass}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white truncate">
                        {item.description}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
