'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import Link from 'next/link';
import { BookOpen, Users, Award, CheckCircle, TrendingUp, CreditCard, BarChart3 } from 'lucide-react';

interface OverviewStats {
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  completedEnrollments: number;
  totalCertificates: number;
  activeSubscriptions: number;
}

interface CoursePerformance {
  id: string;
  title: string;
  category: string;
  status: string;
  enrollmentCount: number;
  completionCount: number;
  completionRate: number;
}

const STAT_CARDS = [
  { key: 'totalCourses', label: 'Total Courses', icon: BookOpen, color: 'text-blue-600 bg-blue-100' },
  { key: 'publishedCourses', label: 'Published', icon: TrendingUp, color: 'text-green-600 bg-green-100' },
  { key: 'totalEnrollments', label: 'Enrollments', icon: Users, color: 'text-indigo-600 bg-indigo-100' },
  { key: 'completedEnrollments', label: 'Completed', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-100' },
  { key: 'totalCertificates', label: 'Certificates', icon: Award, color: 'text-amber-600 bg-amber-100' },
  { key: 'activeSubscriptions', label: 'Subscriptions', icon: CreditCard, color: 'text-purple-600 bg-purple-100' },
] as const;

export default function AnalyticsPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [coursePerformance, setCoursePerformance] = useState<CoursePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const [overviewRes, coursesRes] = await Promise.allSettled([
          apiGet<{ success: boolean; data: OverviewStats }>('/learning/analytics/overview'),
          apiGet<{ success: boolean; data: CoursePerformance[] }>('/learning/courses?status=PUBLISHED&limit=50'),
        ]);

        if (overviewRes.status === 'fulfilled' && overviewRes.value.success) {
          setStats(overviewRes.value.data);
        } else {
          setStats({
            totalCourses: 0, publishedCourses: 0, totalEnrollments: 0,
            completedEnrollments: 0, totalCertificates: 0, activeSubscriptions: 0,
          });
        }

        if (coursesRes.status === 'fulfilled' && coursesRes.value.success) {
          setCoursePerformance(coursesRes.value.data || []);
        }
      } catch {
        setError('Failed to load analytics data.');
        setStats({
          totalCourses: 0, publishedCourses: 0, totalEnrollments: 0,
          completedEnrollments: 0, totalCertificates: 0, activeSubscriptions: 0,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const completionRate = stats && stats.totalEnrollments > 0
    ? Math.round((stats.completedEnrollments / stats.totalEnrollments) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Learning Analytics</h1>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const value = stats ? stats[card.key] : 0;
          return (
            <div
              key={card.key}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4"
            >
              <div className={`p-2 rounded-lg ${card.color} w-fit mb-2`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Overall completion rate */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Overall Completion Rate</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-[#2E86C1] h-4 rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-white min-w-[60px] text-right">
            {completionRate}%
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {stats?.completedEnrollments || 0} of {stats?.totalEnrollments || 0} enrollments completed
        </p>
      </div>

      {/* Course Performance */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Course Performance</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Enrollment and completion metrics by course</p>
        </div>

        {coursePerformance.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="w-10 h-10 text-gray-300 mb-2" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No course performance data yet</p>
            <p className="text-xs text-gray-400 mt-1">Publish courses and get enrollments to see analytics</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {coursePerformance.map((course) => (
              <div key={course.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/dashboard/learning/courses/${course.id}`}
                      className="text-sm font-medium text-gray-900 dark:text-white hover:text-[#1B4F72] transition-colors"
                    >
                      {course.title}
                    </Link>
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700">
                      {course.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {course.enrollmentCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {course.completionCount}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-[#2E86C1] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${course.completionRate}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[45px] text-right">
                    {course.completionRate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
