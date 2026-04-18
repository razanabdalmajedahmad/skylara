'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import {
  BookOpen,
  Plus,
  Clock,
  DollarSign,
  Users,
  Star,
  ChevronRight,
  Award,
  TrendingUp,
} from 'lucide-react';

interface AFFStudent {
  id: string;
  name: string;
  level: number;
  lastJumpDate: string;
  instructor: string;
  status: 'passed' | 'failed' | 'in-progress';
  progressPercent: number;
}

interface Course {
  id: string;
  title: string;
  duration: string;
  price: number;
  enrolledCount: number;
  instructor: string;
  type: 'tandem' | 'aff' | 'coach';
  nextStartDate: string;
}

interface CoachRating {
  id: string;
  instructorName: string;
  avgRating: number;
  totalRatings: number;
  specialization: string;
}

function normalizeAffStatus(s: string): AFFStudent['status'] {
  if (s === 'passed' || s === 'failed' || s === 'in-progress') return s;
  return 'in-progress';
}

function mapAffRow(raw: Record<string, unknown>): AFFStudent {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    level: Number(raw.level) || 0,
    lastJumpDate: String(raw.lastJumpDate ?? ''),
    instructor: String(raw.instructor ?? ''),
    status: normalizeAffStatus(String(raw.status ?? '')),
    progressPercent: Number(raw.progressPercent) || 0,
  };
}

function mapLearningToCourse(c: Record<string, unknown>): Course {
  const cat = String(c.category ?? '').toLowerCase();
  const type: Course['type'] = cat.includes('tandem')
    ? 'tandem'
    : cat.includes('coach')
      ? 'coach'
      : 'aff';
  const count = c._count as { enrollments?: number } | undefined;
  const updatedAt = c.updatedAt ? new Date(String(c.updatedAt)) : null;
  return {
    id: String(c.id ?? ''),
    title: String(c.title ?? 'Course'),
    duration:
      typeof c.estimatedDurationMinutes === 'number' && c.estimatedDurationMinutes > 0
        ? `${c.estimatedDurationMinutes} min`
        : '—',
    price: 0,
    enrolledCount: count?.enrollments ?? 0,
    instructor: '—',
    type,
    nextStartDate: updatedAt ? updatedAt.toLocaleDateString() : '—',
  };
}

type TabType = 'aff' | 'courses' | 'ratings';

