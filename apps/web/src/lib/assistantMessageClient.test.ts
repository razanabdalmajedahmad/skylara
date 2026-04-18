import { describe, it, expect } from 'vitest';
import { parseAssistantSseBlock, sourcesToActionLinks } from './assistantMessageClient';

describe('assistantMessageClient', () => {
  it('parseAssistantSseBlock parses delta event', () => {
    const block = 'event: delta\ndata: {"c":"Hello"}\n';
    const p = parseAssistantSseBlock(block);
    expect(p?.event).toBe('delta');
    expect(p?.data.c).toBe('Hello');
  });

  it('parseAssistantSseBlock parses done with sources', () => {
    const block =
      'event: done\ndata: {"conversationId":"abc-123","sources":[{"type":"article","title":"Help","route":"/dashboard/help"}]}\n';
    const p = parseAssistantSseBlock(block);
    expect(p?.event).toBe('done');
    expect(p?.data.conversationId).toBe('abc-123');
    expect(Array.isArray(p?.data.sources)).toBe(true);
  });

  it('sourcesToActionLinks maps to dashboard routes', () => {
    const links = sourcesToActionLinks([{ type: 'article', title: 'Manifest', route: '/dashboard/manifest' }]);
    expect(links[0].label).toBe('Manifest');
    expect(links[0].route).toBe('/dashboard/manifest');
  });

  it('sourcesToActionLinks falls back for non-path routes', () => {
    const links = sourcesToActionLinks([{ type: 'feature', title: 'X', route: 'manifest' }]);
    expect(links[0].route).toBe('/dashboard/help');
  });
});
