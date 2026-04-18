import { describe, it, expect } from 'vitest';
import { applyAssistantInputTokenBudget } from '../services/ai/assistantGovernance';

describe('assistantGovernance', () => {
  it('drops oldest messages to meet budget', () => {
    const system = 'S'.repeat(2000);
    const messages = [
      { role: 'user' as const, content: 'old'.repeat(500) },
      { role: 'assistant' as const, content: 'old2'.repeat(500) },
      { role: 'user' as const, content: 'new'.repeat(20) },
    ];
    const r = applyAssistantInputTokenBudget({ system, messages, maxInputTokens: 400, minKeepMessages: 2 });
    expect(r.messages.length).toBe(2);
    expect(r.droppedMessageCount).toBe(1);
  });

  it('clamps system prompt when still over budget', () => {
    const system = 'S'.repeat(50_000);
    const messages = [{ role: 'user' as const, content: 'hi' }];
    const r = applyAssistantInputTokenBudget({ system, messages, maxInputTokens: 200, minKeepMessages: 1 });
    expect(r.truncatedSystem).toBe(true);
    expect(r.system.length).toBeLessThan(system.length);
  });
});