export default function CoursesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('aff');
  const [students, setStudents] = useState<AFFStudent[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [coachRatings] = useState<CoachRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [affRes, learningRes] = await Promise.all([
          apiGet<{ success?: boolean; data?: unknown[] }>('/training/aff/students'),
          apiGet<{ success?: boolean; data?: unknown[] }>('/learning/courses?limit=50'),
        ]);

        if (Array.isArray(affRes?.data)) {
          setStudents(affRes.data.map((row) => mapAffRow(row as Record<string, unknown>)));
        } else {
          setStudents([]);
        }

        if (Array.isArray(learningRes?.data)) {
          setCourses(learningRes.data.map((row) => mapLearningToCourse(row as Record<string, unknown>)));
        } else {
          setCourses([]);
        }
      } catch {
        setStudents([]);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getStatusBadge = (status: string) => {
    const baseClasses =
      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold';
    switch (status) {
      case 'passed':
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            <Award className="h-3 w-3" /> Passed
          </span>
        );
      case 'failed':
        return (
          <span className={`${baseClasses} bg-red-100 text-red-800`}>
            Failed
          </span>
        );
      case 'in-progress':
        return (
          <span className={`${baseClasses} bg-blue-100 text-blue-800`}>
            <TrendingUp className="h-3 w-3" /> In Progress
          </span>
        );
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 dark:from-transparent to-gray-100 p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Courses & Training</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">Manage AFF progression, tandem courses, and instructor ratings</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/onboarding')}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Enroll Student
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: 'aff', label: 'AFF Program', icon: <BookOpen className="h-4 w-4" /> },
            { id: 'courses', label: 'Tandem Courses', icon: <Award className="h-4 w-4" /> },
            { id: 'ratings', label: 'Coach Ratings', icon: <Star className="h-4 w-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* AFF Program Tab */}
      {activeTab === 'aff' && (
        <div className="space-y-6">
          {loading ? (
            <div className="rounded-lg bg-white dark:bg-slate-800 shadow">
              <div className="space-y-3 p-6">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="h-4 w-32 rounded bg-gray-200"></div>
                    <div className="h-3 w-full rounded bg-gray-100 dark:bg-slate-700"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : students.length === 0 ? (
            <div className="rounded-lg bg-white dark:bg-slate-800 p-12 shadow text-center">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No AFF Students</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Start enrolling students in the AFF program to track their progression here.
              </p>
              <button
                onClick={() => router.push('/dashboard/onboarding')}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Enroll First Student
              </button>
            </div>
          ) : (
            <div className="rounded-lg bg-white dark:bg-slate-800 shadow">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-slate-900">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Student</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Level</th>
                      <th className="hidden px-4 py-3 text-left font-semibold text-gray-900 dark:text-white lg:table-cell">
                        Last Jump
                      </th>
                      <th className="hidden px-4 py-3 text-left font-semibold text-gray-900 dark:text-white lg:table-cell">
                        Instructor
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50 dark:bg-slate-900">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{student.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 lg:hidden">
                              {student.instructor} • {student.lastJumpDate}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                              {student.level}
                            </span>
                            <div className="hidden w-20 lg:block">
                              <div className="h-2 w-full rounded-full bg-gray-200">
                                <div
                                  className="h-2 rounded-full bg-blue-600"
                                  style={{ width: `${student.progressPercent}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 text-gray-700 dark:text-gray-300 lg:table-cell">
                          {student.lastJumpDate}
                        </td>
                        <td className="hidden px-4 py-3 text-gray-700 dark:text-gray-300 lg:table-cell">
                          {student.instructor}
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(student.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tandem Courses Tab */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          {courses.length === 0 ? (
            <div className="rounded-lg bg-white dark:bg-slate-800 p-12 shadow text-center">
              <Award className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No published courses</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Learning courses for your dropzone appear here when they exist in the learning catalog.
              </p>
            </div>
          ) : (
            courses.map((course) => (
            <div key={course.id} className="rounded-lg bg-white dark:bg-slate-800 p-4 shadow hover:shadow-lg transition-shadow lg:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{course.title}</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {course.type === 'tandem' ? 'Tandem Course' : course.type === 'coach' ? 'Coach course' : 'AFF Course'} •{' '}
                    Led by {course.instructor}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                      <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      {course.duration}
                    </div>
                    <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                      <DollarSign className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      ${course.price}
                    </div>
                    <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                      <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      {course.enrolledCount} enrolled
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Starts {course.nextStartDate}</p>
                </div>
                <button
                  onClick={() => setSelectedCourse(course)}
                  className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 font-semibold text-blue-600 hover:bg-blue-100 transition-colors whitespace-nowrap"
                >
                  View Details
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            ))
          )}
        </div>
      )}

      {/* Coach Ratings Tab */}
      {activeTab === 'ratings' && (
        <div className="space-y-4">
          {coachRatings.length === 0 ? (
            <div className="rounded-lg bg-white dark:bg-slate-800 p-12 shadow text-center">
              <Star className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No aggregate ratings yet</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Coach session ratings are stored per session; a rollup view will appear here when exposed by the API.
              </p>
            </div>
          ) : (
            coachRatings.map((coach) => (
            <div key={coach.id} className="rounded-lg bg-white dark:bg-slate-800 p-4 shadow hover:shadow-lg transition-shadow lg:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{coach.instructorName}</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{coach.specialization}</p>
                </div>
                <div className="flex flex-col items-start gap-2 lg:items-end">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(coach.avgRating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white">{coach.avgRating}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{coach.totalRatings} ratings</p>
                </div>
              </div>
            </div>
            ))
          )}
        </div>
      )}

      {/* Course Detail Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCourse(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selectedCourse.title}</h2>
              <button onClick={() => setSelectedCourse(null)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 text-xl">&times;</button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Type</span>
                <span className="font-semibold text-gray-900 dark:text-white capitalize">{selectedCourse.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Instructor</span>
                <span className="text-gray-900 dark:text-white">{selectedCourse.instructor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Duration</span>
                <span className="text-gray-900 dark:text-white">{selectedCourse.duration}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Price</span>
                <span className="font-semibold text-gray-900 dark:text-white">${selectedCourse.price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Enrolled</span>
                <span className="text-gray-900 dark:text-white">{selectedCourse.enrolledCount} students</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Next Start</span>
                <span className="text-gray-900 dark:text-white">{selectedCourse.nextStartDate}</span>
              </div>
            </div>
            <div className="p-6 border-t flex gap-2">
              <button onClick={() => setSelectedCourse(null)} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
