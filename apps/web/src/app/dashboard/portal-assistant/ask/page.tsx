'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAssistant } from '@/hooks/useAssistant';
import { apiGet, apiPost } from '@/lib/api';
import { PortalAssistantNav } from '../page';
import {
  Send,
  Trash2,
  Copy,
  Check,
  Clock,
  ExternalLink,
  Loader2,
  Bot,
  User,
  Sparkles,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  featureLink?: { name: string; route: string };
  timestamp: number;
}

/* ------------------------------------------------------------------ */
/*  Role-based suggested prompts                                       */
/* ------------------------------------------------------------------ */

const ROLE_SUGGESTIONS: Record<string, string[]> = {
  PLATFORM_ADMIN: [
    'Show me today\'s operations summary',
    'Which dropzones have the highest incident rate?',
    'List all users with expired documents',
    'Show revenue breakdown for this month',
    'Which automations failed this week?',
  ],
  DZ_MANAGER: [
    'Who is missing a waiver today?',
    'Show AFF students not ready to jump',
    'Which loads are boarding now?',
    'Show unpaid tandem bookings',
    'Daily operations summary',
    'Which documents expire this week?',
  ],
  MANIFEST_STAFF: [
    'Which loads are boarding now?',
    'Show unpaid tandem bookings',
    'Find jumper by name',
    'How many open slots on the next load?',
    'Who has checked in but isn\'t manifested?',
  ],
  SAFETY_OFFICER: [
    'Show all incidents this month',
    'Which athletes have incomplete medical forms?',
    'List gear due for repack',
    'Show missing reserve data cards',
    'Incident trend report for last 30 days',
  ],
  PILOT: [
    'What is my next load?',
    'Show today\'s flight schedule',
    'Current wind conditions and jumpability',
    'Aircraft maintenance status',
  ],
  TI: [
    'Show my tandem bookings today',
    'Which tandems are waiting for assignment?',
    'How many tandem jumps this week?',
    'Next tandem briefing time',
  ],
  AFFI: [
    'Show AFF students not ready to jump',
    'Which students need level sign-off?',
    'AFF progression report this week',
    'Students inactive for more than 14 days',
  ],
  COACH: [
    'Show my assigned students',
    'Which students need coaching today?',
    'Student skill assessment summary',
    'Upcoming coaching sessions',
  ],
  JUMPER: [
    'What are my upcoming jumps?',
    'What is my jump total?',
    'Current weather and jumpability',
    'When is my waiver expiring?',
  ],
  STUDENT: [
    'What is my current AFF level?',
    'What do I need for my next jump?',
    'When is my next ground school?',
    'Show my progression timeline',
  ],
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AskAssistantPage() {
  const { user } = useAuth();
  const {
    sendQuery,
    conversationHistory,
    loading: assistantLoading,
    clearHistory,
    streamBuffer,
    abortAssistantRequest,
  } = useAssistant();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [copied, setCopied] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const userRole = user?.roles?.[0] || 'JUMPER';
  const suggestions = ROLE_SUGGESTIONS[userRole] || ROLE_SUGGESTIONS.JUMPER;

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, assistantLoading, streamBuffer]);

  // Hydrate from query string
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if (q) {
        handleSend(q);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async (text?: string) => {
    const query = (text || input).trim();
    if (!query) return;
    setInput('');
    setError(null);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await sendQuery(query, userRole, '/dashboard/portal-assistant/ask');
      if (res.aborted) return;
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: res.answer,
        featureLink: res.feature ? { name: res.feature.name, route: res.feature.route } : undefined,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError('Failed to get a response. Please try again.');
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    clearHistory();
  };

  const handleExport = () => {
    const text = messages
      .map((m) => `[${new Date(m.timestamp).toLocaleString()}] ${m.role === 'user' ? 'You' : 'Assistant'}: ${m.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      <PortalAssistantNav current="/dashboard/portal-assistant/ask" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ask Assistant</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Ask anything about your drop zone operations</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={messages.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Export'}
          </button>
          <button
            onClick={handleClearChat}
            disabled={messages.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 mb-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-slate-700 dark:border-gray-700 p-4 space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles className="w-12 h-12 text-blue-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">How can I help?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6">
              Ask me about manifests, waivers, loads, students, bookings, incidents, or any operational question.
            </p>

            {/* Role-based suggestions */}
            <div className="w-full max-w-lg">
              <button
                onClick={() => setShowRolePicker(!showRolePicker)}
                className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-3 mx-auto"
              >
                Suggestions for {userRole.replace(/_/g, ' ')} <ChevronDown className="w-3 h-3" />
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s)}
                    className="text-left text-sm px-4 py-3 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 dark:bg-gray-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{m.text}</p>
              {m.featureLink && m.featureLink.route && (
                <a
                  href={m.featureLink.route}
                  className="inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:text-blue-300"
                >
                  <ExternalLink className="w-3 h-3" />
                  Go to {m.featureLink.name}
                </a>
              )}
              <p className={`text-xs mt-1 ${m.role === 'user' ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>
                <Clock className="w-3 h-3 inline mr-1" />
                {formatTime(m.timestamp)}
              </p>
            </div>
            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
            )}
          </div>
        ))}

        {assistantLoading && streamBuffer.length > 0 && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="max-w-[75%] rounded-2xl px-4 py-3 bg-white dark:bg-slate-800 dark:bg-gray-800 border border-blue-200 dark:border-blue-800 text-gray-800 dark:text-gray-200">
              <p className="text-sm whitespace-pre-wrap">{streamBuffer}</p>
              <span className="inline-block w-0.5 h-4 bg-blue-500 animate-pulse ml-0.5 align-middle mt-1" aria-hidden />
            </div>
          </div>
        )}
        {assistantLoading && streamBuffer.length === 0 && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Thinking...
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask a question about your drop zone..."
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          disabled={assistantLoading}
        />
        {assistantLoading && (
          <button
            type="button"
            onClick={() => abortAssistantRequest()}
            className="flex items-center justify-center px-3 h-11 rounded-xl border border-gray-300 dark:border-slate-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
            title="Stop generating"
          >
            Stop
          </button>
        )}
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || assistantLoading}
          className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {assistantLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
