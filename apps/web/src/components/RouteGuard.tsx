'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

interface RouteGuardProps {
  /** Roles allowed to access this route. Empty array = any authenticated user. */
  allowedRoles?: string[];
  children: ReactNode;
  /** Optional custom fallback component */
  fallback?: ReactNode;
}

/**
 * Role-based route guard component.
 * Wrap any page content with this to restrict access by role.
 *
 * Usage:
 *   <RouteGuard allowedRoles={['PLATFORM_ADMIN', 'DZ_MANAGER']}>
 *     <AdminDashboard />
 *   </RouteGuard>
 */
export function RouteGuard({ allowedRoles = [], children, fallback }: RouteGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null; // Layout handles redirect
  }

  // If no roles specified, allow any authenticated user
  if (allowedRoles.length === 0) {
    return <>{children}</>;
  }

  const userRoles = user.roles || [];
  const hasAccess = allowedRoles.some((role) => userRoles.includes(role));

  if (!hasAccess) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <ShieldAlert size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Access Restricted
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
          You don&apos;t have permission to access this page. Contact your dropzone manager if you believe this is an error.
        </p>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-[#1B4F72] text-white rounded-lg text-sm font-medium hover:bg-[#164063] transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

/** Role constants for easy reference */
export const ROLES = {
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  DZ_OWNER: 'DZ_OWNER',
  DZ_MANAGER: 'DZ_MANAGER',
  DZ_OPERATOR: 'DZ_OPERATOR',
  MANIFEST_STAFF: 'MANIFEST_STAFF',
  SAFETY_OFFICER: 'SAFETY_OFFICER',
  PILOT: 'PILOT',
  TANDEM_INSTRUCTOR: 'TANDEM_INSTRUCTOR',
  AFF_INSTRUCTOR: 'AFF_INSTRUCTOR',
  COACH: 'COACH',
  JUMPER: 'JUMPER',
} as const;

/** Common role groups */
export const ROLE_GROUPS = {
  /** Can manage DZ operations */
  OPERATIONS: [ROLES.PLATFORM_ADMIN, ROLES.DZ_MANAGER, ROLES.DZ_OPERATOR, ROLES.MANIFEST_STAFF],
  /** Can manage staff */
  STAFF_MGMT: [ROLES.PLATFORM_ADMIN, ROLES.DZ_MANAGER],
  /** Can manage manifest */
  MANIFEST: [ROLES.PLATFORM_ADMIN, ROLES.DZ_MANAGER, ROLES.DZ_OPERATOR, ROLES.MANIFEST_STAFF],
  /** All instructors */
  INSTRUCTORS: [ROLES.TANDEM_INSTRUCTOR, ROLES.AFF_INSTRUCTOR, ROLES.COACH],
  /** Safety-related */
  SAFETY: [ROLES.PLATFORM_ADMIN, ROLES.DZ_MANAGER, ROLES.SAFETY_OFFICER],
  /** All roles (any authenticated user) */
  ALL: [] as string[],
};
