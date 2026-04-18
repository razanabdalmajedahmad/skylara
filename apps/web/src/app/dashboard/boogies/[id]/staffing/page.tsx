'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { UserPlus, ChevronLeft, Plus, Users, Shield, Clock, Trash2 } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import Link from 'next/link';

interface StaffAssignment { id: number; staffId: number; groupId: number | null; roleType: string; disciplines: string[]; status: string; notes: string | null; staff: { firstName: string; lastName: string }; group: { name: string; groupType: string } | null; }
interface Group { id: number; name: string; groupType: string; discipline: string | null; }

export default function StaffingPage() {
  const params = useParams();
  const boogieId = params?.id as string;
  const [assignments, setAssignments] = useState<StaffAssignment[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTargetGroupId, setAssignTargetGroupId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const [sRes, gRes, iRes] = await Promise.all([
        apiGet<{ success: boolean; data: StaffAssignment[] }>(`/boogies/${boogieId}/staffing`).catch(() => null),
        apiGet<{ success: boolean; data: Group[] }>(`/boogies/${boogieId}/groups`).catch(() => null),
        apiGet<{ success: boolean; data: any[] }>('/instructors').catch(() => null),
      ]);
      if (sRes?.data) setAssignments(sRes.data);
      if (gRes?.data) setGroups(gRes.data);
      if (iRes?.data) setInstructors(iRes.data);
    }
    load();
  }, [boogieId]);

  const ROLE_COLORS: Record<string, string> = {
    COACH: 'bg-purple-100 text-purple-700',
    INSTRUCTOR: 'bg-blue-100 text-blue-700',
    ORGANIZER: 'bg-emerald-100 text-emerald-700',
    CANOPY_COACH: 'bg-amber-100 text-amber-700',
    TUNNEL_COACH: 'bg-indigo-100 text-indigo-700',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Link href={`/dashboard/boogies/${boogieId}`} className="text-purple-600 text-sm flex items-center gap-1 mb-4"><ChevronLeft className="h-4 w-4" /> Back to Event</Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3"><UserPlus className="h-7 w-7 text-purple-600" /> Staffing Planner</h1>
          <button
            onClick={() => { setAssignTargetGroupId(null); setShowAssignModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm"
          >
            <Plus className="h-4 w-4" /> Assign Staff
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border"><p className="text-xs text-gray-500 dark:text-gray-400">Total Assignments</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{assignments.length}</p></div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border"><p className="text-xs text-gray-500 dark:text-gray-400">Groups with Staff</p><p className="text-2xl font-bold text-purple-700">{new Set(assignments.filter(a => a.groupId).map(a => a.groupId)).size}</p></div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border"><p className="text-xs text-gray-500 dark:text-gray-400">Unstaffed Groups</p><p className="text-2xl font-bold text-amber-700">{groups.length - new Set(assignments.filter(a => a.groupId).map(a => a.groupId)).size}</p></div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border"><p className="text-xs text-gray-500 dark:text-gray-400">Available Instructors</p><p className="text-2xl font-bold text-blue-700">{instructors.length}</p></div>
        </div>

        {/* Group Staffing Board */}
        <div className="space-y-4">
          {groups.map(group => {
            const groupStaff = assignments.filter(a => a.groupId === group.id);
            return (
              <div key={group.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{group.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{group.groupType}{group.discipline ? ` · ${group.discipline}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {groupStaff.length === 0 && <span className="text-xs text-amber-600 font-medium flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> No staff assigned</span>}
                    <button
                      onClick={() => { setAssignTargetGroupId(group.id); setShowAssignModal(true); }}
                      className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded font-semibold hover:bg-purple-200"
                    >
                      + Staff
                    </button>
                  </div>
                </div>
                {groupStaff.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {groupStaff.map(a => (
                      <div key={a.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ROLE_COLORS[a.roleType] || 'bg-gray-100 text-gray-600'}`}>{a.roleType}</span>
                        <span className="text-sm font-medium">{a.staff?.firstName} {a.staff?.lastName}</span>
                        <span className={`text-[10px] px-1 py-0.5 rounded ${a.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>{a.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Unassigned Staff */}
        {assignments.filter(a => !a.groupId).length > 0 && (
          <div className="mt-6 bg-amber-50 rounded-xl border border-amber-200 p-5">
            <h3 className="font-bold text-amber-800 mb-3">Staff Without Group Assignment</h3>
            <div className="flex flex-wrap gap-2">
              {assignments.filter(a => !a.groupId).map(a => (
                <div key={a.id} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg border">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ROLE_COLORS[a.roleType] || 'bg-gray-100'}`}>{a.roleType}</span>
                  <span className="text-sm font-medium">{a.staff?.firstName} {a.staff?.lastName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {groups.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No groups yet. Create groups first, then assign staff.</p>
          </div>
        )}
      {/* Assign Staff Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAssignModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Assign Staff</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 text-xl">&times;</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const staffId = parseInt((form.elements.namedItem('staffId') as HTMLSelectElement).value);
              const roleType = (form.elements.namedItem('roleType') as HTMLSelectElement).value;
              const groupId = assignTargetGroupId ?? (parseInt((form.elements.namedItem('groupId') as HTMLSelectElement)?.value) || undefined);
              try {
                const res = await apiPost<{ success: boolean; data: StaffAssignment }>(`/boogies/${boogieId}/staffing`, {
                  staffId, roleType: roleType.toUpperCase(), groupId, disciplines: [],
                });
                if (res?.data) setAssignments(prev => [...prev, res.data]);
              } catch { /* API may not be available */ }
              setShowAssignModal(false);
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Staff Member</label>
                <select name="staffId" required className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-purple-500">
                  <option value="">Select staff...</option>
                  {instructors.map((inst: any) => (
                    <option key={inst.id} value={inst.id}>{inst.firstName} {inst.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <select name="roleType" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-purple-500">
                  <option value="COACH">Coach</option>
                  <option value="INSTRUCTOR">Instructor</option>
                  <option value="ORGANIZER">Organizer</option>
                  <option value="CANOPY_COACH">Canopy Coach</option>
                  <option value="TUNNEL_COACH">Tunnel Coach</option>
                </select>
              </div>
              {!assignTargetGroupId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group (optional)</label>
                  <select name="groupId" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-purple-500">
                    <option value="">No group</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.groupType})</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 font-medium text-sm">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm">Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
