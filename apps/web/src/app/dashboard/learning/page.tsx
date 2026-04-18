'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import { BookOpen, Users, Award, CreditCard, CheckCircle, TrendingUp } from 'lucide-react';

interface OverviewStats {
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  completedEnrollments: number;
  totalCertificates: number;
  activeSubscriptions: number;
}

const STAT_CARDS = [
  { key: 'totalCourses', label: 'Total Courses', icon: BookOpen, color: 'text-blue-600 bg-blue-100' },
  { key: 'publishedCourses', label: 'Published Courses', icon: TrendingUp, color: 'text-green-600 bg-green-100' },
  { key: 'totalEnrollments', label: 'Total Enrollments', icon: Users, color: 'text-indigo-600 bg-indigo-100' },
  { key: 'completedEnrollments', label: 'Completed Enrollments', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-100' },
  { key: 'totalCertificates', label: 'Certificates Issued', icon: Award, color: 'text-amber-600 bg-amber-100' },
  { key: 'activeSubscriptions', label: 'Active Subscriptions', icon: CreditCard, color: 'text-purple-600 bg-purple-100' },
] as const;

export default function LearningOverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchOverview() {
      try {
        const res = await apiGet<{ success: boolean; data: OverviewStats }>('/learning/analytics/overview');
        if (res.success) {
          setStats(res.data);
        } else {
          setStats({
            totalCourses: 0,
            publishedCourses: 0,
            totalEnrollments: 0,
            completedEnrollments: 0,
            totalCertificates: 0,
            activeSubscriptions: 0,
          });
        }
      } catch {
        setStats({
          totalCourses: 0,
          publishedCourses: 0,
          totalEnrollments: 0,
          completedEnrollments: 0,
          totalCertificates: 0,
          activeSubscriptions: 0,
        });
        setError('Could not load overview data. Showing defaults.');
      } finally {
        setLoading(false);
      }
    }
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const value = stats ? stats[card.key] : 0;
          return (
            <div
              key={card.key}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href="/dashboard/learning/courses/new"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-[#2E86C1] hover:bg-blue-50 transition-colors group"
          >
            <BookOpen className="w-5 h-5 text-gray-400 group-hover:text-[#1B4F72]" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Create Course</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Build a new learning course</p>
            </div>
          </a>
          <a
            href="/dashboard/learning/certificates"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-[#2E86C1] hover:bg-blue-50 transition-colors group"
          >
            <Award className="w-5 h-5 text-gray-400 group-hover:text-[#1B4F72]" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Issue Certificate</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Award a certificate to a user</p>
            </div>
          </a>
          <a
            href="/dashboard/learning/analytics"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-[#2E86C1] hover:bg-blue-50 transition-colors group"
          >
            <TrendingUp className="w-5 h-5 text-gray-400 group-hover:text-[#1B4F72]" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">View Analytics</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Track learning performance</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
