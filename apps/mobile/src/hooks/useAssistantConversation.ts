import { useCallback, useEffect, useRef, useState } from 'react';
import { postAssistantMessageJson, postAssistantMessageStream } from '@/lib/assistantMessageClient';

export type AssistantTurn = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
};

export type AssistantMessageContext = { currentRoute: string; currentPage: string };

/**
 * Shared assistant conversation state + transport for mobile surfaces.
 * Streaming first (/assistant/message/stream), JSON fallback (/assistant/message).
 * When `active` is false (e.g. modal closed), in-flight work is aborted and streaming UI clears.
 */
export function useAssistantConversation(options: {
  context: AssistantMessageContext;
  /** e.g. modal `visible` — false aborts and clears loading/stream buffer */
  active: boolean;
}) {
  const { context, active } = options;

  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<AssistantTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [error, setError] = useState<string | null>(null);

  const conversationIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setStreamBuffer('');
  }, []);

  useEffect(() => {
    if (!active) {
      stop();
    }
  }, [active, stop]);

  const send = useCallback(
    async (text?: string) => {
      const q = (text ?? input).trim();
      if (!q || loading) return;

      setInput('');
      setError(null);
      setStreamBuffer('');

      const userTurn: AssistantTurn = {
        id: `u-${Date.now()}`,
        role: 'user',
        text: q,
        timestamp: Date.now(),
      };
      setTurns((prev) => [...prev, userTurn]);

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);

      const body = {
        message: q,
        ...(conversationIdRef.current ? { conversationId: conversationIdRef.current } : {}),
        context,
      };

      try {
        const sse = await postAssistantMessageStream(body, {
          signal: ac.signal,
          onDelta: (acc) => setStreamBuffer(acc),
        });

        if (ac.signal.aborted || (!sse.ok && sse.reason === 'aborted')) {
          setLoading(false);
          setStreamBuffer('');
          return;
        }

        if (sse.ok) {
          conversationIdRef.current = sse.conversationId;
          setTurns((prev) => [
            ...prev,
            { id: `a-${Date.now()}`, role: 'assistant', text: sse.response, timestamp: Date.now() },
          ]);
          setLoading(false);
          setStreamBuffer('');
          return;
        }

        const json = await postAssistantMessageJson(body);
        conversationIdRef.current = json.conversationId;
        setTurns((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant', text: json.response, timestamp: Date.now() },
        ]);
        setLoading(false);
        setStreamBuffer('');
      } catch {
        setLoading(false);
        setStreamBuffer('');
        setError('Assistant unavailable. Try again.');
      } finally {
        if (abortRef.current === ac) abortRef.current = null;
      }
    },
    [context, input, loading],
  );

  return {
    input,
    setInput,
    turns,
    loading,
    streamBuffer,
    error,
    send,
    stop,
  };
}
