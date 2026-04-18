'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw, ChevronLeft, Users, Zap } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import Link from 'next/link';

interface Assessment {
  registrationId: number;
  participantName: string;
  freefallFitScore: number;
  canopySafetyScore: number;
  tunnelReadinessScore: number;
  gearReadinessScore: number;
  overallScore: number;
  suggestedGroup: string | null;
  suggestedDiscipline: string | null;
  blockers: string[];
  warnings: string[];
  explanation: string;
  confidence: string;
}

const CONFIDENCE_COLORS: Record<string, { bg: string; text: string; icon: any }> = {
  STRONG_FIT: { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: CheckCircle },
  GOOD_FIT: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle },
  NEEDS_REVIEW: { bg: 'bg-amber-100', text: 'text-amber-800', icon: AlertTriangle },
  RISKY: { bg: 'bg-orange-100', text: 'text-orange-800', icon: AlertTriangle },
  BLOCKED: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
};

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 dark:text-gray-400 w-16 text-right">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold w-8 text-right">{score}</span>
    </div>
  );
}

export default function MatchingPage() {
  const params = useParams();
  const boogieId = params?.id as string;
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const fetchAssessments = useCallback(async () => {
    try {
      const res = await apiGet<{ success: boolean; data: Assessment[] }>(`/boogies/${boogieId}/matching`);
      if (res?.data) setAssessments(res.data);
    } catch {} finally { setLoading(false); }
  }, [boogieId]);

  useEffect(() => { void fetchAssessments(); }, [fetchAssessments]);

  const recalculate = async () => {
    setRecalculating(true);
    try {
      const res = await apiPost<{ success: boolean; data: Assessment[] }>(`/boogies/${boogieId}/matching/recalculate`, {});
      if (res?.data) setAssessments(res.data);
    } catch { console.error('Recalculation failed'); }
    finally { setRecalculating(false); }
  };

  const blocked = assessments.filter(a => a.confidence === 'BLOCKED');
  const risky = assessments.filter(a => a.confidence === 'RISKY' || a.confidence === 'NEEDS_REVIEW');
  const good = assessments.filter(a => a.confidence === 'STRONG_FIT' || a.confidence === 'GOOD_FIT');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Link href={`/dashboard/boogies/${boogieId}`} className="text-purple-600 hover:text-purple-700 text-sm flex items-center gap-1 mb-4">
          <ChevronLeft className="h-4 w-4" /> Back to Event
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Shield className="h-7 w-7 text-purple-600" /> Smart Matching & Safety
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{assessments.length} participants assessed</p>
          </div>
          <button
            onClick={recalculate}
            disabled={recalculating}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
            {recalculating ? 'Recalculating...' : 'Recalculate All'}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1"><XCircle className="h-5 w-5 text-red-600" /><span className="text-sm font-bold text-red-800">Blocked</span></div>
            <p className="text-3xl font-bold text-red-700">{blocked.length}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-5 w-5 text-amber-600" /><span className="text-sm font-bold text-amber-800">Needs Review</span></div>
            <p className="text-3xl font-bold text-amber-700">{risky.length}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1"><CheckCircle className="h-5 w-5 text-emerald-600" /><span className="text-sm font-bold text-emerald-800">Ready</span></div>
            <p className="text-3xl font-bold text-emerald-700">{good.length}</p>
          </div>
        </div>

        {/* Warnings Panel */}
        {blocked.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2"><XCircle className="h-5 w-5" /> Safety Blockers ({blocked.length})</h3>
            {blocked.map(a => (
              <div key={a.registrationId} className="text-sm text-red-700 py-1 border-b border-red-100 last:border-0">
                <strong>{a.participantName}</strong>: {a.blockers.join('; ')}
              </div>
            ))}
          </div>
        )}

        {/* Participant Cards */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading assessments...</div>
        ) : assessments.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No approved registrations to assess. Approve registrations first.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assessments.sort((a, b) => {
              const order = ['BLOCKED', 'RISKY', 'NEEDS_REVIEW', 'GOOD_FIT', 'STRONG_FIT'];
              return order.indexOf(a.confidence) - order.indexOf(b.confidence);
            }).map(a => {
              const conf = CONFIDENCE_COLORS[a.confidence] || CONFIDENCE_COLORS.NEEDS_REVIEW;
              const Icon = conf.icon;
              return (
                <div key={a.registrationId} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Left: Name + Badge */}
                    <div className="lg:w-48 flex-shrink-0">
                      <h3 className="font-bold text-gray-900 dark:text-white">{a.participantName}</h3>
                      <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-bold ${conf.bg} ${conf.text}`}>
                        <Icon className="h-3 w-3" /> {a.confidence.replace(/_/g, ' ')}
                      </div>
                      {a.suggestedGroup && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Suggested: <span className="font-medium text-purple-600">{a.suggestedGroup}</span></p>
                      )}
                    </div>

                    {/* Center: Score Bars */}
                    <div className="flex-1 space-y-1.5">
                      <ScoreBar label="Freefall" score={a.freefallFitScore} color={a.freefallFitScore >= 60 ? 'bg-emerald-500' : a.freefallFitScore >= 40 ? 'bg-amber-500' : 'bg-red-500'} />
                      <ScoreBar label="Canopy" score={a.canopySafetyScore} color={a.canopySafetyScore >= 60 ? 'bg-emerald-500' : a.canopySafetyScore >= 40 ? 'bg-amber-500' : 'bg-red-500'} />
                      <ScoreBar label="Tunnel" score={a.tunnelReadinessScore} color={a.tunnelReadinessScore >= 50 ? 'bg-blue-500' : a.tunnelReadinessScore >= 20 ? 'bg-amber-500' : 'bg-gray-400'} />
                      <ScoreBar label="Gear" score={a.gearReadinessScore} color={a.gearReadinessScore >= 70 ? 'bg-emerald-500' : a.gearReadinessScore >= 40 ? 'bg-amber-500' : 'bg-red-500'} />
                      <div className="flex items-center gap-2 pt-1 border-t">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 w-16 text-right font-bold">Overall</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-3">
                          <div className={`h-3 rounded-full ${a.overallScore >= 70 ? 'bg-emerald-600' : a.overallScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${a.overallScore}%` }} />
                        </div>
                        <span className="text-sm font-bold w-8 text-right">{a.overallScore}</span>
                      </div>
                    </div>

                    {/* Right: Blockers + Warnings */}
                    <div className="lg:w-72 flex-shrink-0 space-y-1">
                      {a.blockers.map((b, i) => (
                        <div key={i} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded flex items-start gap-1">
                          <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" /> {b}
                        </div>
                      ))}
                      {a.warnings.map((w, i) => (
                        <div key={i} className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded flex items-start gap-1">
                          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" /> {w}
                        </div>
                      ))}
                      <p className="text-[10px] text-gray-400 italic mt-1">{a.explanation}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
