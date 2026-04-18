/* eslint-disable react/no-unescaped-entities */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Square, Sparkles, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { postAssistantMessageStream, sourcesToActionLinks } from '@/lib/assistantMessageClient';
import { apiPost } from '@/lib/api';
import { canUseOpsAssistant } from './opsAssistantRbac';

type Turn = { id: string; role: 'user' | 'assistant'; text: string; ts: number };

export function OpsAssistantModal({
  open,
  onClose,
  defaultContext,
}: {
  open: boolean;
  onClose: () => void;
  defaultContext: { currentRoute: string; currentPage: string };
}) {
  const { user } = useAuth();
  const allowed = canUseOpsAssistant(user?.roles);

  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const convIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(
    () => [
      "Summarize today's ops status: queue, open loads, airborne loads.",
      'Which loads are underfilled and why?',
      'Any safety blockers for the next 2 loads?',
      'What should manifest staff do next?',
    ],
    []
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreamBuffer('');
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) {
      stop();
      setError(null);
      setInput('');
      return;
    }
  }, [open, stop]);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [open, turns, streamBuffer, loading]);

  const send = useCallback(
    async (text?: string) => {
      if (!allowed) return;
      const q = (text ?? input).trim();
      if (!q || loading) return;

      setInput('');
      setError(null);
      setStreamBuffer('');

      const userTurn: Turn = { id: `u-${Date.now()}`, role: 'user', text: q, ts: Date.now() };
      setTurns((prev) => [...prev, userTurn]);

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);

      const body = {
        message: q,
        ...(convIdRef.current ? { conversationId: convIdRef.current } : {}),
        context: defaultContext,
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
          convIdRef.current = sse.conversationId;
          const links = sourcesToActionLinks(sse.sources);
          const assistantTurn: Turn = {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: sse.response,
            ts: Date.now(),
          };
          setTurns((prev) => [...prev, assistantTurn]);
          // We don’t render sources here as buttons to avoid route spam; the assistant already includes links in text.
          void links;
          setStreamBuffer('');
          setLoading(false);
          return;
        }

        // JSON fallback
        const json = await apiPost<{
          response: string;
          sources?: { type: string; title: string; route?: string }[];
          conversationId: string;
        }>('/assistant/message', body, { signal: ac.signal });
        convIdRef.current = json.conversationId;
        setTurns((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant', text: json.response, ts: Date.now() },
        ]);
        setStreamBuffer('');
        setLoading(false);
      } catch {
        setLoading(false);
        setStreamBuffer('');
        setError('Assistant unavailable. Try again.');
      } finally {
        if (abortRef.current === ac) abortRef.current = null;
      }
    },
    [allowed, defaultContext, input, loading]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[540px] bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-blue-700 dark:text-blue-300" />
            </div>
            <div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">Ops Assistant</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Manifest + safety context, streaming with JSON fallback
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {loading && (
              <button
                type="button"
                onClick={stop}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800"
                title="Stop"
              >
                <Square className="w-3.5 h-3.5 inline mr-1 fill-current" />
                Stop
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {!allowed && (
          <div className="p-4 text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
            You don't have permission to use the Ops Assistant on this surface.
          </div>
        )}

        {error && (
          <div className="p-3 m-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-slate-950">
          {turns.length === 0 ? (
            <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Try one:</div>
              <div className="grid grid-cols-1 gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={!allowed || loading}
                    onClick={() => send(s)}
                    className="text-left text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {turns.map((t) => (
                <div key={t.id} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                      t.role === 'user'
                        ? 'bg-primary-500 text-white'
                        : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {t.text}
                  </div>
                </div>
              ))}

              {loading && streamBuffer.length > 0 && (
                <div className="flex justify-start">
                  <div className="max-w-[92%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-gray-900 dark:text-gray-100">
                    {streamBuffer}
                    <span className="inline-block w-0.5 h-4 bg-blue-600 animate-pulse ml-0.5 align-middle" aria-hidden />
                  </div>
                </div>
              )}

              {loading && streamBuffer.length === 0 && (
                <div className="flex justify-start">
                  <div className="rounded-xl px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-300 text-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Thinking…
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={scrollRef} />
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              disabled={!allowed || loading}
              placeholder="Ask about loads, readiness, blockers…"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 text-sm"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={!allowed || loading || !input.trim()}
              className="px-3 py-2 rounded-lg bg-primary-500 text-white disabled:opacity-50 flex items-center gap-2 text-sm font-semibold"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

