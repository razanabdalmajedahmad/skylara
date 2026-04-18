'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Wind, Clock, Users, Plus,
} from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';

interface Boogie {
  id: number;
  title: string;
  subtitle: string | null;
  startDate: string;
  endDate: string;
  status: string;
}

interface CalendarBlock {
  id: number;
  title: string;
  blockType: string;
  dayIndex: number;
  startTime: string;
  endTime: string;
  color: string | null;
  notes: string | null;
  instructorIds: number[];
  groupIds: number[];
}

interface Group {
  id: number;
  name: string;
  groupType: string;
  discipline: string | null;
  maxSize: number;
  members: { id: number; registrationId: number; role: string }[];
  instructor: { firstName: string; lastName: string } | null;
}

export default function BoogieTunnelPage() {
  const params = useParams();
  const boogieId = params?.id as string;

  const [boogie, setBoogie] = useState<Boogie | null>(null);
  const [tunnelBlocks, setTunnelBlocks] = useState<CalendarBlock[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state for new tunnel session
  const [formTitle, setFormTitle] = useState('');
  const [formDayIndex, setFormDayIndex] = useState(0);
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('09:15');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!boogieId) return;
    async function load() {
      try {
        const [bRes, cRes, gRes] = await Promise.all([
          apiGet<{ success: boolean; data: Boogie }>(`/boogies/${boogieId}`).catch(() => null),
          apiGet<{ success: boolean; data: CalendarBlock[] }>(`/boogies/${boogieId}/calendar`).catch(() => null),
          apiGet<{ success: boolean; data: Group[] }>(`/boogies/${boogieId}/groups`).catch(() => null),
        ]);
        if (bRes?.data) setBoogie(bRes.data);
        else setError('Could not load boogie details.');
        if (cRes?.data) {
          setTunnelBlocks(cRes.data.filter(b => b.blockType === 'TUNNEL_ROTATION'));
        }
        if (gRes?.data) setGroups(gRes.data);
      } catch {
        setError('Failed to load tunnel session data.');
        setTunnelBlocks([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [boogieId]);

  const eventDays = boogie
    ? Math.max(1, Math.ceil((new Date(boogie.endDate).getTime() - new Date(boogie.startDate).getTime()) / 86400000) + 1)
    : 1;

  const getDayLabel = (dayIndex: number) => {
    if (!boogie) return `Day ${dayIndex + 1}`;
    const dayDate = new Date(new Date(boogie.startDate).getTime() + dayIndex * 86400000);
    return `Day ${dayIndex + 1} — ${dayDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`;
  };

  const handleCreateSession = async () => {
    if (!formTitle.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiPost<{ success: boolean; data: CalendarBlock }>(`/boogies/${boogieId}/calendar/blocks`, {
        title: formTitle,
        blockType: 'TUNNEL_ROTATION',
        dayIndex: formDayIndex,
        startTime: formStartTime,
        endTime: formEndTime,
        notes: formNotes || null,
        color: '#8B5CF6',
      });
      if (res?.data) {
        setTunnelBlocks(prev => [...prev, res.data].sort((a, b) => a.dayIndex - b.dayIndex || a.startTime.localeCompare(b.startTime)));
      }
      setFormTitle('');
      setFormDayIndex(0);
      setFormStartTime('09:00');
      setFormEndTime('09:15');
      setFormNotes('');
      setShowForm(false);
    } catch {
      // Creation failed; user can retry
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading tunnel sessions...</p>
        </div>
      </div>
    );
  }

  if (error && !boogie) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
        <Link href="/dashboard/boogies" className="text-purple-600 hover:text-purple-700 text-sm flex items-center gap-1 mb-4">
          <ChevronLeft className="h-4 w-4" /> Back to Boogies
        </Link>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-gray-200 dark:border-slate-700">
          <Wind className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  // Group blocks by day
  const blocksByDay: Record<number, CalendarBlock[]> = {};
  tunnelBlocks.forEach(b => {
    if (!blocksByDay[b.dayIndex]) blocksByDay[b.dayIndex] = [];
    blocksByDay[b.dayIndex].push(b);
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white p-6 lg:p-8">
        <Link href={`/dashboard/boogies/${boogieId}`} className="text-purple-200 hover:text-white text-sm flex items-center gap-1 mb-3">
          <ChevronLeft className="h-4 w-4" /> Back to {boogie?.title || 'Boogie'}
        </Link>
        <div className="flex items-center gap-3">
          <Wind className="h-8 w-8" />
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Wind Tunnel Sessions</h1>
            {boogie && <p className="text-purple-200 mt-0.5 text-sm">{boogie.title}</p>}
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Sessions', value: tunnelBlocks.length, color: 'text-gray-900' },
            { label: 'Event Days', value: eventDays, color: 'text-blue-700' },
            { label: 'Groups Available', value: groups.length, color: 'text-purple-700' },
            { label: 'Days with Tunnel', value: Object.keys(blocksByDay).length, color: 'text-emerald-700' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color} mt-1`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Add Session Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus className="h-4 w-4" /> Schedule Tunnel Session
          </button>
        </div>

        {/* New Session Form */}
        {showForm && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">New Tunnel Session</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Session Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. Freefly Rotation 1"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:bg-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Day</label>
                <select
                  value={formDayIndex}
                  onChange={e => setFormDayIndex(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:bg-slate-900"
                >
                  {Array.from({ length: eventDays }, (_, i) => (
                    <option key={i} value={i}>{getDayLabel(i)}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Start</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={e => setFormStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:bg-slate-900"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">End</label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={e => setFormEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:bg-slate-900"
                  />
                </div>
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Discipline, coach, group info..."
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:bg-slate-900 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSession}
                disabled={!formTitle.trim() || submitting}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                {submitting ? 'Creating...' : 'Create Session'}
              </button>
            </div>
          </div>
        )}

        {/* Sessions Table */}
        {tunnelBlocks.length === 0 && !showForm ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-gray-200 dark:border-slate-700">
            <Wind className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No wind tunnel sessions scheduled</p>
            <p className="text-sm text-gray-400 mt-1">
              Click &quot;Schedule Tunnel Session&quot; to add tunnel rotations to this boogie.
            </p>
          </div>
        ) : tunnelBlocks.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Day</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Time Slot</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Session</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Notes</th>
                </tr>
              </thead>
              <tbody>
                {tunnelBlocks
                  .sort((a, b) => a.dayIndex - b.dayIndex || a.startTime.localeCompare(b.startTime))
                  .map(block => (
                    <tr key={block.id} className="border-t border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-750">
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
                        {getDayLabel(block.dayIndex)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                          <Clock className="h-3.5 w-3.5" />
                          {block.startTime} — {block.endTime}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-6 rounded-full bg-purple-500 flex-shrink-0" />
                          <span className="font-medium text-gray-900 dark:text-white">{block.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs italic">{block.notes || '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
