import { describe, it, expect } from 'vitest';
import { canUseOpsAssistant } from './opsAssistantRbac';

describe('OpsAssistantModal RBAC', () => {
  it('allows manifest roles', () => {
    expect(canUseOpsAssistant(['MANIFEST_STAFF'])).toBe(true);
    expect(canUseOpsAssistant(['DZ_MANAGER'])).toBe(true);
  });

  it('allows safety roles', () => {
    expect(canUseOpsAssistant(['SAFETY_OFFICER'])).toBe(true);
  });

  it('denies jumper-only', () => {
    expect(canUseOpsAssistant(['JUMPER'])).toBe(false);
  });
});

