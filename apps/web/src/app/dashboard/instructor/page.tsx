'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import { RouteGuard } from '@/components/RouteGuard';
import {
  Users,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Loader2,
  Calendar,
  Award,
} from 'lucide-react';

interface Assignment {
  id: number;
  loadNumber: string;
  loadStatus: string;
  studentName: string | null;
  assignmentType: string;
  scheduledAt: string;
}

function InstructorDashboardContent() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [assignRes, reqRes] = await Promise.all([
          apiGet('/instructors/my-assignments').catch(() => null),
          apiGet('/instructors/pending-requests').catch(() => null),
        ]);
        setAssignments(assignRes?.data?.assignments ?? []);
        setPendingRequests(reqRes?.data?.count ?? 0);
      } catch {
        // fallback empty
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 size={32} className="text-secondary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Instructor Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {user?.firstName ?? 'Instructor'} — today&apos;s schedule and assignments
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2.5 mb-2">
              <Calendar size={18} className="text-blue-500" />
              <span className="text-gray-400 dark:text-gray-500 text-[13px]">Today&apos;s Assignments</span>
            </div>
            <div className="text-[28px] font-bold text-gray-900 dark:text-white">{assignments.length}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2.5 mb-2">
              <Clock size={18} className="text-amber-500" />
              <span className="text-gray-400 dark:text-gray-500 text-[13px]">Pending Requests</span>
            </div>
            <div className={`text-[28px] font-bold ${pendingRequests > 0 ? 'text-amber-500' : 'text-gray-900 dark:text-white'}`}>
              {pendingRequests}
            </div>
            {pendingRequests > 0 && (
              <div className="text-amber-700 dark:text-amber-300 text-xs mt-1">Respond within 24h</div>
            )}
          </div>
        </div>

        {/* Assignments list */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Assigned Loads</h2>
          {assignments.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm">No assignments today.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {assignments.map((a) => (
                <Link key={a.id} href={`/dashboard/manifest/${a.id}`} className="flex items-center gap-3.5 p-3 rounded-lg border border-gray-200 dark:border-slate-700 no-underline hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                  <div className={`rounded-lg p-2 ${a.loadStatus === 'AIRBORNE' ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-blue-50 dark:bg-blue-950'}`}>
                    <Users size={18} className={a.loadStatus === 'AIRBORNE' ? 'text-emerald-500' : 'text-blue-500'} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      Load {a.loadNumber} — {a.assignmentType}
                    </div>
                    <div className="text-[13px] text-gray-500 dark:text-gray-400">
                      {a.studentName ?? 'Group'} · {new Date(a.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-1 rounded-md ${
                    a.loadStatus === 'AIRBORNE'
                      ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                  }`}>
                    {a.loadStatus}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'My Students', href: '/dashboard/training', icon: Users },
            { label: 'Coaching Records', href: '/dashboard/courses', icon: BookOpen },
            { label: 'Availability', href: '/dashboard/staff/instructors', icon: Calendar },
            { label: 'Logbook', href: '/dashboard/logbook', icon: Award },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-2.5 px-4 py-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 no-underline text-gray-900 dark:text-white text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
              <item.icon size={18} className="text-primary-500 dark:text-primary-400" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function InstructorDashboardPage() {
  return (
    <RouteGuard allowedRoles={['TANDEM_INSTRUCTOR', 'AFF_INSTRUCTOR', 'COACH', 'PLATFORM_ADMIN', 'DZ_MANAGER']}>
      <InstructorDashboardContent />
    </RouteGuard>
  );
}
