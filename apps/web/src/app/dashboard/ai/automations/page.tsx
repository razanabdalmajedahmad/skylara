'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Zap,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Search,
  Clock,
  Play,
  Pause,
  Bell,
  UserCheck,
  FileWarning,
  Calendar,
  ClipboardList,
  TrendingUp,
  CreditCard,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  Activity,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  action: string;
  status: 'active' | 'paused';
  lastTriggered: string | null;
  triggerCount: number;
  category: string;
  isTemplate: boolean;
}

const FALLBACK_AUTOMATIONS: AutomationRule[] = [];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Safety: FileWarning,
  Onboarding: UserCheck,
  Events: Calendar,
  Operations: ClipboardList,
  Training: TrendingUp,
  Payments: CreditCard,
};

export default function AutomationsPage() {
  const { user } = useAuth();
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAutomations = async () => {
      try {
        setLoading(true);
        const response = await apiGet<{ data: AutomationRule[] }>('/ai/automations');
        if (response?.data && Array.isArray(response.data)) {
          setAutomations(response.data);
        } else {
          setAutomations([]);
        }
      } catch {
        setAutomations(FALLBACK_AUTOMATIONS);
      } finally {
        setLoading(false);
      }
    };

    fetchAutomations();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(automations.map((a) => a.category));
    return Array.from(cats).sort();
  }, [automations]);

  const filteredAutomations = useMemo(() => {
    return automations.filter((auto) => {
      const matchesSearch =
        auto.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        auto.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || auto.category === filterCategory;
      const matchesStatus = filterStatus === 'all' || auto.status === filterStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [automations, searchQuery, filterCategory, filterStatus]);

  const handleToggle = async (automationId: string) => {
    setTogglingId(automationId);
    const automation = automations.find((a) => a.id === automationId);
    if (!automation) return;

    const newStatus = automation.status === 'active' ? 'paused' : 'active';

    try {
      await apiPost(`/ai/automations/${automationId}/toggle`, { status: newStatus });
    } catch (err) {
      // proceed with local update
    }

    setAutomations((prev) =>
      prev.map((a) => (a.id === automationId ? { ...a, status: newStatus } : a))
    );
    setTogglingId(null);
  };

  const activeCount = automations.filter((a) => a.status === 'active').length;
  const pausedCount = automations.filter((a) => a.status === 'paused').length;
  const totalTriggers = automations.reduce((sum, a) => sum + a.triggerCount, 0);

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
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <Zap className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Automations</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-300">
              Manage automated workflows, reminders, and notification rules
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl p-4 flex items-center gap-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Play className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{activeCount}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl p-4 flex items-center gap-4">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Pause className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{pausedCount}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Paused</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl p-4 flex items-center gap-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalTriggers.toLocaleString()}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Triggers</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search automations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </div>

        {/* Automations List */}
        <div className="space-y-3">
          {filteredAutomations.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl p-12 text-center">
              <Zap className="w-10 h-10 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No automations found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your filters</p>
            </div>
          ) : (
            filteredAutomations.map((automation) => {
              const CategoryIcon = CATEGORY_ICONS[automation.category] || Zap;
              return (
                <div
                  key={automation.id}
                  className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-xl p-5 hover:border-gray-300 dark:border-slate-600 dark:hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <CategoryIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                              {automation.name}
                            </h3>
                            {automation.isTemplate && (
                              <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                                Template
                              </span>
                            )}
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                              automation.status === 'active'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-400'
                            }`}>
                              {automation.status === 'active' ? 'Active' : 'Paused'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {automation.description}
                          </p>
                        </div>

                        {/* Toggle */}
                        <button
                          onClick={() => handleToggle(automation.id)}
                          disabled={togglingId === automation.id}
                          className="flex-shrink-0 transition-colors"
                          title={automation.status === 'active' ? 'Pause automation' : 'Enable automation'}
                        >
                          {togglingId === automation.id ? (
                            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                          ) : automation.status === 'active' ? (
                            <ToggleRight className="w-10 h-10 text-green-500" />
                          ) : (
                            <ToggleLeft className="w-10 h-10 text-gray-400" />
                          )}
                        </button>
                      </div>

                      {/* Details row */}
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          <span>Trigger: {automation.trigger}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Bell className="w-3 h-3" />
                          <span>Action: {automation.action}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {automation.triggerCount} times triggered
                        </span>
                        {automation.lastTriggered && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Last: {new Date(automation.lastTriggered).toLocaleDateString()}{' '}
                            {new Date(automation.lastTriggered).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                          {automation.category}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
