'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Users, Award, Shield,
  UserCheck, Search,
} from 'lucide-react';
import { apiGet } from '@/lib/api';

interface StaffAssignment {
  id: number;
  staffId: number;
  roleType: string;
  disciplines: string[];
  notes: string | null;
  assignedAt: string;
  staff: { firstName: string; lastName: string };
  group: { name: string; groupType: string } | null;
  assigner: { firstName: string; lastName: string } | null;
}

interface Boogie {
  id: number;
  title: string;
  subtitle: string | null;
  eventType: string;
  status: string;
  startDate: string;
  endDate: string;
  discipline: string | null;
}

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  HEAD_COACH: { label: 'Head Coach', color: 'bg-purple-100 text-purple-700' },
  COACH: { label: 'Coach', color: 'bg-blue-100 text-blue-700' },
  INSTRUCTOR: { label: 'Instructor', color: 'bg-indigo-100 text-indigo-700' },
  TANDEM_INSTRUCTOR: { label: 'Tandem Instructor', color: 'bg-teal-100 text-teal-700' },
  AFF_INSTRUCTOR: { label: 'AFF Instructor', color: 'bg-cyan-100 text-cyan-700' },
  VIDEOGRAPHER: { label: 'Videographer', color: 'bg-pink-100 text-pink-700' },
  SAFETY_OFFICER: { label: 'Safety Officer', color: 'bg-red-100 text-red-700' },
  RIGGER: { label: 'Rigger', color: 'bg-amber-100 text-amber-700' },
  ORGANIZER: { label: 'Organizer', color: 'bg-emerald-100 text-emerald-700' },
  PILOT: { label: 'Pilot', color: 'bg-sky-100 text-sky-700' },
  LOADMASTER: { label: 'Loadmaster', color: 'bg-orange-100 text-orange-700' },
};

const DISCIPLINE_LABELS: Record<string, string> = {
  BELLY: 'Belly',
  FREEFLY: 'Freefly',
  HEAD_DOWN: 'Head Down',
  HEAD_UP: 'Head Up',
  ANGLE: 'Angle',
  TRACKING: 'Tracking',
  WINGSUIT: 'Wingsuit',
  CANOPY: 'Canopy Piloting',
  CRW: 'CRW',
  VFS: 'VFS',
  MIXED: 'Mixed',
};

export default function BoogieInstructorsPage() {
  const params = useParams();
  const boogieId = params?.id as string;

  const [boogie, setBoogie] = useState<Boogie | null>(null);
  const [staff, setStaff] = useState<StaffAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    if (!boogieId) return;
    async function load() {
      try {
        const [bRes, sRes] = await Promise.all([
          apiGet<{ success: boolean; data: Boogie }>(`/boogies/${boogieId}`).catch(() => null),
          apiGet<{ success: boolean; data: StaffAssignment[] }>(`/boogies/${boogieId}/staffing`).catch(() => null),
        ]);
        if (bRes?.data) setBoogie(bRes.data);
        else setError('Could not load boogie details.');
        if (sRes?.data) setStaff(sRes.data);
      } catch {
        setError('Failed to load instructor data.');
        setStaff([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [boogieId]);

  const roleOptions = Array.from(new Set(staff.map(s => s.roleType))).sort();

  const filtered = staff.filter(s => {
    if (roleFilter !== 'all' && s.roleType !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const fullName = `${s.staff.firstName} ${s.staff.lastName}`.toLowerCase();
      if (!fullName.includes(q) && !s.roleType.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading instructors...</p>
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
          <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
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
          <Users className="h-8 w-8" />
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Instructors & Coaches</h1>
            {boogie && <p className="text-purple-200 mt-0.5 text-sm">{boogie.title}</p>}
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Staff', value: staff.length, color: 'text-gray-900' },
            { label: 'Coaches', value: staff.filter(s => ['COACH', 'HEAD_COACH'].includes(s.roleType)).length, color: 'text-purple-700' },
            { label: 'Instructors', value: staff.filter(s => ['INSTRUCTOR', 'AFF_INSTRUCTOR', 'TANDEM_INSTRUCTOR'].includes(s.roleType)).length, color: 'text-blue-700' },
            { label: 'Assigned to Groups', value: staff.filter(s => s.group).length, color: 'text-emerald-700' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color} mt-1`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or role..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm outline-none"
            />
          </div>
          {roleOptions.length > 1 && (
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm"
            >
              <option value="all">All Roles</option>
              {roleOptions.map(r => (
                <option key={r} value={r}>{ROLE_BADGES[r]?.label || r.replace(/_/g, ' ')}</option>
              ))}
            </select>
          )}
        </div>

        {/* Instructor Cards */}
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-gray-200 dark:border-slate-700">
            <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {staff.length === 0 ? 'No instructors assigned yet' : 'No results match your filters'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {staff.length === 0
                ? 'Assign staff from the boogie detail page under Staffing settings.'
                : 'Try adjusting your search or role filter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(assignment => {
              const roleBadge = ROLE_BADGES[assignment.roleType] || { label: assignment.roleType.replace(/_/g, ' '), color: 'bg-gray-100 text-gray-600' };
              return (
                <div key={assignment.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {assignment.staff.firstName[0]}{assignment.staff.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white">
                        {assignment.staff.firstName} {assignment.staff.lastName}
                      </h3>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${roleBadge.color}`}>
                        {roleBadge.label}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="mt-4 space-y-2 text-sm">
                    {assignment.disciplines.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Award className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {assignment.disciplines.map(d => (
                            <span key={d} className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded font-medium">
                              {DISCIPLINE_LABELS[d] || d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {assignment.group && (
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span>Assigned to: <span className="font-medium text-gray-700 dark:text-gray-300">{assignment.group.name}</span></span>
                      </div>
                    )}
                    {assignment.notes && (
                      <p className="text-xs text-gray-400 italic mt-1">{assignment.notes}</p>
                    )}
                  </div>

                  {/* Assigned by */}
                  {assignment.assigner && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 text-xs text-gray-400">
                      Assigned by {assignment.assigner.firstName} {assignment.assigner.lastName}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
