import { describe, it, expect } from 'vitest';
import {
  assistantPromptExperimentRolloutBucket,
  userIncludedInAssistantPromptRollout,
} from '../services/ai/assistantPromptExperimentRollout';

describe('assistantPromptExperimentRollout', () => {
  it('bucket is deterministic for user+org', () => {
    expect(assistantPromptExperimentRolloutBucket(1, 10)).toBe(assistantPromptExperimentRolloutBucket(1, 10));
    expect(assistantPromptExperimentRolloutBucket(1, 10)).not.toBe(assistantPromptExperimentRolloutBucket(2, 10));
  });

  it('bucket is in 0..99', () => {
    for (const [u, o] of [
      [1, 1],
      [999, 42],
      [3, 7],
    ] as const) {
      const b = assistantPromptExperimentRolloutBucket(u, o);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(99);
    }
  });

  it('rollout percent boundaries', () => {
    expect(userIncludedInAssistantPromptRollout(1, 1, 100)).toBe(true);
    expect(userIncludedInAssistantPromptRollout(1, 1, 0)).toBe(false);
    expect(userIncludedInAssistantPromptRollout(1, 1, 101)).toBe(true);
    expect(userIncludedInAssistantPromptRollout(1, 1, -1)).toBe(false);
  });
});
