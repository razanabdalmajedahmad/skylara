/**
 * Normalize GET /jumpers/me (mobile-shaped) and login payloads into one web session user.
 * Keeps web and mobile aligned on the same API surface for session hydration.
 */
export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  dropzoneId?: number | null;
  organizationId?: number | null;
  wallet?: unknown;
  emergencyProfile?: unknown;
}

export function mapSessionUser(raw: Record<string, unknown>): SessionUser {
  const rolesRaw = (raw.roles as unknown[]) ?? [];
  const roles = rolesRaw.map((r) =>
    typeof r === 'string' ? r : String((r as { role: string }).role ?? '')
  );

  const dzFromRole = rolesRaw.find(
    (r): r is { role: string; dropzoneId?: number | null; organizationId?: number | null } =>
      typeof r === 'object' && r !== null && 'role' in r && typeof (r as { role?: unknown }).role === 'string'
  );

  const wallets = raw.wallets as unknown[] | undefined;

  return {
    id: String(raw.id ?? ''),
    email: String(raw.email ?? ''),
    firstName: String(raw.firstName ?? ''),
    lastName: String(raw.lastName ?? ''),
    roles,
    dropzoneId:
      dzFromRole?.dropzoneId ?? (raw.dropzoneId as number | null | undefined) ?? null,
    organizationId:
      dzFromRole?.organizationId ?? (raw.organizationId as number | null | undefined) ?? null,
    wallet: wallets?.[0] ?? raw.wallet,
    emergencyProfile: raw.emergencyProfile,
  };
}
