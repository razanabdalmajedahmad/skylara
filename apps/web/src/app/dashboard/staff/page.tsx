'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import {
  Users,
  Plus,
  Eye,
  Clock,
  Award,
  Power,
  ChevronDown,
  Search,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';

// ── TYPES ────────────────────────────────────────────
interface StaffMember {
  id: number | string;
  name: string;
  email: string;
  role: string;
  roles: string[];
  status: string;
  lastActive: Date;
}

// ── EMPTY FALLBACK ────────────────────────────────────────
const FALLBACK_STAFF: StaffMember[] = [];

// ── UTILITIES ────────────────────────────────────────
const formatLastActive = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
};

const ROLE_DISPLAY: Record<string, string> = {
  PLATFORM_ADMIN: 'Admin',
  DZ_MANAGER: 'Manager',
  DZ_OPERATOR: 'Operator',
  PILOT: 'Pilot',
  INSTRUCTOR: 'Instructor',
  TANDEM_INSTRUCTOR: 'Tandem Instructor',
  GEAR_MASTER: 'Rigger',
  MANIFEST_STAFF: 'Manifest Staff',
  SAFETY_OFFICER: 'Safety Officer',
  JUMPER: 'Jumper',
};

const getRoleColorClasses = (role: string): string => {
  const map: Record<string, string> = {
    Pilot: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    Instructor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    'Tandem Instructor': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    Rigger: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'Manifest Staff': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    'Safety Officer': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    Manager: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    Admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Operator: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  };
  return map[role] || 'bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-300';
};

const getRoleBadgeBg = (role: string): string => {
  const map: Record<string, string> = {
    Pilot: 'bg-sky-500',
    Instructor: 'bg-indigo-500',
    Rigger: 'bg-purple-500',
    'Manifest Staff': 'bg-teal-500',
    'Safety Officer': 'bg-rose-500',
    Manager: 'bg-amber-500',
    Admin: 'bg-red-500',
    Operator: 'bg-orange-500',
  };
  return map[role] || 'bg-gray-500';
};

