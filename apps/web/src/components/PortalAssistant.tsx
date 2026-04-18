'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, X, Send, Lightbulb, Zap, ExternalLink, ChevronRight, AlertTriangle, RotateCcw, Square } from 'lucide-react';
import { useAssistant, ActionLink, ConversationMessage } from '@/hooks/useAssistant';
import { useAuth } from '@/hooks/useAuth';
import { useAssistantModal } from '@/contexts/AssistantContext';

// ---------------------------------------------------------------------------
// Suggested questions by role
// ---------------------------------------------------------------------------

const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  admin: [
    'How do I onboard a new coach?',
    'Show me the approval queue',
    'What can admin improve today?',
    'How do I send a waiver?',
  ],
  dzo: [
    'How do I create a new manifest?',
    'Open the onboarding center',
    'How do I set up pricing?',
    'Show me today\'s weather',
  ],
  jump_master: [
    'How do I manifest jumpers?',
    'Open check-in',
    'How do I handle an incident?',
    'Show me the weather',
  ],
  athlete: [
    'How do I check in?',
    'Take me to my logbook',
    'How do I sign a waiver?',
    'Show me my bookings',
  ],
  coach: [
    'How do I view my coaching sessions?',
    'Open the courses page',
    'How do I onboard as a coach?',
    'Show me athlete profiles',
  ],
  default: [
    'What can I do here?',
    'Show me the onboarding center',
    'How do I check in?',
    'Open help center',
  ],
};

// ---------------------------------------------------------------------------
// PortalAssistant Component
// ---------------------------------------------------------------------------

