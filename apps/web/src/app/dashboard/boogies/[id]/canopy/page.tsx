'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Umbrella, Clock, Users, Plus, Calendar,
  AlertTriangle, CheckCircle2, User,
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

interface StaffAssignment {
  id: number;
  staffId: number;
  roleType: string;
  disciplines: string[];
  staff: { firstName: string; lastName: string };
}

interface CanopyCourse {
  id: number;
  title: string;
  dayIndex: number;
  startTime: string;
  endTime: string;
  notes: string | null;
  level: string;
  instructorName: string;
  spotsTotal: number;
  spotsTaken: number;
}

const COURSE_LEVELS = [
  { value: '101', label: 'Canopy 101 — Fundamentals', color: 'bg-emerald-100 text-emerald-700', description: 'Basic canopy control, pattern work, landing priorities' },
  { value: '201', label: 'Canopy 201 — Intermediate', color: 'bg-blue-100 text-blue-700', description: 'Crosswind techniques, rear riser approaches, accuracy' },
  { value: '301', label: 'Canopy 301 — Advanced', color: 'bg-purple-100 text-purple-700', description: 'High-performance landings, swooping fundamentals, toggle turns' },
  { value: 'SWOOP', label: 'Swoop Coaching', color: 'bg-red-100 text-red-700', description: 'Competition-level canopy piloting and carving' },
];

