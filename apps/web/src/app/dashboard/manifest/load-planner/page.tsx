'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Plane,
  Users,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Shuffle,
  UserPlus,
  Clock,
  Shield,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';

interface LoadSuggestion {
  loadNumber: number | null;
  aircraft: string;
  status: string;
  filled: number;
  capacity: number;
  suggestions: Suggestion[];
}

interface Suggestion {
  id: string;
  type: 'move' | 'add' | 'split' | 'merge' | 'hold' | 'prioritize';
  title: string;
  description: string;
  reason: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  accepted?: boolean;
}

interface QueueJumper {
  id: number;
  name: string;
  type: string;
  discipline?: string;
  jumpCount?: number;
  weight?: number;
  waitTime: string;
}

const SUGGESTION_ICONS: Record<string, typeof Zap> = {
  move: Shuffle,
  add: UserPlus,
  split: Users,
  merge: Users,
  hold: Clock,
  prioritize: Zap,
};

const CONFIDENCE_STYLES: Record<string, string> = {
  HIGH: 'bg-emerald-100 text-emerald-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-gray-100 text-gray-600',
};

export default function LoadPlannerPage() {
  const [loads, setLoads] = useState<LoadSuggestion[]>([]);
  const [queue, setQueue] = useState<QueueJumper[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch active loads and queue from manifest API
      const [loadsRes, queueRes] = await Promise.allSettled([
        apiGet<{ success: boolean; data: any[] }>('/loads?status=FILLING,OPEN&limit=10'),
        apiGet<{ success: boolean; data: any[] }>('/queue'),
      ]);

      if (loadsRes.status === 'fulfilled' && loadsRes.value?.data) {
        // Map to suggestion format — in production, these suggestions come from the AI agent
        const mapped = loadsRes.value.data.map((l: any) => ({
          loadNumber: l.loadNumber,
          aircraft: l.aircraftRegistration || l.aircraft || '',
          status: l.status,
          filled: l.slotsCount ?? l.slots?.length ?? 0,
          capacity: l.maxCapacity || 14,
          suggestions: [], // Live suggestions would come from AI agent
        }));
        setLoads(mapped.length > 0 ? mapped : []);
      } else {
        setLoads([]);
      }

      if (queueRes.status === 'fulfilled' && queueRes.value?.data) {
        setQueue(queueRes.value.data.map((q: any) => ({
          id: q.id,
          name: q.userName || `${q.firstName || ''} ${q.lastName || ''}`.trim(),
          type: q.slotType || 'Regular',
          discipline: q.discipline,
          jumpCount: q.numberOfJumps,
          weight: q.weight,
          waitTime: q.waitingSince ? `${Math.round((Date.now() - new Date(q.waitingSince).getTime()) / 60000)} min` : '?',
        })));
      } else {
        setQueue([]);
      }
    } catch {
      setLoads([]);
      setQueue([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSuggestion = (loadIdx: number, suggestionId: string, action: 'accept' | 'dismiss') => {
    setLoads(prev => prev.map((load, i) =>
      i === loadIdx
        ? { ...load, suggestions: load.suggestions.map(s => s.id === suggestionId ? { ...s, accepted: action === 'accept' } : s) }
        : load
    ));
  };

  return (
    <RouteGuard allowedRoles={ROLE_GROUPS.OPERATIONS}>
    <div className="min-h-screen bg-gray-50 dark:bg-transparent p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <Link href="/dashboard/manifest" className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Manifest
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Zap className="w-7 h-7 text-purple-500" /> Load Planner
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">AI-powered suggestions for load fill, grouping, and scheduling</p>
          </div>
          <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Analyzing loads and queue...</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main: Load Suggestions */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Plane className="w-5 h-5 text-blue-500" /> Active Loads & Suggestions
              </h2>

              {loads.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl border p-8 text-center">
                  <Plane className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No loads currently filling</p>
                </div>
              ) : (
                loads.map((load, loadIdx) => (
                  <div key={loadIdx} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700">
                    {/* Load Header */}
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-4">
                      <Plane className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-white">Load {load.loadNumber || '?'}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{load.status}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{load.aircraft}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-32 bg-gray-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${load.filled / load.capacity >= 0.8 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${(load.filled / load.capacity) * 100}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{load.filled}/{load.capacity} filled</span>
                        </div>
                      </div>
                    </div>

                    {/* Suggestions */}
                    {load.suggestions.length > 0 ? (
                      <div className="p-4 space-y-3">
                        {load.suggestions.map(suggestion => {
                          const Icon = SUGGESTION_ICONS[suggestion.type] || Zap;
                          const isActioned = suggestion.accepted !== undefined;
                          return (
                            <div key={suggestion.id} className={`border rounded-lg p-4 ${isActioned ? 'opacity-50' : 'border-gray-200 dark:border-slate-700 dark:border-gray-700'}`}>
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                                  <Icon className="w-4 h-4 text-purple-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{suggestion.title}</p>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${CONFIDENCE_STYLES[suggestion.confidence]}`}>
                                      {suggestion.confidence}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">{suggestion.description}</p>
                                  <p className="text-[10px] text-gray-400 mt-1 italic">Reason: {suggestion.reason}</p>
                                  <p className="text-[10px] text-gray-400 mt-0.5 italic">Proposed by AI - needs human approval</p>

                                  {!isActioned && (
                                    <div className="flex gap-2 mt-2">
                                      <button
                                        onClick={() => handleSuggestion(loadIdx, suggestion.id, 'accept')}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded text-xs font-semibold"
                                      >
                                        <CheckCircle className="w-3 h-3" /> Accept
                                      </button>
                                      <button
                                        onClick={() => handleSuggestion(loadIdx, suggestion.id, 'dismiss')}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 dark:text-gray-400 rounded text-xs font-semibold"
                                      >
                                        <XCircle className="w-3 h-3" /> Dismiss
                                      </button>
                                    </div>
                                  )}
                                  {isActioned && (
                                    <span className={`text-xs font-semibold ${suggestion.accepted ? 'text-emerald-600' : 'text-gray-400'}`}>
                                      {suggestion.accepted ? 'Accepted' : 'Dismissed'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 text-center">
                        <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">No suggestions — load looks good</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Sidebar: Queue */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-amber-500" /> Jump Queue ({queue.length})
              </h2>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700">
                {queue.length === 0 ? (
                  <div className="p-6 text-center">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Queue is empty</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {queue.map(jumper => (
                      <div key={jumper.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{jumper.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:text-gray-400">{jumper.type}</span>
                            {jumper.discipline && <span className="text-[10px] text-gray-500 dark:text-gray-400">{jumper.discipline}</span>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {jumper.waitTime}
                          </p>
                          {jumper.weight && <p className="text-[10px] text-gray-400">{jumper.weight} lbs</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="mt-4 space-y-2">
                <Link href="/dashboard/manifest/readiness" className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 hover:border-blue-300 text-sm font-medium text-gray-900 dark:text-white">
                  <Shield className="w-4 h-4 text-emerald-500" /> Readiness Board <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                </Link>
                <Link href="/dashboard/manifest/insights" className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 hover:border-blue-300 text-sm font-medium text-gray-900 dark:text-white">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Ops Insights <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </RouteGuard>
  );
}