export function PortalAssistant() {
  const { user } = useAuth();
  const router = useRouter();
  const { isOpen, openAssistant, closeAssistant, initialQuery } = useAssistantModal();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasAutoSentQuery = useRef(false);
  const { sendQuery, conversationHistory, loading, clearHistory, streamBuffer, abortAssistantRequest } = useAssistant();

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const handleSendMessage = useCallback(async (text?: string) => {
    const messageText = text ?? input;
    if (!messageText.trim() || !user) return;
    setInput('');
    try {
      const res = await sendQuery(
        messageText,
        (user.roles || [])[0] || 'JUMPER',
        typeof window !== 'undefined' ? window.location.pathname : '/'
      );
      if (res.aborted) return;
    } catch {}
  }, [input, user, sendQuery]);

  useEffect(() => {
    if (isOpen && initialQuery && !hasAutoSentQuery.current && !loading) {
      hasAutoSentQuery.current = true;
      void handleSendMessage(initialQuery);
    }
  }, [isOpen, initialQuery, loading, handleSendMessage]);

  useEffect(() => {
    if (!isOpen) hasAutoSentQuery.current = false;
  }, [isOpen]);

  useEffect(() => { scrollToBottom(); }, [conversationHistory, loading, streamBuffer]);

  const handleLinkClick = (route: string) => {
    closeAssistant();
    router.push(route);
  };

  const currentRole = (user?.roles || [])[0] || 'JUMPER';
  const roleMapping: Record<string, string> = {
    PLATFORM_ADMIN: 'admin', DZ_MANAGER: 'dzo', DZ_OPERATOR: 'dzo',
    MANIFEST_STAFF: 'jump_master', SAFETY_OFFICER: 'jump_master',
    PILOT: 'jump_master', TANDEM_INSTRUCTOR: 'coach', AFF_INSTRUCTOR: 'coach',
    COACH: 'coach', JUMPER: 'athlete',
  };
  const roleKey = roleMapping[currentRole] || 'default';
  const suggestions = SUGGESTED_QUESTIONS[roleKey] || SUGGESTED_QUESTIONS.default;

  if (!user) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => isOpen ? closeAssistant() : openAssistant()}
        className="fixed bottom-6 right-6 w-12 h-12 bg-[#1B4F72] hover:bg-[#153a52] text-white rounded-full shadow-lg flex items-center justify-center transition-all transform hover:scale-110 z-40 md:bottom-8 md:right-8"
        aria-label="Open assistant"
      >
        <MessageCircle size={24} />
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-30 z-30 md:hidden" onClick={closeAssistant} />

          <div className="fixed bottom-0 right-0 left-0 md:bottom-24 md:left-auto md:right-6 w-full md:w-[420px] h-[85vh] md:h-[560px] max-h-[85vh] md:max-h-[70vh] bg-white dark:bg-slate-900 rounded-t-2xl md:rounded-xl shadow-2xl flex flex-col z-40">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-[#1B4F72] to-[#2E86C1] text-white rounded-t-2xl md:rounded-t-xl shrink-0">
              <div className="flex items-center gap-2">
                <Zap size={20} className="text-yellow-300" />
                <div>
                  <h2 className="font-semibold text-base">SkyLara Assistant</h2>
                  <p className="text-[10px] text-blue-100 opacity-80">AI-powered help & navigation</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {loading && (
                  <button
                    type="button"
                    onClick={() => abortAssistantRequest()}
                    className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                    title="Stop generating"
                  >
                    <Square size={14} className="fill-current" />
                  </button>
                )}
                {conversationHistory.length > 0 && (
                  <button onClick={clearHistory} className="p-1.5 hover:bg-white/20 rounded-full transition-colors" title="New chat">
                    <RotateCcw size={16} />
                  </button>
                )}
                <a href="/dashboard/portal-assistant" onClick={closeAssistant} className="p-1.5 hover:bg-white/20 rounded-full transition-colors" title="Open full assistant">
                  <ExternalLink size={16} />
                </a>
                <button onClick={closeAssistant} className="p-1.5 hover:bg-white/20 rounded-full transition-colors" title="Close">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-slate-950 space-y-3 scroll-smooth">
              {conversationHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-3">
                    <Zap size={28} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 font-semibold text-sm mb-1">How can I help you?</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs max-w-[280px]">
                    Ask me about onboarding, manifest, waivers, payments, events, or say "take me to" any page.
                  </p>
                </div>
              ) : (
                <>
                  {conversationHistory.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} onLinkClick={handleLinkClick} />
                  ))}
                  {loading && streamBuffer.length > 0 && (
                    <div className="flex justify-start">
                      <div className="max-w-[90%] px-4 py-3 rounded-xl rounded-bl-sm bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 text-sm text-gray-900 dark:text-gray-100">
                        <p className="whitespace-pre-wrap leading-relaxed">{streamBuffer}</p>
                        <span className="inline-block w-0.5 h-4 bg-[#2E86C1] animate-pulse ml-0.5 align-middle" aria-hidden />
                      </div>
                    </div>
                  )}
                  {loading && streamBuffer.length === 0 && (
                    <div className="flex justify-start">
                      <div className="bg-gray-200 dark:bg-slate-800 px-4 py-2.5 rounded-xl rounded-bl-sm">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Suggested Questions */}
            {conversationHistory.length === 0 && !loading && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Lightbulb size={12} /> Try asking
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {suggestions.map((q, i) => (
                    <button key={i} onClick={() => handleSendMessage(q)} disabled={loading} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-[#1B4F72] dark:text-blue-300 px-3 py-2 rounded-lg border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-left">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-gray-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900 rounded-b-2xl md:rounded-b-xl shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  placeholder="Ask anything or say 'take me to...'"
                  className="flex-1 px-3 py-2.5 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E86C1] text-sm placeholder-gray-400"
                  disabled={loading}
                  autoComplete="off"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={loading || !input.trim()}
                  className="px-3 py-2.5 bg-[#2E86C1] hover:bg-[#1B4F72] text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Message Bubble - renders structured responses with links, steps, blockers
// ---------------------------------------------------------------------------

function MessageBubble({ message, onLinkClick }: { message: ConversationMessage; onLinkClick: (route: string) => void }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] px-4 py-2.5 rounded-xl rounded-br-sm bg-[#2E86C1] text-white text-sm">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] space-y-2">
        {/* Main answer */}
        <div className="px-4 py-3 rounded-xl rounded-bl-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-gray-100">
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>

        {/* Steps */}
        {message.steps && message.steps.length > 0 && (
          <div className="px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800">
            <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-2">Steps</p>
            <ol className="space-y-1.5">
              {message.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-blue-800 dark:text-blue-200">
                  <span className="w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Clickable Links */}
        {message.links && message.links.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.links.map((link, i) => (
              <button
                key={i}
                onClick={() => onLinkClick(link.route)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-[#1B4F72] text-white rounded-lg hover:bg-[#153a52] transition-colors"
              >
                <ChevronRight size={12} />
                {link.label}
              </button>
            ))}
          </div>
        )}

        {/* Blockers */}
        {message.blockers && message.blockers.length > 0 && (
          <div className="px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <AlertTriangle size={10} /> Blockers to check
            </p>
            <ul className="space-y-1">
              {message.blockers.map((b, i) => (
                <li key={i} className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-1.5">
                  <span className="text-amber-500 mt-0.5">-</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested follow-up */}
        {message.suggestedFollowUp && (
          <div className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 italic">{message.suggestedFollowUp}</p>
          </div>
        )}
      </div>
    </div>
  );
}