export default function BoogieCanopyPage() {
  const params = useParams();
  const boogieId = params?.id as string;

  const [boogie, setBoogie] = useState<Boogie | null>(null);
  const [canopyBlocks, setCanopyBlocks] = useState<CalendarBlock[]>([]);
  const [canopyStaff, setCanopyStaff] = useState<StaffAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formLevel, setFormLevel] = useState('101');
  const [formDayIndex, setFormDayIndex] = useState(0);
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!boogieId) return;
    async function load() {
      try {
        const [bRes, cRes, sRes] = await Promise.all([
          apiGet<{ success: boolean; data: Boogie }>(`/boogies/${boogieId}`).catch(() => null),
          apiGet<{ success: boolean; data: CalendarBlock[] }>(`/boogies/${boogieId}/calendar`).catch(() => null),
          apiGet<{ success: boolean; data: StaffAssignment[] }>(`/boogies/${boogieId}/staffing`).catch(() => null),
        ]);
        if (bRes?.data) setBoogie(bRes.data);
        else setError('Could not load boogie details.');
        if (cRes?.data) {
          setCanopyBlocks(cRes.data.filter(b => b.blockType === 'CANOPY_BLOCK'));
        }
        if (sRes?.data) {
          setCanopyStaff(sRes.data.filter(s =>
            s.disciplines.includes('CANOPY') ||
            s.roleType === 'INSTRUCTOR' ||
            s.roleType === 'COACH'
          ));
        }
      } catch {
        setError('Failed to load canopy course data.');
        setCanopyBlocks([]);
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

  // Derive display-friendly course data from calendar blocks
  const courses: CanopyCourse[] = canopyBlocks.map(block => {
    let level = '101';
    const titleLower = block.title.toLowerCase();
    if (titleLower.includes('301') || titleLower.includes('advanced')) level = '301';
    else if (titleLower.includes('201') || titleLower.includes('intermediate')) level = '201';
    else if (titleLower.includes('swoop')) level = 'SWOOP';

    return {
      id: block.id,
      title: block.title,
      dayIndex: block.dayIndex,
      startTime: block.startTime,
      endTime: block.endTime,
      notes: block.notes,
      level,
      instructorName: canopyStaff.length > 0 ? `${canopyStaff[0].staff.firstName} ${canopyStaff[0].staff.lastName}` : 'TBA',
      spotsTotal: 12,
      spotsTaken: 0,
    };
  });

  const handleCreateCourse = async () => {
    if (!formTitle.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiPost<{ success: boolean; data: CalendarBlock }>(`/boogies/${boogieId}/calendar/blocks`, {
        title: formTitle || `Canopy ${formLevel}`,
        blockType: 'CANOPY_BLOCK',
        dayIndex: formDayIndex,
        startTime: formStartTime,
        endTime: formEndTime,
        notes: formNotes || `Level: ${formLevel}`,
        color: '#F59E0B',
      });
      if (res?.data) {
        setCanopyBlocks(prev => [...prev, res.data].sort((a, b) => a.dayIndex - b.dayIndex || a.startTime.localeCompare(b.startTime)));
      }
      setFormTitle('');
      setFormLevel('101');
      setFormDayIndex(0);
      setFormStartTime('08:00');
      setFormEndTime('10:00');
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
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading canopy courses...</p>
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
          <Umbrella className="h-12 w-12 text-gray-300 mx-auto mb-3" />
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
          <Umbrella className="h-8 w-8" />
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Canopy Courses</h1>
            {boogie && <p className="text-purple-200 mt-0.5 text-sm">{boogie.title}</p>}
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Safety Notice */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl mb-6">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Safety Reminder</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              All canopy courses require participants to meet minimum jump number and license requirements.
              Coaches must verify qualifications before session start.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Courses Scheduled', value: courses.length, color: 'text-gray-900' },
            { label: 'Canopy Instructors', value: canopyStaff.length, color: 'text-amber-700' },
            { label: 'Event Days', value: eventDays, color: 'text-blue-700' },
            { label: 'Total Spots', value: courses.reduce((s, c) => s + c.spotsTotal, 0), color: 'text-emerald-700' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color} mt-1`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Add Course Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Canopy Course
          </button>
        </div>

        {/* New Course Form */}
        {showForm && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">New Canopy Course</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Course Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. Canopy 201 — Rear Risers"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:bg-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Level</label>
                <select
                  value={formLevel}
                  onChange={e => setFormLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:bg-slate-900"
                >
                  {COURSE_LEVELS.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
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
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Requirements, location, equipment notes..."
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
                onClick={handleCreateCourse}
                disabled={!formTitle.trim() || submitting}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                {submitting ? 'Creating...' : 'Create Course'}
              </button>
            </div>
          </div>
        )}

        {/* Course Cards */}
        {courses.length === 0 && !showForm ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-gray-200 dark:border-slate-700">
            <Umbrella className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No canopy courses scheduled</p>
            <p className="text-sm text-gray-400 mt-1">
              Click &quot;Add Canopy Course&quot; to schedule canopy piloting sessions for this boogie.
            </p>
          </div>
        ) : courses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map(course => {
              const levelConfig = COURSE_LEVELS.find(l => l.value === course.level) || COURSE_LEVELS[0];
              const spotsRemaining = course.spotsTotal - course.spotsTaken;
              return (
                <div key={course.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow">
                  {/* Level Header */}
                  <div className="px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500">
                    <span className="text-xs font-bold text-white/80 uppercase tracking-wide">{levelConfig.label}</span>
                  </div>

                  <div className="p-5">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{course.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">{levelConfig.description}</p>

                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span>{getDayLabel(course.dayIndex)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span>{course.startTime} — {course.endTime}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span>Instructor: <span className="font-medium text-gray-800 dark:text-gray-200">{course.instructorName}</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span>{course.spotsTaken}/{course.spotsTotal} spots filled</span>
                      </div>
                    </div>

                    {/* Spots bar */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            spotsRemaining <= 2 ? 'bg-red-500' : spotsRemaining <= 4 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.round((course.spotsTaken / course.spotsTotal) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{spotsRemaining} spots remaining</p>
                    </div>

                    {course.notes && (
                      <p className="text-xs text-gray-400 italic mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">{course.notes}</p>
                    )}

                    {/* Register button -- requires a dedicated enrollment endpoint (not yet available) */}
                    <button
                      className="mt-4 w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                      disabled
                      title="Course registration requires a dedicated enrollment endpoint (not yet available)"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Register for Course
                    </button>
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
