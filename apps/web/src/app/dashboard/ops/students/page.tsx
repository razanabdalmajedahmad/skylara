'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';
import { GraduationCap, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface StudentRecord {
  id: number; studentName: string; currentLevel: number;
  lastJumpDate: string | null; instructorName: string;
  nextLevelReady: boolean;
}

function StudentsContent() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const res = await apiGet('/training/aff/active-students');
        setStudents(res?.data?.students ?? []);
      } catch { setStudents([]); }
      finally { setLoading(false); }
    }
    fetch();
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-[60vh]">
      <Loader2 size={32} className="text-secondary-500 animate-spin" />
    </div>
  );

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Student Operations</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">{students.length} active AFF student{students.length !== 1 ? 's' : ''}</p>

        {students.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <GraduationCap size={48} strokeWidth={1.5} className="mb-4 mx-auto" />
            <p>No active students.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {students.map(s => (
              <div key={s.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-semibold text-[15px] text-gray-900 dark:text-white">{s.studentName}</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                    Level {s.currentLevel}
                  </span>
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-[13px]">
                  Instructor: {s.instructorName}
                  {s.lastJumpDate ? ` · Last jump: ${new Date(s.lastJumpDate).toLocaleDateString()}` : ''}
                </div>
                {s.nextLevelReady && (
                  <div className="flex items-center gap-1 mt-1.5 text-emerald-700 dark:text-emerald-400 text-xs">
                    <CheckCircle2 size={13} /> Ready for Level {s.currentLevel + 1}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentsPage() {
  return <RouteGuard allowedRoles={ROLE_GROUPS.MANIFEST}><StudentsContent /></RouteGuard>;
}
