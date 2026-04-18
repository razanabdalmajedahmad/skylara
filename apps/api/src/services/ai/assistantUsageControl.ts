/**
 * Phase 9: usage controls + rollout flags (lightweight, extensible).
 * Must remain prompt-safe and secret-safe.
 */

import type { Env } from '../../utils/env';

export type AssistantTransport = 'json' | 'sse';

export type AssistantRolloutDecision = {
  allowStreaming: boolean;
  jsonOnlyMode: boolean;
};

export function getAssistantRolloutDecision(env: Env): AssistantRolloutDecision {
  const streamingEnabled = env.ASSISTANT_STREAMING_ENABLED ?? true;
  const jsonOnly = env.ASSISTANT_JSON_ONLY_MODE ?? false;
  return {
    allowStreaming: streamingEnabled && !jsonOnly,
    jsonOnlyMode: jsonOnly || !streamingEnabled,
  };
}

export type AssistantUsagePolicy = {
  softLimitPerDay?: number;
  hardLimitPerDay?: number;
  softLimitMode: 'log_only' | 'block';
};

export function getAssistantUsagePolicy(env: Env): AssistantUsagePolicy {
  return {
    softLimitPerDay: env.ASSISTANT_USAGE_SOFT_LIMIT_PER_DAY,
    hardLimitPerDay: env.ASSISTANT_USAGE_HARD_LIMIT_PER_DAY,
    softLimitMode: env.ASSISTANT_USAGE_SOFT_LIMIT_MODE ?? 'log_only',
  };
}

type TierPolicyOverride = Partial<{
  softLimitPerDay: number | null;
  hardLimitPerDay: number | null;
  softLimitMode: 'log_only' | 'block' | null;
}>;

function parseTierPolicyJson(json: string | undefined): Record<string, TierPolicyOverride> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, TierPolicyOverride>;
    }
    return {};
  } catch {
    return {};
  }
}

export function getAssistantUsagePolicyForTenant(
  env: Env,
  tenant: { subscriptionTier: string | null }
): AssistantUsagePolicy & { policySource: 'default' | 'tier_override'; subscriptionTier: string | null } {
  const base = getAssistantUsagePolicy(env);
  const tier = tenant.subscriptionTier?.trim() || null;
  const overrides = parseTierPolicyJson(env.ASSISTANT_USAGE_LIMITS_BY_TIER_JSON);
  const o = tier ? overrides[tier] : undefined;

  if (!o) {
    return { ...base, policySource: 'default', subscriptionTier: tier };
  }

  const softLimitPerDay =
    o.softLimitPerDay === null ? undefined : (o.softLimitPerDay ?? base.softLimitPerDay);
  const hardLimitPerDay =
    o.hardLimitPerDay === null ? undefined : (o.hardLimitPerDay ?? base.hardLimitPerDay);
  const softLimitMode = (o.softLimitMode ?? base.softLimitMode) as 'log_only' | 'block';

  return {
    softLimitPerDay,
    hardLimitPerDay,
    softLimitMode,
    policySource: 'tier_override',
    subscriptionTier: tier,
  };
}

export type AssistantUsageDecision =
  | { allow: true; exceededSoftLimit: boolean }
  | { allow: false; reason: 'hard_limit' | 'soft_limit_block' };

export function decideAssistantUsage(policy: AssistantUsagePolicy, usedToday: number): AssistantUsageDecision {
  const hard = policy.hardLimitPerDay;
  const soft = policy.softLimitPerDay;

  if (hard != null && usedToday >= hard) {
    return { allow: false, reason: 'hard_limit' };
  }
  if (soft != null && usedToday >= soft) {
    if (policy.softLimitMode === 'block') {
      return { allow: false, reason: 'soft_limit_block' };
    }
    return { allow: true, exceededSoftLimit: true };
  }
  return { allow: true, exceededSoftLimit: false };
}

export function buildAssistantLimitMessage(): string {
  return 'Assistant usage limit reached for today. Please try again later.';
}

