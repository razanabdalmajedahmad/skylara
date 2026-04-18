'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { API_BASE_URL } from '@/lib/constants';
import {
  Loader2,
  GraduationCap,
  BookOpen,
  BarChart3,
  Inbox,
  Clock,
} from 'lucide-react';

interface PublicCourse {
  id: string;
  title: string;
  description: string;
  modulesCount: number;
  level: string;
  durationHours: number | null;
  imageUrl: string | null;
}

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  INTERMEDIATE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ADVANCED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ALL_LEVELS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export default function PublicCoursesPage() {
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/public/courses`);
        if (!res.ok) throw new Error('Failed to load courses');
        const json = await res.json();
        setCourses(json.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load courses');
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Courses</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Learn skydiving skills from certified instructors</p>

      {courses.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No courses available</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Check back soon for new courses</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const levelColor = LEVEL_COLORS[course.level] || LEVEL_COLORS.ALL_LEVELS;
            return (
              <div key={course.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
                {course.imageUrl ? (
                  <div className="h-40 bg-gray-200 dark:bg-gray-700 relative">
                    <Image
                      src={course.imageUrl}
                      alt={course.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-40 bg-gradient-to-br from-indigo-100 to-blue-50 dark:from-indigo-900/20 dark:to-gray-800 flex items-center justify-center">
                    <GraduationCap className="w-10 h-10 text-indigo-300 dark:text-indigo-700" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${levelColor}`}>
                      {course.level.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{course.title}</h3>
                  {course.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{course.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4 text-gray-400" />
                      <span>{course.modulesCount} module{course.modulesCount !== 1 ? 's' : ''}</span>
                    </div>
                    {course.durationHours !== null && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{course.durationHours}h</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
