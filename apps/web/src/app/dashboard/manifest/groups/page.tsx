'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { RouteGuard, ROLE_GROUPS } from '@/components/RouteGuard';
import {
  Users,
  Plus,
  Trash2,
  Loader2,
  UserPlus,
  ChevronDown,
  ChevronRight,
  Pencil,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';

// ── GROUP TYPE CONFIG ────────────────────────────────────────
const GROUP_TYPES = ['RW', 'FREEFLY', 'ANGLE', 'WINGSUIT', 'COACHING', 'TANDEM_CAMERA', 'AFF', 'CRW'] as const;
type GroupType = typeof GROUP_TYPES[number];

const GROUP_TYPE_STYLES: Record<GroupType, { badge: string }> = {
  RW:            { badge: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' },
  FREEFLY:       { badge: 'bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800' },
  ANGLE:         { badge: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800' },
  WINGSUIT:      { badge: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' },
  COACHING:      { badge: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' },
  TANDEM_CAMERA: { badge: 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800' },
  AFF:           { badge: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800' },
  CRW:           { badge: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800' },
};

const GROUP_TYPE_LABELS: Record<GroupType, string> = {
  RW: 'RW (Belly)',
  FREEFLY: 'Freefly',
  ANGLE: 'Angle',
  WINGSUIT: 'Wingsuit',
  COACHING: 'Coaching',
  TANDEM_CAMERA: 'Tandem Camera',
  AFF: 'AFF',
  CRW: 'CRW',
};

// ── MEMBER ROLE CONFIG ───────────────────────────────────────
const MEMBER_ROLES = ['CAPTAIN', 'MEMBER'] as const;
type MemberRole = typeof MEMBER_ROLES[number];

const ROLE_BADGE_STYLES: Record<MemberRole, string> = {
  CAPTAIN: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  MEMBER:  'bg-slate-50 text-gray-500 dark:bg-slate-700 dark:text-gray-400',
};

// ── INTERFACES ───────────────────────────────────────────────
interface GroupMember {
  id: number;
  userId: number;
  userName: string | null;
  role: MemberRole;
  status: string | null;
}

interface Group {
  id: number;
  name: string;
  groupType: GroupType;
  isTemplate: boolean;
  captainId: number | null;
  captainName: string | null;
  memberCount: number;
  members: GroupMember[];
  createdAt: string;
}

interface UserOption {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

// ── BADGE COMPONENT ──────────────────────────────────────────
function TypeBadge({ type }: { type: GroupType }) {
  const s = GROUP_TYPE_STYLES[type] || GROUP_TYPE_STYLES.RW;
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${s.badge}`}>
      {GROUP_TYPE_LABELS[type] || type}
    </span>
  );
}

function RoleBadge({ role }: { role: MemberRole }) {
  const s = ROLE_BADGE_STYLES[role] || ROLE_BADGE_STYLES.MEMBER;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${s}`}>
      {role}
    </span>
  );
}

// ── ERROR BANNER ─────────────────────────────────────────────
function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/50 rounded-lg px-4 py-2.5 flex items-center gap-2.5 mb-4">
      <AlertCircle size={16} className="text-red-500 dark:text-red-400" />
      <span className="flex-1 text-red-700 dark:text-red-400 text-sm font-medium">{message}</span>
      <button onClick={onDismiss} className="bg-transparent border-none cursor-pointer p-0.5">
        <X size={14} className="text-red-700 dark:text-red-400" />
      </button>
    </div>
  );
}

// ── MODAL OVERLAY ────────────────────────────────────────────
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/35 z-[1000] flex items-center justify-center p-5"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-[480px] shadow-2xl"
      >
        {children}
      </div>
    </div>
  );
}

// ── MAIN CONTENT ─────────────────────────────────────────────
function GroupsContent() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded group tracking
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createType, setCreateType] = useState<GroupType>('RW');
  const [createCaptainId, setCreateCaptainId] = useState<number | null>(null);
  const [createIsTemplate, setCreateIsTemplate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit modal state
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<GroupType>('RW');
  const [saving, setSaving] = useState(false);

  // Add member state
  const [addMemberGroupId, setAddMemberGroupId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<MemberRole>('MEMBER');
  const [addingMember, setAddingMember] = useState(false);

  // User list for selectors
  const [users, setUsers] = useState<UserOption[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);

  // ── DATA FETCHING ────────────────────────────────────────
  const fetchGroups = useCallback(async () => {
    try {
      setError(null);
      const res = await apiGet<{ success: boolean; data: Group[] }>('/manifest/groups');
      if (res.success && res.data) {
        setGroups(res.data);
      } else {
        setGroups([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load groups');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    if (usersLoaded) return;
    try {
      const res = await apiGet<{ success: boolean; data: UserOption[] }>('/users?limit=50');
      if (res.success && res.data) {
        setUsers(res.data);
      }
      setUsersLoaded(true);
    } catch {
      // Non-critical; user can still use the page
      setUsersLoaded(true);
    }
  }, [usersLoaded]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  // ── CREATE GROUP ─────────────────────────────────────────
  function openCreateModal() {
    setCreateName('');
    setCreateType('RW');
    setCreateCaptainId(null);
    setCreateIsTemplate(false);
    setShowCreateModal(true);
    fetchUsers();
  }

  async function handleCreate() {
    if (!createName.trim()) {
      setError('Group name is required');
      return;
    }
    if (!createCaptainId) {
      setError('Please select a captain for the group');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await apiPost('/manifest/groups', {
        name: createName.trim(),
        groupType: createType,
        captainId: createCaptainId,
        isTemplate: createIsTemplate,
      });
      setShowCreateModal(false);
      await fetchGroups();
    } catch (err: any) {
      setError(err?.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  }

  // ── EDIT GROUP ───────────────────────────────────────────
  function openEditModal(group: Group) {
    setEditGroup(group);
    setEditName(group.name);
    setEditType(group.groupType);
  }

  async function handleUpdate() {
    if (!editGroup || !editName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiPatch(`/manifest/groups/${editGroup.id}`, {
        name: editName.trim(),
        groupType: editType,
      });
      setEditGroup(null);
      await fetchGroups();
    } catch (err: any) {
      setError(err?.message || 'Failed to update group');
    } finally {
      setSaving(false);
    }
  }

  // ── ADD MEMBER ───────────────────────────────────────────
  function openAddMember(groupId: number) {
    setAddMemberGroupId(groupId);
    setSelectedUserId(null);
    setSelectedRole('MEMBER');
    fetchUsers();
  }

  async function handleAddMember() {
    if (!addMemberGroupId || !selectedUserId) return;
    setAddingMember(true);
    setError(null);
    try {
      await apiPost(`/manifest/groups/${addMemberGroupId}/members`, {
        userId: selectedUserId,
        role: selectedRole,
      });
      setAddMemberGroupId(null);
      await fetchGroups();
    } catch (err: any) {
      setError(err?.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  }

  // ── REMOVE MEMBER ────────────────────────────────────────
  async function handleRemoveMember(groupId: number, memberId: number) {
    setError(null);
    try {
      await apiDelete(`/manifest/groups/${groupId}/members/${memberId}`);
      await fetchGroups();
    } catch (err: any) {
      setError(err?.message || 'Failed to remove member');
    }
  }

  // ── TOGGLE EXPAND ────────────────────────────────────────
  function toggleExpand(groupId: number) {
    setExpandedGroupId((prev) => (prev === groupId ? null : groupId));
  }

  // ── LOADING STATE ────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 size={32} className="text-secondary-500 animate-spin" />
      </div>
    );
  }

  // ── FILTER USER OPTIONS ──────────────────────────────────
  const currentGroupMembers = addMemberGroupId
    ? groups.find((g) => g.id === addMemberGroupId)?.members.map((m) => m.userId) ?? []
    : [];
  const filteredUsers = users.filter((u) => !currentGroupMembers.includes(u.id));

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Groups</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              {groups.length} group{groups.length !== 1 ? 's' : ''} configured
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 dark:bg-primary-600 text-white font-semibold text-sm cursor-pointer hover:opacity-90 transition-opacity border-none"
          >
            <Plus size={16} /> Create Group
          </button>
        </div>

        {/* ── Error Banner ────────────────────────────────── */}
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {/* ── Empty State ─────────────────────────────────── */}
        {groups.length === 0 && !error && (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <Users size={48} strokeWidth={1.5} className="mx-auto mb-4" />
            <p className="text-base mb-2">No groups yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Create a group to organize jumpers for loads.</p>
          </div>
        )}

        {/* ── Groups List ─────────────────────────────────── */}
        <div className="flex flex-col gap-2.5">
          {groups.map((group) => {
            const expanded = expandedGroupId === group.id;
            return (
              <div key={group.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                {/* Group Header Row */}
                <div
                  onClick={() => toggleExpand(group.id)}
                  className="flex items-center gap-3 px-4 py-3.5 sm:px-5 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  {expanded
                    ? <ChevronDown size={18} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                    : <ChevronRight size={18} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">{group.name}</span>
                      <TypeBadge type={group.groupType} />
                      {group.isTemplate && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-lg bg-slate-50 dark:bg-slate-700 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-slate-600">
                          TEMPLATE
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex gap-3 flex-wrap">
                      <span>{group.memberCount} member{group.memberCount !== 1 ? 's' : ''}</span>
                      {group.captainName && <span>Captain: {group.captainName}</span>}
                      <span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditModal(group); }}
                    title="Edit group"
                    className="px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 cursor-pointer flex items-center gap-1 text-xs font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                </div>

                {/* Expanded Members Section */}
                {expanded && (
                  <div className="border-t border-gray-200 dark:border-slate-700 px-4 py-3 pb-4 sm:px-5 bg-slate-50 dark:bg-slate-800/50">
                    {/* Add Member button */}
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                        Members ({group.members.length})
                      </span>
                      <button
                        onClick={() => openAddMember(group.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-emerald-500 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 cursor-pointer text-xs font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                      >
                        <UserPlus size={13} /> Add Member
                      </button>
                    </div>

                    {/* Members list */}
                    {group.members.length === 0 ? (
                      <div className="py-4 text-center text-gray-400 dark:text-gray-500 text-sm">
                        No members yet. Add jumpers to this group.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {group.members.map((member) => (
                          <div key={member.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                            <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-500 dark:text-blue-400">
                              {(member.userName || '?')[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {member.userName || `User #${member.userId}`}
                              </span>
                            </div>
                            <RoleBadge role={member.role} />
                            <button
                              onClick={() => handleRemoveMember(group.id, member.id)}
                              title="Remove member"
                              className="p-1 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-400 dark:text-gray-500 cursor-pointer flex items-center hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── CREATE GROUP MODAL ────────────────────────────── */}
        {showCreateModal && (
          <ModalOverlay onClose={() => setShowCreateModal(false)}>
            <div className="p-5 sm:p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create Group</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="bg-transparent border-none cursor-pointer p-1"
                >
                  <X size={18} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Name */}
              <label className="block mb-3.5">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                  Group Name *
                </span>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. 4-Way RW Team Alpha"
                  maxLength={255}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-primary-500 box-border"
                />
              </label>

              {/* Group Type */}
              <label className="block mb-3.5">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                  Group Type *
                </span>
                <select
                  value={createType}
                  onChange={(e) => setCreateType(e.target.value as GroupType)}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700 box-border"
                >
                  {GROUP_TYPES.map((t) => (
                    <option key={t} value={t}>{GROUP_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </label>

              {/* Captain */}
              <label className="block mb-3.5">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                  Captain *
                </span>
                <select
                  value={createCaptainId ?? ''}
                  onChange={(e) => setCreateCaptainId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700 box-border"
                >
                  <option value="">Select captain...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                  ))}
                </select>
              </label>

              {/* Template checkbox */}
              <label className="flex items-center gap-2 mb-5 text-sm text-gray-500 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createIsTemplate}
                  onChange={(e) => setCreateIsTemplate(e.target.checked)}
                  className="accent-primary-500"
                />
                Save as reusable template
              </label>

              {/* Actions */}
              <div className="flex gap-2.5 justify-end">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !createName.trim() || !createCaptainId}
                  className="px-4 py-2 rounded-md border-none bg-primary-500 dark:bg-primary-600 text-white text-sm font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-default hover:opacity-90 transition-opacity"
                >
                  {creating && <Loader2 size={14} className="animate-spin" />}
                  {creating ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </div>
          </ModalOverlay>
        )}

        {/* ── EDIT GROUP MODAL ──────────────────────────────── */}
        {editGroup && (
          <ModalOverlay onClose={() => setEditGroup(null)}>
            <div className="p-5 sm:p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Group</h2>
                <button
                  onClick={() => setEditGroup(null)}
                  className="bg-transparent border-none cursor-pointer p-1"
                >
                  <X size={18} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Name */}
              <label className="block mb-3.5">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                  Group Name
                </span>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={255}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-primary-500 box-border"
                />
              </label>

              {/* Type */}
              <label className="block mb-5">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                  Group Type
                </span>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as GroupType)}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700 box-border"
                >
                  {GROUP_TYPES.map((t) => (
                    <option key={t} value={t}>{GROUP_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </label>

              {/* Actions */}
              <div className="flex gap-2.5 justify-end">
                <button
                  onClick={() => setEditGroup(null)}
                  className="px-4 py-2 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={saving || !editName.trim()}
                  className="px-4 py-2 rounded-md border-none bg-primary-500 dark:bg-primary-600 text-white text-sm font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-default hover:opacity-90 transition-opacity"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  <Check size={14} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </ModalOverlay>
        )}

        {/* ── ADD MEMBER MODAL ──────────────────────────────── */}
        {addMemberGroupId !== null && (
          <ModalOverlay onClose={() => setAddMemberGroupId(null)}>
            <div className="p-5 sm:p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Member</h2>
                <button
                  onClick={() => setAddMemberGroupId(null)}
                  className="bg-transparent border-none cursor-pointer p-1"
                >
                  <X size={18} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* User selector */}
              <label className="block mb-3.5">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                  Select User *
                </span>
                <select
                  value={selectedUserId ?? ''}
                  onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700 box-border"
                >
                  <option value="">Select a user...</option>
                  {filteredUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                  ))}
                </select>
              </label>

              {/* Role selector */}
              <label className="block mb-5">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                  Role
                </span>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as MemberRole)}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700 box-border"
                >
                  {MEMBER_ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>

              {/* Actions */}
              <div className="flex gap-2.5 justify-end">
                <button
                  onClick={() => setAddMemberGroupId(null)}
                  className="px-4 py-2 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMember}
                  disabled={addingMember || !selectedUserId}
                  className="px-4 py-2 rounded-md border-none bg-emerald-500 dark:bg-emerald-600 text-white text-sm font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-default hover:opacity-90 transition-opacity"
                >
                  {addingMember && <Loader2 size={14} className="animate-spin" />}
                  <UserPlus size={14} />
                  {addingMember ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </div>
          </ModalOverlay>
        )}
      </div>
    </div>
  );
}

// ── PAGE EXPORT ───────────────────────────────────────────────
export default function GroupsPage() {
  return (
    <RouteGuard allowedRoles={ROLE_GROUPS.MANIFEST}>
      <GroupsContent />
    </RouteGuard>
  );
}
