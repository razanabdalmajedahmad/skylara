'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield,
  Users,
  Grid3X3,
  Plus,
  Search,
  Check,
  X,
  Copy,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  UserCog,
  Lock,
  Eye,
  FilePlus,
  FileEdit,
  Stamp,
  Trash2,
  Download,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { apiGet, apiPut, apiPost, apiDelete } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

// ── TYPES ────────────────────────────────────────────────────────────────────

type PermissionType = 'view' | 'create' | 'edit' | 'approve' | 'delete' | 'export' | 'manage';

interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  userCount: number;
  active: boolean;
  color: string;
  colorClasses: string;
  system: boolean;
}

interface PermissionRow {
  module: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  approve: boolean;
  delete: boolean;
  export: boolean;
  manage: boolean;
}

interface UserAssignment {
  id: string;
  name: string;
  email: string;
  roles: string[];
  userRoleIds?: Record<string, number>; // maps roleName -> userRole.id for API revoke
  lastLogin: string;
  status: 'active' | 'inactive' | 'suspended';
  avatar?: string;
}

type TabId = 'roles' | 'permissions' | 'users';

// ── CONSTANTS ────────────────────────────────────────────────────────────────

const PERMISSION_COLS: { key: PermissionType; label: string; icon: React.ReactNode }[] = [
  { key: 'view', label: 'View', icon: <Eye className="w-3.5 h-3.5" /> },
  { key: 'create', label: 'Create', icon: <FilePlus className="w-3.5 h-3.5" /> },
  { key: 'edit', label: 'Edit', icon: <FileEdit className="w-3.5 h-3.5" /> },
  { key: 'approve', label: 'Approve', icon: <Stamp className="w-3.5 h-3.5" /> },
  { key: 'delete', label: 'Delete', icon: <Trash2 className="w-3.5 h-3.5" /> },
  { key: 'export', label: 'Export', icon: <Download className="w-3.5 h-3.5" /> },
  { key: 'manage', label: 'Manage', icon: <Settings className="w-3.5 h-3.5" /> },
];

const MODULES = [
  'Dashboard', 'Manifest', 'Loads', 'Check-in', 'Athletes', 'Students',
  'Tandems', 'Coaches', 'Instructors', 'Staff', 'Waivers', 'Documents',
  'Medical', 'Events', 'Bookings', 'Payments', 'Wallet', 'Reports',
  'AI', 'Documentation', 'Settings', 'Branding', 'Roles & Permissions',
  'Integrations', 'Audit Logs',
];

const ALL_ROLE_IDS = [
  'PLATFORM_ADMIN', 'DZ_MANAGER', 'DZ_OPERATOR', 'MANIFEST_STAFF',
  'SAFETY_OFFICER', 'PILOT', 'TANDEM_INSTRUCTOR', 'AFF_INSTRUCTOR',
  'COACH', 'JUMPER', 'STUDENT',
] as const;

// ── Role badge styling (UI only; server roles drive assignments) ─────────────

