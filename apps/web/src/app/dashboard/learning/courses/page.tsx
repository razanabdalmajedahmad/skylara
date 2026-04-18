'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import Link from 'next/link';
import { BookOpen, Plus, Search, Edit, Archive, Eye, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  category: string;
  level: string;
  accessType: string;
  status: string;
  _count?: { enrollments: number };
  enrollmentCount?: number;
}

interface CoursesResponse {
  courses: Course[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-amber-100 text-amber-700',
  SUSPENDED: 'bg-red-100 text-red-700',
};

const ACCESS_STYLES: Record<string, string> = {
  FREE: 'bg-emerald-100 text-emerald-700',
  PAID: 'bg-blue-100 text-blue-700',
  SUBSCRIPTION: 'bg-purple-100 text-purple-700',
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = search ? `&search=${encodeURIComponent(search)}` : '';
      const res = await apiGet<{ success: boolean; data: Course[]; meta?: { total: number; page: number; totalPages: number } }>(
        `/learning/courses?page=${page}&limit=20${query}`
      );
      if (res.success) {
        setCourses(res.data || []);
        setTotal(res.meta?.total || 0);
        setTotalPages(res.meta?.totalPages || 1);
      }
    } catch {
      setError('Failed to load courses.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleStatusAction = async (courseId: string, action: 'publish' | 'archive') => {
    setActionLoading(courseId);
    try {
      await apiPost(`/learning/courses/${courseId}/${action}`);
      await fetchCourses();
    } catch {
      setError(`Failed to ${action} course.`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCourses();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Courses</h1>
        <Link
          href="/dashboard/learning/courses/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#1B4F72] text-white rounded-lg hover:bg-[#164063] transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Course
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses by title..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Search
            </button>
          </form>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-50 text-red-700 text-sm border-b border-red-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <BookOpen className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">No courses found</p>
            <Link
              href="/dashboard/learning/courses/new"
              className="px-4 py-2 bg-[#1B4F72] text-white rounded-lg hover:bg-[#164063] transition-colors text-sm font-medium"
            >
              Create Your First Course
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Level</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Access</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Enrollments</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {courses.map((course) => (
                    <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{course.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{course.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{course.level?.replace('_', ' ')}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${ACCESS_STYLES[course.accessType] || 'bg-gray-100 text-gray-700'}`}>
                          {course.accessType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_STYLES[course.status] || 'bg-gray-100 text-gray-700'}`}>
                          {course.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {course._count?.enrollments ?? course.enrollmentCount ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/learning/courses/${course.id}`}
                            className="p-1.5 text-gray-400 hover:text-[#1B4F72] rounded-lg hover:bg-gray-100 transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/dashboard/learning/courses/${course.id}/edit`}
                            className="p-1.5 text-gray-400 hover:text-[#1B4F72] rounded-lg hover:bg-gray-100 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          {course.status === 'DRAFT' && (
                            <button
                              onClick={() => handleStatusAction(course.id, 'publish')}
                              disabled={actionLoading === course.id}
                              className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                              title="Publish"
                            >
                              <TrendingUp className="w-4 h-4" />
                            </button>
                          )}
                          {course.status === 'PUBLISHED' && (
                            <button
                              onClick={() => handleStatusAction(course.id, 'archive')}
                              disabled={actionLoading === course.id}
                              className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
                              title="Archive"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {courses.length} of {total} courses
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300 px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

