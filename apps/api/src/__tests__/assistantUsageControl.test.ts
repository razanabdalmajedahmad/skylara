import { describe, it, expect } from 'vitest';
import { decideAssistantUsage, getAssistantRolloutDecision } from '../services/ai/assistantUsageControl';

describe('assistantUsageControl', () => {
  it('blocks when hard limit exceeded', () => {
    const d = decideAssistantUsage({ hardLimitPerDay: 10, softLimitPerDay: 5, softLimitMode: 'log_only' }, 10);
    expect(d.allow).toBe(false);
    if (!d.allow) expect(d.reason).toBe('hard_limit');
  });

  it('logs only when soft limit exceeded', () => {
    const d = decideAssistantUsage({ hardLimitPerDay: 100, softLimitPerDay: 5, softLimitMode: 'log_only' }, 5);
    expect(d.allow).toBe(true);
    if (d.allow) expect(d.exceededSoftLimit).toBe(true);
  });

  it('rollout disables streaming when jsonOnly mode', () => {
    const r = getAssistantRolloutDecision({
      // minimal Env shape for this unit
      ASSISTANT_STREAMING_ENABLED: true,
      ASSISTANT_JSON_ONLY_MODE: true,
    } as any);
    expect(r.allowStreaming).toBe(false);
    expect(r.jsonOnlyMode).toBe(true);
  });
});