const ROLE_COLOR_MAP: Record<string, { color: string; colorClasses: string }> = {
  PLATFORM_ADMIN: { color: 'red', colorClasses: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800' },
  DZ_MANAGER: { color: 'amber', colorClasses: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  DZ_OPERATOR: { color: 'orange', colorClasses: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
  MANIFEST_STAFF: { color: 'teal', colorClasses: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800' },
  SAFETY_OFFICER: { color: 'rose', colorClasses: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800' },
  PILOT: { color: 'sky', colorClasses: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800' },
  TANDEM_INSTRUCTOR: { color: 'violet', colorClasses: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800' },
  AFF_INSTRUCTOR: { color: 'indigo', colorClasses: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' },
  INSTRUCTOR: { color: 'indigo', colorClasses: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' },
  COACH: { color: 'emerald', colorClasses: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  JUMPER: { color: 'blue', colorClasses: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  STUDENT: { color: 'cyan', colorClasses: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800' },
  ATHLETE: { color: 'blue', colorClasses: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  GEAR_MASTER: { color: 'purple', colorClasses: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
  DZ_OWNER: { color: 'amber', colorClasses: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
};

const DEFAULT_ROLE_STYLE = { color: 'gray', colorClasses: 'bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 dark:border-gray-600' };

// ── DEFAULT PERMISSIONS PER ROLE ─────────────────────────────────────────────

const buildRow = (module: string, perms: Partial<Record<PermissionType, boolean>>): PermissionRow => ({
  module,
  view: perms.view ?? false,
  create: perms.create ?? false,
  edit: perms.edit ?? false,
  approve: perms.approve ?? false,
  delete: perms.delete ?? false,
  export: perms.export ?? false,
  manage: perms.manage ?? false,
});

const allTrue = (): Partial<Record<PermissionType, boolean>> => ({ view: true, create: true, edit: true, approve: true, delete: true, export: true, manage: true });
const viewOnly = (): Partial<Record<PermissionType, boolean>> => ({ view: true });
const viewCreate = (): Partial<Record<PermissionType, boolean>> => ({ view: true, create: true });
const viewCreateEdit = (): Partial<Record<PermissionType, boolean>> => ({ view: true, create: true, edit: true });
const viewExport = (): Partial<Record<PermissionType, boolean>> => ({ view: true, export: true });
const none = (): Partial<Record<PermissionType, boolean>> => ({});

function buildDefaultPermissions(roleId: string): PermissionRow[] {
  switch (roleId) {
    case 'PLATFORM_ADMIN':
      return MODULES.map(m => buildRow(m, allTrue()));

    case 'DZ_MANAGER':
      return MODULES.map(m => {
        if (['Roles & Permissions', 'Integrations'].includes(m)) return buildRow(m, { view: true, edit: true, manage: true });
        if (m === 'Audit Logs') return buildRow(m, viewExport());
        return buildRow(m, allTrue());
      });

    case 'DZ_OPERATOR':
      return MODULES.map(m => {
        if (['Dashboard', 'Manifest', 'Loads', 'Check-in', 'Athletes', 'Bookings'].includes(m))
          return buildRow(m, { view: true, create: true, edit: true, approve: true, export: true });
        if (['Students', 'Tandems', 'Waivers', 'Events'].includes(m))
          return buildRow(m, viewCreateEdit());
        if (['Payments', 'Wallet'].includes(m)) return buildRow(m, { view: true, create: true, edit: true });
        if (['Reports'].includes(m)) return buildRow(m, viewExport());
        if (['Staff', 'Coaches', 'Instructors'].includes(m)) return buildRow(m, viewOnly());
        if (['Settings', 'Branding', 'Roles & Permissions', 'Integrations', 'Audit Logs'].includes(m)) return buildRow(m, none());
        return buildRow(m, viewOnly());
      });

    case 'MANIFEST_STAFF':
      return MODULES.map(m => {
        if (['Dashboard', 'Manifest', 'Loads', 'Check-in'].includes(m))
          return buildRow(m, { view: true, create: true, edit: true, approve: true });
        if (['Athletes', 'Students', 'Tandems', 'Bookings'].includes(m))
          return buildRow(m, viewCreateEdit());
        if (['Waivers'].includes(m)) return buildRow(m, { view: true, create: true });
        if (['Payments', 'Wallet'].includes(m)) return buildRow(m, { view: true, create: true });
        if (['Events'].includes(m)) return buildRow(m, viewOnly());
        return buildRow(m, none());
      });

    case 'SAFETY_OFFICER':
      return MODULES.map(m => {
        if (['Dashboard'].includes(m)) return buildRow(m, viewOnly());
        if (['Medical', 'Documents', 'Waivers'].includes(m))
          return buildRow(m, { view: true, create: true, edit: true, approve: true, export: true });
        if (['Athletes', 'Students', 'Instructors', 'Staff'].includes(m))
          return buildRow(m, { view: true, edit: true, export: true });
        if (['Manifest', 'Loads'].includes(m)) return buildRow(m, { view: true, approve: true });
        if (['Reports', 'Audit Logs'].includes(m)) return buildRow(m, viewExport());
        if (['Events'].includes(m)) return buildRow(m, viewCreateEdit());
        return buildRow(m, none());
      });

    case 'PILOT':
      return MODULES.map(m => {
        if (['Dashboard'].includes(m)) return buildRow(m, viewOnly());
        if (['Manifest', 'Loads'].includes(m)) return buildRow(m, { view: true, edit: true });
        if (['Athletes'].includes(m)) return buildRow(m, viewOnly());
        if (['Documents'].includes(m)) return buildRow(m, { view: true, create: true });
        if (['Reports'].includes(m)) return buildRow(m, viewOnly());
        return buildRow(m, none());
      });

    case 'TANDEM_INSTRUCTOR':
      return MODULES.map(m => {
        if (['Dashboard'].includes(m)) return buildRow(m, viewOnly());
        if (['Manifest', 'Loads'].includes(m)) return buildRow(m, viewOnly());
        if (['Tandems'].includes(m)) return buildRow(m, { view: true, create: true, edit: true, approve: true });
        if (['Students', 'Athletes'].includes(m)) return buildRow(m, { view: true, edit: true });
        if (['Waivers'].includes(m)) return buildRow(m, { view: true, create: true });
        if (['Bookings'].includes(m)) return buildRow(m, viewOnly());
        if (['Documents', 'Medical'].includes(m)) return buildRow(m, viewOnly());
        if (['Check-in'].includes(m)) return buildRow(m, viewCreate());
        return buildRow(m, none());
      });

    case 'AFF_INSTRUCTOR':
      return MODULES.map(m => {
        if (['Dashboard'].includes(m)) return buildRow(m, viewOnly());
        if (['Manifest', 'Loads'].includes(m)) return buildRow(m, viewOnly());
        if (['Students'].includes(m)) return buildRow(m, { view: true, create: true, edit: true, approve: true });
        if (['Athletes'].includes(m)) return buildRow(m, { view: true, edit: true });
        if (['Waivers'].includes(m)) return buildRow(m, { view: true, create: true });
        if (['Bookings'].includes(m)) return buildRow(m, viewOnly());
        if (['Documents', 'Medical'].includes(m)) return buildRow(m, viewOnly());
        if (['Check-in'].includes(m)) return buildRow(m, viewCreate());
        return buildRow(m, none());
      });

    case 'COACH':
      return MODULES.map(m => {
        if (['Dashboard'].includes(m)) return buildRow(m, viewOnly());
        if (['Manifest', 'Loads'].includes(m)) return buildRow(m, viewOnly());
        if (['Athletes'].includes(m)) return buildRow(m, { view: true, edit: true });
        if (['Coaches'].includes(m)) return buildRow(m, viewOnly());
        if (['Bookings'].includes(m)) return buildRow(m, viewOnly());
        if (['Events'].includes(m)) return buildRow(m, viewOnly());
        if (['Check-in'].includes(m)) return buildRow(m, viewCreate());
        return buildRow(m, none());
      });

    case 'JUMPER':
      return MODULES.map(m => {
        if (['Dashboard'].includes(m)) return buildRow(m, viewOnly());
        if (['Manifest'].includes(m)) return buildRow(m, { view: true, create: true });
        if (['Loads'].includes(m)) return buildRow(m, viewOnly());
        if (['Bookings'].includes(m)) return buildRow(m, { view: true, create: true, edit: true });
        if (['Wallet'].includes(m)) return buildRow(m, { view: true, create: true });
        if (['Waivers'].includes(m)) return buildRow(m, viewOnly());
        if (['Documents'].includes(m)) return buildRow(m, viewOnly());
        if (['Events'].includes(m)) return buildRow(m, viewOnly());
        return buildRow(m, none());
      });

    case 'STUDENT':
      return MODULES.map(m => {
        if (['Dashboard'].includes(m)) return buildRow(m, viewOnly());
        if (['Bookings'].includes(m)) return buildRow(m, { view: true, create: true });
        if (['Wallet'].includes(m)) return buildRow(m, viewOnly());
        if (['Waivers'].includes(m)) return buildRow(m, viewOnly());
        if (['Documents'].includes(m)) return buildRow(m, viewOnly());
        return buildRow(m, none());
      });

    default:
      return MODULES.map(m => buildRow(m, none()));
  }
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

/** Human-readable label from role id (e.g. TANDEM_INSTRUCTOR → Tandem Instructor). */
function roleLabel(roleId: string): string {
  return roleId.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

function roleBadgeClasses(roleId: string): string {
  return (ROLE_COLOR_MAP[roleId] || DEFAULT_ROLE_STYLE).colorClasses;
}

function formatLastLogin(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

const statusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-400',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function RolesPermissionsPage() {
  const { user } = useAuth();

  // ── State ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>('roles');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadIssues, setLoadIssues] = useState<string | null>(null);

  // Roles tab
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [roleSearch, setRoleSearch] = useState('');

  // Permissions tab
  const [selectedRoleId, setSelectedRoleId] = useState<string>('PLATFORM_ADMIN');
  const [permissionsMap, setPermissionsMap] = useState<Record<string, PermissionRow[]>>({});
  const [editingRoleFromCard, setEditingRoleFromCard] = useState<string | null>(null);

  // Users tab
  const [users, setUsers] = useState<UserAssignment[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [bulkRole, setBulkRole] = useState<string>('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // ── Load data ──────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadIssues(null);
    const issues: string[] = [];

    try {
      const [rolesRes, usersRes] = await Promise.allSettled([
        apiGet<{ success: boolean; error?: string; data: Array<{ id: string; dbId: number; name: string; description: string; userCount: number; active: boolean; system: boolean }> }>('/admin/roles'),
        apiGet<{ success: boolean; error?: string; data: Array<{ id: number; name: string; email: string; roles: string[]; userRoleIds: Record<string, number>; lastLogin: string; status: string }> }>('/admin/roles/users'),
      ]);

      if (rolesRes.status === 'fulfilled' && rolesRes.value?.success && Array.isArray(rolesRes.value.data)) {
        const mapped: RoleDefinition[] = rolesRes.value.data.map((r) => {
          const style = ROLE_COLOR_MAP[r.id] || DEFAULT_ROLE_STYLE;
          return {
            id: r.id,
            name: r.name,
            description: r.description,
            userCount: r.userCount,
            active: r.active,
            color: style.color,
            colorClasses: style.colorClasses,
            system: r.system,
          };
        });
        setRoles(mapped);
      } else {
        setRoles([]);
        if (rolesRes.status === 'rejected') {
          issues.push('Roles list could not be loaded.');
        } else if (rolesRes.status === 'fulfilled' && rolesRes.value && !rolesRes.value.success) {
          issues.push(rolesRes.value.error || 'Roles request failed.');
        }
      }

      if (usersRes.status === 'fulfilled' && usersRes.value?.success && Array.isArray(usersRes.value.data)) {
        const mapped: UserAssignment[] = usersRes.value.data.map((u) => ({
          id: String(u.id),
          name: u.name,
          email: u.email,
          roles: u.roles,
          userRoleIds: u.userRoleIds,
          lastLogin: u.lastLogin,
          status: (u.status as 'active' | 'inactive' | 'suspended') || 'active',
        }));
        setUsers(mapped);
      } else {
        setUsers([]);
        if (usersRes.status === 'rejected') {
          issues.push('User assignments could not be loaded.');
        } else if (usersRes.status === 'fulfilled' && usersRes.value && !usersRes.value.success) {
          issues.push(usersRes.value.error || 'Users request failed.');
        }
      }

      const map: Record<string, PermissionRow[]> = {};
      ALL_ROLE_IDS.forEach((rid) => {
        map[rid] = buildDefaultPermissions(rid);
      });
      setPermissionsMap(map);

      setLoadIssues(issues.length ? issues.join(' ') : null);
    } catch {
      setRoles([]);
      setUsers([]);
      setLoadIssues('Could not reach the roles service. Check your connection and try again.');
      const map: Record<string, PermissionRow[]> = {};
      ALL_ROLE_IDS.forEach((rid) => {
        map[rid] = buildDefaultPermissions(rid);
      });
      setPermissionsMap(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived ────────────────────────────────────────
  const filteredRoles = useMemo(() => {
    if (!roleSearch.trim()) return roles;
    const q = roleSearch.toLowerCase();
    return roles.filter(r =>
      r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
    );
  }, [roles, roleSearch]);

  const currentPermissions = useMemo<PermissionRow[]>(
    () => permissionsMap[selectedRoleId] ?? [],
    [permissionsMap, selectedRoleId]
  );

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) ||
      u.roles.some(r => roleLabel(r).toLowerCase().includes(q))
    );
  }, [users, userSearch]);

  // ── Handlers: Roles tab ────────────────────────────
  const toggleRoleActive = useCallback((roleId: string) => {
    setRoles(prev => prev.map(r => r.id === roleId ? { ...r, active: !r.active } : r));
  }, []);

  const duplicateRole = useCallback((roleId: string) => {
    setRoles(prev => {
      const source = prev.find(r => r.id === roleId);
      if (!source) return prev;
      const newId = `${roleId}_COPY_${Date.now()}`;
      const copy: RoleDefinition = {
        ...source,
        id: newId,
        name: `${source.name} (Copy)`,
        userCount: 0,
        system: false,
      };
      return [...prev, copy];
    });
    // Also copy permissions
    setPermissionsMap(prev => ({
      ...prev,
      [`${roleId}_COPY_${Date.now()}`]: JSON.parse(JSON.stringify(prev[roleId] ?? buildDefaultPermissions(roleId))),
    }));
  }, []);

  const openPermissionsForRole = useCallback((roleId: string) => {
    setSelectedRoleId(roleId);
    setEditingRoleFromCard(roleId);
    setActiveTab('permissions');
  }, []);

  const handleCreateRole = useCallback(() => {
    const newId = `CUSTOM_ROLE_${Date.now()}`;
    const newRole: RoleDefinition = {
      id: newId,
      name: 'New Custom Role',
      description: 'Custom role description. Edit permissions in the Permissions Matrix tab.',
      userCount: 0,
      active: true,
      color: 'gray',
      colorClasses: 'bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 dark:border-gray-600',
      system: false,
    };
    setRoles(prev => [...prev, newRole]);
    setPermissionsMap(prev => ({
      ...prev,
      [newId]: buildDefaultPermissions(''),
    }));
  }, []);

  // ── Handlers: Permissions tab ──────────────────────
  const togglePermission = useCallback((module: string, perm: PermissionType) => {
    setPermissionsMap(prev => {
      const rows = [...(prev[selectedRoleId] ?? [])];
      const idx = rows.findIndex(r => r.module === module);
      if (idx === -1) return prev;
      rows[idx] = { ...rows[idx], [perm]: !rows[idx][perm] };
      return { ...prev, [selectedRoleId]: rows };
    });
  }, [selectedRoleId]);

  const selectAllRow = useCallback((module: string, value: boolean) => {
    setPermissionsMap(prev => {
      const rows = [...(prev[selectedRoleId] ?? [])];
      const idx = rows.findIndex(r => r.module === module);
      if (idx === -1) return prev;
      const updated = { ...rows[idx] };
      PERMISSION_COLS.forEach(c => { updated[c.key] = value; });
      rows[idx] = updated;
      return { ...prev, [selectedRoleId]: rows };
    });
  }, [selectedRoleId]);

  const selectAllCol = useCallback((perm: PermissionType, value: boolean) => {
    setPermissionsMap(prev => {
      const rows = (prev[selectedRoleId] ?? []).map(r => ({ ...r, [perm]: value }));
      return { ...prev, [selectedRoleId]: rows };
    });
  }, [selectedRoleId]);

  const savePermissions = useCallback(async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await apiPut(`/roles/${selectedRoleId}/permissions`, { data: { permissions: permissionsMap[selectedRoleId] } });
      setSaveMsg({ type: 'success', text: 'Permissions saved successfully.' });
    } catch {
      setSaveMsg({ type: 'error', text: 'Could not save permissions. Verify the API endpoint and your access.' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 5000);
    }
  }, [selectedRoleId, permissionsMap]);

  // ── Handlers: Users tab ────────────────────────────
  const changeUserRole = useCallback(async (userId: string, newRole: string) => {
    if (!newRole) return;
    // Optimistic update
    setUsers(prev => prev.map(u =>
      u.id === userId
        ? { ...u, roles: u.roles.includes(newRole) ? u.roles : [...u.roles, newRole] }
        : u
    ));
    try {
      await apiPost('/admin/roles/assign', { userId: parseInt(userId), roleName: newRole });
      // Refresh to get updated userRoleIds from server
      loadData();
    } catch {
      // Revert optimistic update on failure
      setUsers(prev => prev.map(u =>
        u.id === userId
          ? { ...u, roles: u.roles.filter(r => r !== newRole) }
          : u
      ));
    }
  }, [loadData]);

  const removeUserRole = useCallback(async (userId: string, roleToRemove: string) => {
    const targetUser = users.find(u => u.id === userId);
    const userRoleId = targetUser?.userRoleIds?.[roleToRemove];

    // Optimistic update
    setUsers(prev => prev.map(u =>
      u.id === userId
        ? { ...u, roles: u.roles.filter(r => r !== roleToRemove) }
        : u
    ));

    if (userRoleId) {
      try {
        await apiDelete(`/admin/roles/${userRoleId}`);
        // Refresh to sync userRoleIds
        loadData();
      } catch {
        // Revert optimistic update on failure
        setUsers(prev => prev.map(u =>
          u.id === userId
            ? { ...u, roles: [...u.roles, roleToRemove] }
            : u
        ));
      }
    }
  }, [users, loadData]);

  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const bulkAssignRole = useCallback(async () => {
    if (!bulkRole || selectedUserIds.size === 0) return;
    // Optimistic update
    setUsers(prev => prev.map(u =>
      selectedUserIds.has(u.id) && !u.roles.includes(bulkRole)
        ? { ...u, roles: [...u.roles, bulkRole] }
        : u
    ));
    const idsToAssign = Array.from(selectedUserIds);
    setSelectedUserIds(new Set());
    setBulkRole('');

    // Fire API calls for each selected user
    try {
      await Promise.allSettled(
        idsToAssign.map(uid =>
          apiPost('/admin/roles/assign', { userId: parseInt(uid), roleName: bulkRole })
        )
      );
      // Refresh to get updated userRoleIds from server
      loadData();
    } catch {
      // On total failure, refresh to revert to server state
      loadData();
    }
  }, [bulkRole, selectedUserIds, loadData]);

  // ── Column-level all-checked? ──────────────────────
  const colAllChecked = useCallback((perm: PermissionType): boolean => {
    return currentPermissions.every(r => r[perm]);
  }, [currentPermissions]);

  const colNoneChecked = useCallback((perm: PermissionType): boolean => {
    return currentPermissions.every(r => !r[perm]);
  }, [currentPermissions]);

  // ── RENDER ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading roles & permissions...</span>
      </div>
    );
  }

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'roles', label: 'Roles', icon: <Shield className="w-4 h-4" /> },
    { id: 'permissions', label: 'Permissions Matrix', icon: <Grid3X3 className="w-4 h-4" /> },
    { id: 'users', label: 'User Assignments', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 pb-12">
      {loadIssues && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Some data did not load from the server.</p>
            <p className="mt-1 opacity-90">{loadIssues}</p>
            <button
              type="button"
              onClick={() => loadData()}
              className="mt-2 text-sm font-semibold text-amber-950 dark:text-amber-50 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Lock className="w-6 h-6 text-blue-500" />
            Roles & Permissions
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage access control for your dropzone staff and members.
          </p>
        </div>
        {activeTab === 'roles' && (
          <button
            onClick={handleCreateRole}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Role
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
        <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="Tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:border-slate-600 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ══════════════════════ TAB 1: ROLES ══════════════════════ */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search roles..."
              value={roleSearch}
              onChange={e => setRoleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {filteredRoles.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500 dark:text-gray-400">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No roles found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredRoles.map(role => (
                <div
                  key={role.id}
                  className={`relative rounded-xl border p-5 transition-shadow hover:shadow-md ${
                    role.active
                      ? 'bg-white dark:bg-slate-800 dark:bg-gray-800 border-gray-200 dark:border-slate-700 dark:border-gray-700'
                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-slate-700 dark:border-gray-700 opacity-60'
                  }`}
                >
                  {/* Top row: badge + status */}
                  <div className="flex items-start justify-between mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${role.colorClasses}`}>
                      <Shield className="w-3 h-3" />
                      {role.name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      role.active
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {role.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {role.description}
                  </p>

                  {/* Meta row */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {role.userCount} user{role.userCount !== 1 ? 's' : ''}
                    </span>
                    {role.system && (
                      <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400">
                        <Lock className="w-3 h-3" />
                        System
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-t border-gray-100 dark:border-gray-700 pt-3">
                    <button
                      onClick={() => openPermissionsForRole(role.id)}
                      title="Edit permissions"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => duplicateRole(role.id)}
                      title="Duplicate role"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-gray-50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      Duplicate
                    </button>
                    <button
                      onClick={() => toggleRoleActive(role.id)}
                      title={role.active ? 'Deactivate' : 'Activate'}
                      className={`ml-auto inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        role.active
                          ? 'bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/30'
                          : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
                      }`}
                    >
                      {role.active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                      {role.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════ TAB 2: PERMISSIONS MATRIX ══════════════════════ */}
      {activeTab === 'permissions' && (
        <div className="space-y-4">
          {/* Controls bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Role selector */}
            <div className="relative">
              <label htmlFor="role-selector" className="sr-only">Select Role</label>
              <select
                id="role-selector"
                value={selectedRoleId}
                onChange={e => { setSelectedRoleId(e.target.value); setEditingRoleFromCard(null); }}
                className="appearance-none pl-4 pr-10 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {editingRoleFromCard && (
              <span className="text-xs text-blue-500 dark:text-blue-400 flex items-center gap-1">
                <Pencil className="w-3 h-3" />
                Editing from role card
              </span>
            )}

            <div className="sm:ml-auto flex items-center gap-2">
              {saveMsg && (
                <span className={`flex items-center gap-1 text-xs font-medium ${saveMsg.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {saveMsg.type === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {saveMsg.text}
                </span>
              )}
              <button
                onClick={savePermissions}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Permissions
              </button>
            </div>
          </div>

          {/* Matrix table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/80">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 sticky left-0 bg-gray-50 dark:bg-gray-800/80 z-10 min-w-[180px]">
                    Module
                  </th>
                  {PERMISSION_COLS.map(col => (
                    <th key={col.key} className="px-2 py-3 text-center min-w-[80px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-gray-400">
                          {col.icon}
                          {col.label}
                        </span>
                        <button
                          onClick={() => selectAllCol(col.key, !colAllChecked(col.key))}
                          className="text-[10px] text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {colAllChecked(col.key) ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                    </th>
                  ))}
                  <th className="px-2 py-3 text-center min-w-[90px]">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Row</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentPermissions.map((row, idx) => {
                  const allInRow = PERMISSION_COLS.every(c => row[c.key]);
                  const noneInRow = PERMISSION_COLS.every(c => !row[c.key]);
                  return (
                    <tr
                      key={row.module}
                      className={`border-t border-gray-100 dark:border-gray-700/50 ${
                        idx % 2 === 0 ? 'bg-white dark:bg-slate-800 dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-800/40'
                      } hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors`}
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200 sticky left-0 bg-inherit z-10">
                        {row.module}
                      </td>
                      {PERMISSION_COLS.map(col => (
                        <td key={col.key} className="px-2 py-2.5 text-center">
                          <button
                            onClick={() => togglePermission(row.module, col.key)}
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-all ${
                              row[col.key]
                                ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/40'
                                : 'bg-gray-100 text-gray-300 dark:bg-gray-700 dark:text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                            aria-label={`${row[col.key] ? 'Revoke' : 'Grant'} ${col.label} for ${row.module}`}
                          >
                            {row[col.key] ? <Check className="w-4 h-4" /> : <X className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      ))}
                      <td className="px-2 py-2.5 text-center">
                        <button
                          onClick={() => selectAllRow(row.module, !allInRow)}
                          className="text-[10px] text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 whitespace-nowrap"
                        >
                          {allInRow ? 'Clear' : 'All'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-green-100 dark:bg-green-900/30">
                <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
              </span>
              Granted
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-100 dark:bg-gray-700">
                <X className="w-3 h-3 text-gray-300 dark:text-gray-600 dark:text-gray-400" />
              </span>
              Denied
            </span>
          </div>
        </div>
      )}

      {/* ══════════════════════ TAB 3: USER ASSIGNMENTS ══════════════════════ */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search + bulk bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Bulk assign */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {selectedUserIds.size > 0 ? `${selectedUserIds.size} selected` : 'Bulk assign:'}
              </span>
              <div className="relative">
                <select
                  value={bulkRole}
                  onChange={e => setBulkRole(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-xs rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <option value="">Select role...</option>
                  {roles.filter(r => r.active).map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
              <button
                onClick={bulkAssignRole}
                disabled={!bulkRole || selectedUserIds.size === 0}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <UserCog className="w-3.5 h-3.5" />
                Assign
              </button>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500 dark:text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No users found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/80">
                    <th className="px-4 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0}
                        onChange={() => {
                          if (selectedUserIds.size === filteredUsers.length) {
                            setSelectedUserIds(new Set());
                          } else {
                            setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">User</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Roles</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 hidden md:table-cell">Last Login</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 hidden sm:table-cell">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Add Role</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, idx) => (
                    <tr
                      key={u.id}
                      className={`border-t border-gray-100 dark:border-gray-700/50 ${
                        idx % 2 === 0 ? 'bg-white dark:bg-slate-800 dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-800/40'
                      } hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(u.id)}
                          onChange={() => toggleUserSelection(u.id)}
                          className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      {/* Name + email */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Roles badges */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map(r => (
                            <span key={r} className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border ${roleBadgeClasses(r)}`}>
                              {roleLabel(r)}
                              <button
                                onClick={() => removeUserRole(u.id, r)}
                                className="ml-0.5 hover:opacity-70"
                                title={`Remove ${roleLabel(r)}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                          {u.roles.length === 0 && (
                            <span className="text-xs text-gray-400 italic">No roles</span>
                          )}
                        </div>
                      </td>

                      {/* Last login */}
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell whitespace-nowrap">
                        {formatLastLogin(u.lastLogin)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusStyles[u.status]}`}>
                          {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                        </span>
                      </td>

                      {/* Quick add role */}
                      <td className="px-4 py-3">
                        <div className="relative">
                          <select
                            defaultValue=""
                            onChange={e => { changeUserRole(u.id, e.target.value); e.target.value = ''; }}
                            className="appearance-none pl-2 pr-7 py-1.5 text-xs rounded-md border border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer w-full max-w-[140px]"
                          >
                            <option value="">Add role...</option>
                            {roles.filter(r => r.active && !u.roles.includes(r.id)).map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary */}
          <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </div>
      )}
    </div>
  );
}
