'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, CalendarDays, Clock, Plus, MapPin,
  Megaphone, Plane, Wind, Umbrella,
  Award, AlertTriangle, Users, ChevronRight, Sun, Sunset,
} from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';

interface Boogie {
  id: number;
  title: string;
  subtitle: string | null;
  startDate: string;
  endDate: string;
  status: string;
  city: string | null;
  country: string | null;
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
  sortOrder: number;
}

interface Announcement {
  id: number;
  title: string;
  body: string;
  channel: string;
  sentAt: string | null;
  createdAt: string;
}

const BLOCK_TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: typeof Plane }> = {
  BRIEFING: { label: 'Briefing', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', icon: Megaphone },
  JUMP_ROTATION: { label: 'Jump Rotation', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200', icon: Plane },
  TUNNEL_ROTATION: { label: 'Tunnel Session', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200', icon: Wind },
  CANOPY_BLOCK: { label: 'Canopy Course', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200', icon: Umbrella },
  ARRIVAL: { label: 'Arrival', color: 'text-indigo-700', bgColor: 'bg-indigo-50 border-indigo-200', icon: MapPin },
  REGISTRATION: { label: 'Registration', color: 'text-cyan-700', bgColor: 'bg-cyan-50 border-cyan-200', icon: Users },
  WEATHER_HOLD: { label: 'Weather Hold', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', icon: AlertTriangle },
  SOCIAL: { label: 'Social / Awards', color: 'text-pink-700', bgColor: 'bg-pink-50 border-pink-200', icon: Award },
  CONTINGENCY: { label: 'Contingency', color: 'text-gray-600', bgColor: 'bg-gray-50 border-gray-200', icon: Clock },
  DEPARTURE: { label: 'Departure', color: 'text-slate-700', bgColor: 'bg-slate-50 border-slate-200', icon: MapPin },
};

const BLOCK_TYPE_OPTIONS = Object.entries(BLOCK_TYPE_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));

export default function BoogieDayPlanPage() {
  const params = useParams();
  const boogieId = params?.id as string;

  const [boogie, setBoogie] = useState<Boogie | null>(null);
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formBlockType, setFormBlockType] = useState('BRIEFING');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('09:00');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!boogieId) return;
    async function load() {
      try {
        const [bRes, cRes, aRes] = await Promise.all([
          apiGet<{ success: boolean; data: Boogie }>(`/boogies/${boogieId}`).catch(() => null),
          apiGet<{ success: boolean; data: CalendarBlock[] }>(`/boogies/${boogieId}/calendar`).catch(() => null),
          apiGet<{ success: boolean; data: Announcement[] }>(`/boogies/${boogieId}/announcements`).catch(() => null),
        ]);
        if (bRes?.data) setBoogie(bRes.data);
        else setError('Could not load boogie details.');
        if (cRes?.data) setBlocks(cRes.data);
        if (aRes?.data) setAnnouncements(aRes.data);
      } catch {
        setError('Failed to load day plan data.');
        setBlocks([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [boogieId]);

  const eventDays = boogie
    ? Math.max(1, Math.ceil((new Date(boogie.endDate).getTime() - new Date(boogie.startDate).getTime()) / 86400000) + 1)
    : 1;

  const getDayDate = (dayIndex: number) => {
    if (!boogie) return null;
    return new Date(new Date(boogie.startDate).getTime() + dayIndex * 86400000);
  };

  const getDayLabel = (dayIndex: number) => {
    const date = getDayDate(dayIndex);
    if (!date) return `Day ${dayIndex + 1}`;
    return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
  };

  // Blocks for selected day, sorted by start time
  const dayBlocks = useMemo(() => {
    return blocks
      .filter(b => b.dayIndex === selectedDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.sortOrder - b.sortOrder);
  }, [blocks, selectedDay]);

  // Group blocks into time-of-day segments
  const morningBlocks = dayBlocks.filter(b => b.startTime < '12:00');
  const afternoonBlocks = dayBlocks.filter(b => b.startTime >= '12:00' && b.startTime < '17:00');
  const eveningBlocks = dayBlocks.filter(b => b.startTime >= '17:00');

  // Summary counts per day for the day selector
  const dayCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    blocks.forEach(b => { counts[b.dayIndex] = (counts[b.dayIndex] || 0) + 1; });
    return counts;
  }, [blocks]);

  const handleCreateEvent = async () => {
    if (!formTitle.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiPost<{ success: boolean; data: CalendarBlock }>(`/boogies/${boogieId}/calendar/blocks`, {
        title: formTitle,
        blockType: formBlockType,
        dayIndex: selectedDay,
        startTime: formStartTime,
        endTime: formEndTime,
        notes: formNotes || null,
        color: null,
        sortOrder: dayBlocks.length,
      });
      if (res?.data) {
        setBlocks(prev => [...prev, res.data]);
      }
      setFormTitle('');
      setFormBlockType('BRIEFING');
      setFormStartTime('08:00');
      setFormEndTime('09:00');
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
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading day plan...</p>
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
          <CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  const renderTimelineBlock = (block: CalendarBlock) => {
    const config = BLOCK_TYPE_CONFIG[block.blockType] || {
      label: block.blockType,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 border-gray-200',
      icon: Clock,
    };
    const Icon = config.icon;

    return (
      <div key={block.id} className="flex gap-4 group">
        {/* Timeline marker */}
        <div className="flex flex-col items-center flex-shrink-0 w-16">
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{block.startTime}</span>
          <div className="w-px flex-1 bg-gray-200 dark:bg-slate-700 my-1" />
          <span className="text-[10px] text-gray-400">{block.endTime}</span>
        </div>

        {/* Event card */}
        <div className={`flex-1 rounded-xl border p-4 mb-3 ${config.bgColor} dark:bg-slate-800 dark:border-slate-700 hover:shadow-sm transition-shadow`}>
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bgColor}`}>
              <Icon className={`h-4 w-4 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{block.title}</h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
                  {config.label}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {block.startTime} — {block.endTime}
                </span>
              </div>
              {block.notes && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">{block.notes}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTimeSection = (label: string, icon: typeof Sun, sectionBlocks: CalendarBlock[]) => {
    if (sectionBlocks.length === 0) return null;
    const SectionIcon = icon;
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <SectionIcon className="h-4 w-4 text-gray-400" />
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</h3>
          <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
        </div>
        {sectionBlocks.map(renderTimelineBlock)}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white p-6 lg:p-8">
        <Link href={`/dashboard/boogies/${boogieId}`} className="text-purple-200 hover:text-white text-sm flex items-center gap-1 mb-3">
          <ChevronLeft className="h-4 w-4" /> Back to {boogie?.title || 'Boogie'}
        </Link>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-8 w-8" />
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Daily Schedule</h1>
              {boogie && <p className="text-purple-200 mt-0.5 text-sm">{boogie.title}</p>}
            </div>
          </div>
          {boogie?.city && (
            <div className="flex items-center gap-1.5 text-purple-200 text-sm">
              <MapPin className="h-4 w-4" /> {boogie.city}, {boogie.country}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Day Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {Array.from({ length: eventDays }, (_, i) => {
            const date = getDayDate(i);
            const isSelected = selectedDay === i;
            const count = dayCounts[i] || 0;
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(i)}
                className={`flex-shrink-0 rounded-xl border px-4 py-3 text-left transition-all ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-purple-300'
                }`}
              >
                <p className={`text-xs font-medium ${isSelected ? 'text-purple-200' : 'text-gray-400'}`}>Day {i + 1}</p>
                <p className="font-bold text-sm mt-0.5">
                  {date ? date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : `Day ${i + 1}`}
                </p>
                <p className={`text-[10px] mt-1 ${isSelected ? 'text-purple-200' : 'text-gray-400'}`}>{count} event{count !== 1 ? 's' : ''}</p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Timeline */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {getDayLabel(selectedDay)}
              </h2>
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                <Plus className="h-4 w-4" /> Add Event
              </button>
            </div>

            {/* New Event Form */}
            {showForm && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 mb-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Add Event to {getDayLabel(selectedDay)}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Event Title</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                      placeholder="e.g. Morning Briefing"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:bg-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label>
                    <select
                      value={formBlockType}
                      onChange={e => setFormBlockType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:bg-slate-900"
                    >
                      {BLOCK_TYPE_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
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
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes (optional)</label>
                    <input
                      type="text"
                      value={formNotes}
                      onChange={e => setFormNotes(e.target.value)}
                      placeholder="Location, details..."
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
                    onClick={handleCreateEvent}
                    disabled={!formTitle.trim() || submitting}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    {submitting ? 'Adding...' : 'Add Event'}
                  </button>
                </div>
              </div>
            )}

            {/* Timeline */}
            {dayBlocks.length === 0 && !showForm ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-gray-200 dark:border-slate-700">
                <CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No events scheduled for this day</p>
                <p className="text-sm text-gray-400 mt-1">Click &quot;Add Event&quot; to start building the daily schedule.</p>
              </div>
            ) : dayBlocks.length > 0 && (
              <div>
                {renderTimeSection('Morning', Sun, morningBlocks)}
                {renderTimeSection('Afternoon', Sun, afternoonBlocks)}
                {renderTimeSection('Evening', Sunset, eveningBlocks)}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Day Summary */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-3">Day Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Total Events</span>
                  <span className="font-bold">{dayBlocks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Jump Rotations</span>
                  <span className="font-bold">{dayBlocks.filter(b => b.blockType === 'JUMP_ROTATION').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Tunnel Sessions</span>
                  <span className="font-bold">{dayBlocks.filter(b => b.blockType === 'TUNNEL_ROTATION').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Canopy Courses</span>
                  <span className="font-bold">{dayBlocks.filter(b => b.blockType === 'CANOPY_BLOCK').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Briefings</span>
                  <span className="font-bold">{dayBlocks.filter(b => b.blockType === 'BRIEFING').length}</span>
                </div>
                {dayBlocks.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-slate-700 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">First Event</span>
                      <span className="font-medium">{dayBlocks[0].startTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Last Event</span>
                      <span className="font-medium">{dayBlocks[dayBlocks.length - 1].endTime}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-3">Quick Links</h3>
              <div className="space-y-2">
                <Link href={`/dashboard/boogies/${boogieId}/rotations`} className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                  <ChevronRight className="h-3.5 w-3.5" /> Load Rotations
                </Link>
                <Link href={`/dashboard/boogies/${boogieId}/tunnel`} className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                  <ChevronRight className="h-3.5 w-3.5" /> Tunnel Sessions
                </Link>
                <Link href={`/dashboard/boogies/${boogieId}/canopy`} className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                  <ChevronRight className="h-3.5 w-3.5" /> Canopy Courses
                </Link>
                <Link href={`/dashboard/boogies/${boogieId}/instructors`} className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                  <ChevronRight className="h-3.5 w-3.5" /> Instructors
                </Link>
              </div>
            </div>

            {/* Announcements */}
            {announcements.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3">Announcements</h3>
                <div className="space-y-3">
                  {announcements.slice(0, 3).map(ann => (
                    <div key={ann.id} className="border-l-2 border-purple-400 pl-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{ann.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{ann.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
