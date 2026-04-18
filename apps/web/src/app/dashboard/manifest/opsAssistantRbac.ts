export function canUseOpsAssistant(roles: string[] | undefined | null): boolean {
  const r = roles ?? [];
  // Manifest ops + safety roles; stricter than general assistant.
  const allowed = [
    'PLATFORM_ADMIN',
    'DZ_MANAGER',
    'DZ_OPERATOR',
    'MANIFEST_STAFF',
    'SAFETY_OFFICER',
  ];
  return allowed.some((role) => r.includes(role));
}

