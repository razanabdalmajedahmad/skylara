import { describe, it, expect } from 'vitest';
import { getAssistantUsagePolicyForTenant } from '../services/ai/assistantUsageControl';

describe('assistant usage policy tier overrides', () => {
  it('uses default policy when no tier map', () => {
    const env: any = {
      ASSISTANT_USAGE_SOFT_LIMIT_PER_DAY: 10,
      ASSISTANT_USAGE_HARD_LIMIT_PER_DAY: 20,
      ASSISTANT_USAGE_SOFT_LIMIT_MODE: 'log_only',
    };
    const p = getAssistantUsagePolicyForTenant(env, { subscriptionTier: 'starter' });
    expect(p.softLimitPerDay).toBe(10);
    expect(p.hardLimitPerDay).toBe(20);
    expect(p.softLimitMode).toBe('log_only');
    expect(p.policySource).toBe('default');
  });

  it('overrides per tier when provided', () => {
    const env: any = {
      ASSISTANT_USAGE_SOFT_LIMIT_PER_DAY: 10,
      ASSISTANT_USAGE_HARD_LIMIT_PER_DAY: 20,
      ASSISTANT_USAGE_SOFT_LIMIT_MODE: 'log_only',
      ASSISTANT_USAGE_LIMITS_BY_TIER_JSON: JSON.stringify({
        starter: { hardLimitPerDay: 50 },
        pro: { hardLimitPerDay: 200, softLimitPerDay: 150, softLimitMode: 'block' },
        enterprise: { hardLimitPerDay: null },
      }),
    };

    const starter = getAssistantUsagePolicyForTenant(env, { subscriptionTier: 'starter' });
    expect(starter.hardLimitPerDay).toBe(50);
    expect(starter.policySource).toBe('tier_override');

    const pro = getAssistantUsagePolicyForTenant(env, { subscriptionTier: 'pro' });
    expect(pro.hardLimitPerDay).toBe(200);
    expect(pro.softLimitPerDay).toBe(150);
    expect(pro.softLimitMode).toBe('block');

    const ent = getAssistantUsagePolicyForTenant(env, { subscriptionTier: 'enterprise' });
    expect(ent.hardLimitPerDay).toBeUndefined();
  });
});

