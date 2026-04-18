'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, RotateCw, Clock, Users, Plus,
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
  groupIds: number[];
  instructorIds: number[];
}

interface Group {
  id: number;
  name: string;
  groupType: string;
  discipline: string | null;
  maxSize: number;
  isLocked: boolean;
  members: { id: number; registrationId: number; role: string }[];
  instructor: { firstName: string; lastName: string } | null;
}

interface RotationEntry {
  id: number;
  rotationNumber: number;
  dayIndex: number;
  startTime: string;
  endTime: string;
  title: string;
  notes: string | null;
  groupIds: number[];
  groups: Group[];
}

const JUMP_TYPE_COLORS: Record<string, string> = {
  BELLY: 'bg-blue-100 text-blue-700',
  FREEFLY: 'bg-purple-100 text-purple-700',
  ANGLE: 'bg-teal-100 text-teal-700',
  TRACKING: 'bg-cyan-100 text-cyan-700',
  WINGSUIT: 'bg-violet-100 text-violet-700',
  CANOPY: 'bg-orange-100 text-orange-700',
  CRW: 'bg-amber-100 text-amber-700',
  MIXED: 'bg-gray-100 text-gray-600',
};

export default function BoogieRotationsPage() {
  const params = useParams();
  const boogieId = params?.id as string;

  const [boogie, setBoogie] = useState<Boogie | null>(null);
  const [jumpBlocks, setJumpBlocks] = useState<CalendarBlock[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDayIndex, setFormDayIndex] = useState(0);
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('08:30');
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
          setJumpBlocks(cRes.data.filter(b => b.blockType === 'JUMP_ROTATION'));
        }
        if (gRes?.data) setGroups(gRes.data);
      } catch {
        setError('Failed to load rotation data.');
        setJumpBlocks([]);
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

  // Build rotation entries from calendar blocks
  const rotations: RotationEntry[] = jumpBlocks
    .sort((a, b) => a.dayIndex - b.dayIndex || a.startTime.localeCompare(b.startTime))
    .map((block, idx) => ({
      id: block.id,
      rotationNumber: idx + 1,
      dayIndex: block.dayIndex,
      startTime: block.startTime,
      endTime: block.endTime,
      title: block.title,
      notes: block.notes,
      groupIds: block.groupIds || [],
      groups: groups.filter(g => (block.groupIds || []).includes(g.id)),
    }));

  const filteredRotations = selectedDay === 'all'
    ? rotations
    : rotations.filter(r => r.dayIndex === selectedDay);

  const handleCreateRotation = async () => {
    if (!formTitle.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiPost<{ success: boolean; data: CalendarBlock }>(`/boogies/${boogieId}/calendar/blocks`, {
        title: formTitle,
        blockType: 'JUMP_ROTATION',
        dayIndex: formDayIndex,
        startTime: formStartTime,
        endTime: formEndTime,
        notes: formNotes || null,
        color: '#10B981',
      });
      if (res?.data) {
        setJumpBlocks(prev => [...prev, res.data].sort((a, b) => a.dayIndex - b.dayIndex || a.startTime.localeCompare(b.startTime)));
      }
      setFormTitle('');
      setFormDayIndex(0);
      setFormStartTime('08:00');
      setFormEndTime('08:30');
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
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading rotations...</p>
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
          <RotateCw className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white p-6 lg:p-8">
        <Link href={`/dashboard/boogies/${boogieId}`} className="text-purple-200 hover:text-white text-sm flex items-center gap-1 mb-3">
          <ChevronLeft className="h-4 w-4" /> Back to {boogie?.title || 'Boogie'}
        </Link>
        <div className="flex items-center gap-3">
          <RotateCw className="h-8 w-8" />
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Load Rotations</h1>
            {boogie && <p className="text-purple-200 mt-0.5 text-sm">{boogie.title}</p>}
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Rotations', value: rotations.length, color: 'text-gray-900' },
            { label: 'Groups', value: groups.length, color: 'text-purple-700' },
            { label: 'Event Days', value: eventDays, color: 'text-blue-700' },
            { label: 'With Groups Assigned', value: rotations.filter(r => r.groupIds.length > 0).length, color: 'text-emerald-700' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color} mt-1`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedDay('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedDay === 'all' ? 'bg-purple-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700 hover:bg-gray-50'
              }`}
            >
              All Days
            </button>
            {Array.from({ length: eventDays }, (_, i) => (
              <button
                key={i}
                onClick={() => setSelectedDay(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedDay === i ? 'bg-purple-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700 hover:bg-gray-50'
                }`}
              >
                Day {i + 1}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Rotation
          </button>
        </div>

        {/* New Rotation Form */}
        {showForm && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">New Jump Rotation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Rotation Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. Rotation 1 — Freefly"
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
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Aircraft, jump type..."
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
                onClick={handleCreateRotation}
                disabled={!formTitle.trim() || submitting}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                {submitting ? 'Creating...' : 'Create Rotation'}
              </button>
            </div>
          </div>
        )}

        {/* Rotations Table */}
        {filteredRotations.length === 0 && !showForm ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-gray-200 dark:border-slate-700">
            <RotateCw className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {rotations.length === 0 ? 'No load rotations scheduled' : 'No rotations for the selected day'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {rotations.length === 0
                ? 'Click "Add Rotation" to create jump rotation blocks for this boogie.'
                : 'Try selecting a different day or view all days.'}
            </p>
          </div>
        ) : filteredRotations.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 w-16">#</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Day</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Time</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Rotation</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Groups</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredRotations.map(rotation => (
                  <tr key={rotation.id} className="border-t border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-750">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">
                        {rotation.rotationNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium text-xs">
                      {getDayLabel(rotation.dayIndex)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                        <Clock className="h-3.5 w-3.5" />
                        {rotation.startTime} — {rotation.endTime}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-6 rounded-full bg-emerald-500 flex-shrink-0" />
                        <span className="font-medium text-gray-900 dark:text-white">{rotation.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {rotation.groups.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {rotation.groups.map(g => {
                            const discColor = JUMP_TYPE_COLORS[g.discipline || 'MIXED'] || 'bg-gray-100 text-gray-600';
                            return (
                              <span key={g.id} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${discColor}`}>
                                {g.name}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No groups assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 italic">{rotation.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Groups Summary */}
        {groups.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Available Groups</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {groups.map(g => {
                const discColor = JUMP_TYPE_COLORS[g.discipline || 'MIXED'] || 'bg-gray-100 text-gray-600';
                return (
                  <div key={g.id} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">{g.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${discColor}`}>
                          {g.discipline || 'Mixed'}
                        </span>
                        <span className="text-[10px] text-gray-400">{g.members.length}/{g.maxSize} members</span>
                        {g.isLocked && <span className="text-[10px] text-red-500 font-medium">Locked</span>}
                      </div>
                    </div>
                    {g.instructor && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">{g.instructor.firstName} {g.instructor.lastName}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