// ── MAIN COMPONENT ────────────────────────────────────────
export default function StaffPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ success: boolean; data: any[] }>('/users?limit=100');
      if (res.success && res.data) {
        const mapped: StaffMember[] = res.data
          .filter((u: any) => {
            // Include only users with non-JUMPER roles (staff)
            const roles: string[] = u.roles || [];
            return roles.some((r: string) => r !== 'JUMPER');
          })
          .map((u: any) => {
            const roles: string[] = u.roles || [];
            const primaryRole = roles.find((r: string) => r !== 'JUMPER') || roles[0] || 'Staff';
            const displayRole = ROLE_DISPLAY[primaryRole] || primaryRole;
            return {
              id: u.id,
              name: `${u.firstName} ${u.lastName}`,
              email: u.email,
              role: displayRole,
              roles: roles.map((r: string) => ROLE_DISPLAY[r] || r),
              status: 'on-duty',
              lastActive: new Date(),
            };
          });
        setStaff(mapped.length > 0 ? mapped : []);
      } else {
        setStaff([]);
      }
    } catch {
      setStaff(FALLBACK_STAFF);
      setError('Unable to load staff. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const toggleDutyStatus = (id: number | string) => {
    setStaff(staff.map((s) =>
      s.id === id ? { ...s, status: s.status === 'on-duty' ? 'off-duty' : 'on-duty' } : s
    ));
  };

  // Filtering
  const roles = Array.from(new Set(staff.map((s) => s.role)));
  const filtered = staff.filter((s) => {
    if (filter !== 'All' && s.role !== filter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const onDutyCount = staff.filter((s) => s.status === 'on-duty').length;

  return (
    <RouteGuard allowedRoles={ROLE_GROUPS.STAFF_MGMT}>
    <div className="p-4 lg:p-6 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Staff Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {onDutyCount} on duty &bull; {staff.length} total staff
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
          >
            <Plus size={18} />
            Add Staff
          </button>
        </div>

        {/* Search */}
        <div className="mb-4 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 dark:text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* Role Filter */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('All')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
              filter === 'All'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            All ({staff.length})
          </button>
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => setFilter(role)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
                filter === role
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Loading staff...</p>
          </div>
        ) : filtered.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700">
            <Users size={48} className="text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">No staff members found</p>
            <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 text-sm mt-1">
              {error ? error : search ? 'Try adjusting your search' : 'Data will appear here once available.'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 overflow-hidden">
            {/* Table for Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">Last Active</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((member, i) => (
                    <tr
                      key={member.id}
                      className={`border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 ${
                        i % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50 dark:bg-slate-800/50'
                      } hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${getRoleBadgeBg(member.role)}`}>
                            {member.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div className="font-semibold text-gray-900 dark:text-white">{member.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full font-semibold text-xs ${getRoleColorClasses(member.role)}`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${member.status === 'on-duty' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <span className={`font-semibold text-sm ${member.status === 'on-duty' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {member.status === 'on-duty' ? 'On Duty' : 'Off Duty'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{member.email}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {formatLastActive(member.lastActive)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleDutyStatus(member.id)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg text-gray-600 dark:text-gray-400 transition-colors"
                            title="Toggle duty status"
                          >
                            <Power size={16} />
                          </button>
                          <button
                            onClick={() => setSelectedMember(member)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg text-gray-600 dark:text-gray-400 transition-colors"
                            title="View details"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards for Mobile */}
            <div className="lg:hidden p-4 space-y-4">
              {filtered.map((member) => (
                <div key={member.id} className="border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-slate-800">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${getRoleBadgeBg(member.role)}`}>
                        {member.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white">{member.name}</div>
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-xs inline-block mt-1 ${getRoleColorClasses(member.role)}`}>
                          {member.role}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className={`w-2.5 h-2.5 rounded-full ${member.status === 'on-duty' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className={`font-semibold text-xs ${member.status === 'on-duty' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {member.status === 'on-duty' ? 'On' : 'Off'}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">{member.email}</div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-xs text-gray-600 dark:text-gray-400">{formatLastActive(member.lastActive)}</span>
                    <div className="flex gap-2">
                      <button onClick={() => toggleDutyStatus(member.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg text-gray-600 dark:text-gray-400 transition-colors">
                        <Power size={16} />
                      </button>
                      <button
                        onClick={() => setSelectedMember(member)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg text-gray-600 dark:text-gray-400 transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Staff Detail Modal */}
        {selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedMember(null)}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Staff Details</h3>
                <button onClick={() => setSelectedMember(null)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 text-xl">&times;</button>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${getRoleBadgeBg(selectedMember.role)}`}>
                  {selectedMember.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{selectedMember.name}</div>
                  <span className={`px-2 py-0.5 rounded-full font-semibold text-xs ${getRoleColorClasses(selectedMember.role)}`}>{selectedMember.role}</span>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Email</span>
                  <span className="text-gray-900 dark:text-white dark:text-gray-100">{selectedMember.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Status</span>
                  <span className={`font-semibold ${selectedMember.status === 'on-duty' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {selectedMember.status === 'on-duty' ? 'On Duty' : 'Off Duty'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Last Active</span>
                  <span className="text-gray-900 dark:text-white dark:text-gray-100">{formatLastActive(selectedMember.lastActive)}</span>
                </div>
                {selectedMember.roles.length > 1 && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-500 dark:text-gray-400">All Roles</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {selectedMember.roles.map(r => (
                        <span key={r} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300">{r}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setSelectedMember(null)} className="w-full mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm">Close</button>
            </div>
          </div>
        )}

        {/* Add Staff Modal */}
        {showAddModal && (
          <AddStaffModal onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); fetchStaff(); }} />
        )}
      </div>
    </div>
    </RouteGuard>
  );
}

// ── ADD STAFF MODAL ────────────────────────────────────────
function AddStaffModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('JUMPER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Search for user by email first
      const { apiGet, apiPost } = await import('@/lib/api');
      const searchRes = await apiGet<{ success: boolean; data: any[] }>(`/users?search=${encodeURIComponent(email)}&limit=1`);
      if (searchRes?.data?.[0]) {
        // User found — assign role
        await apiPost('/admin/roles/assign', { userId: searchRes.data[0].id, roleName: role });
        onSuccess();
      } else {
        setNotFound(true);
      }
    } catch (err) {
      setNotFound(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Staff Member</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              placeholder="staff@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:border-gray-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-gray-900 dark:text-white dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(ROLE_DISPLAY).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          {notFound && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">User not found. They must register first, then you can assign their role.</p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 font-medium text-sm">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50">
              {isSubmitting ? 'Adding...' : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
