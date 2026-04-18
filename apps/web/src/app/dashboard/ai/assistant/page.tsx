'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Send,
  Plus,
  MessageSquare,
  ExternalLink,
  Loader2,
  AlertCircle,
  Search,
  ArrowLeft,
  Trash2,
  Bot,
  User as UserIcon,
  BookOpen,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api';
import { logger } from '@/lib/logger';

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceLink[];
  timestamp: string;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  messageCount: number;
}

interface SourceLink {
  title: string;
  url: string;
  excerpt?: string;
}

interface SuggestedQuestion {
  id: string;
  text: string;
  category: string;
  roles: string[];
}

const FALLBACK_CONVERSATIONS: Conversation[] = [];

const FALLBACK_MESSAGES: ConversationMessage[] = [];

const FALLBACK_SUGGESTIONS: SuggestedQuestion[] = [];

export default function AIAssistantPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedQuestion[]>([]);
  const [input, setInput] = useState('');
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [showKnowledgePanel, setShowKnowledgePanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversations
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [convsRes, suggestionsRes] = await Promise.allSettled([
          apiGet<{ conversations: Conversation[] }>('/assistant/conversations'),
          apiGet<{ data: SuggestedQuestion[] }>('/assistant/suggestions'),
        ]);

        if (convsRes.status === 'fulfilled' && convsRes.value?.conversations) {
          setConversations(convsRes.value.conversations);
          if (convsRes.value.conversations.length > 0) {
            setCurrentConversation(convsRes.value.conversations[0]);
          }
        } else {
          setConversations([]);
        }

        if (suggestionsRes.status === 'fulfilled' && suggestionsRes.value?.data) {
          setSuggestions(suggestionsRes.value.data);
        } else {
          setSuggestions([]);
        }
      } catch {
        setConversations(FALLBACK_CONVERSATIONS);
        setSuggestions(FALLBACK_SUGGESTIONS);
      } finally {
        setLoading(false);
      }
    };

    if (user) loadData();
  }, [user]);

  // Load messages when conversation changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentConversation) return;

      try {
        const response = await apiGet<{
          messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string; sources?: SourceLink[] }>;
        }>(`/assistant/conversations/${currentConversation.id}`);
        setMessages(
          response.messages.map((m, idx) => ({
            id: `msg_${idx}`,
            role: m.role,
            content: m.content,
            sources: m.sources,
            timestamp: m.timestamp,
          }))
        );
      } catch (err) {
        logger.error('Failed to load messages', { page: 'ai-assistant' });
        setMessages([]);
      }
    };

    loadMessages();
  }, [currentConversation]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewConversation = useCallback(async () => {
    try {
      const response = await apiPost<Conversation>('/assistant/conversations', {
        title: `Chat ${new Date().toLocaleDateString()}`,
      });
      setCurrentConversation(response);
      setConversations((prev) => [response, ...prev]);
      setMessages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start a new conversation.');
    }
  }, []);

  const handleSendMessage = useCallback(async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || sending) return;

    if (!currentConversation) {
      await handleNewConversation();
    }

    setSending(true);
    setInput('');
    setError(null);

    const userMessage: ConversationMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await apiPost<{
        response: string;
        sources: SourceLink[];
        conversationId?: string;
      }>('/assistant/message', {
        conversationId: currentConversation?.id,
        message: messageText,
        context: {
          currentRoute: '/dashboard/ai/assistant',
          currentPage: 'AI Assistant',
        },
      });

      const assistantMessage: ConversationMessage = {
        id: `msg_${Date.now()}_resp`,
        role: 'assistant',
        content: response.response,
        sources: response.sources,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'The assistant could not process your message. Please try again.';
      setError(message);
    } finally {
      setSending(false);
    }
  }, [input, sending, currentConversation, handleNewConversation]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredSuggestions = suggestions.filter((s) => {
    if (!user?.roles) return true;
    const userRoles = user.roles.map((r) => r.toLowerCase());
    return s.roles.some((r) => userRoles.includes(r)) || userRoles.some((r) => r.includes('admin') || r.includes('manager'));
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white dark:bg-slate-800 dark:bg-gray-900 -mx-6 -my-6">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-0'} flex-shrink-0 transition-all duration-200 overflow-hidden`}>
        <div className="w-72 h-full flex flex-col bg-gray-50 dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 dark:border-gray-700">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
            <Link
              href="/dashboard/ai"
              className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white dark:hover:text-white mb-3 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to AI Hub
            </Link>
            <button
              onClick={handleNewConversation}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Conversation
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setCurrentConversation(conv)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  currentConversation?.id === conv.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-50" />
                  <p className="font-medium text-sm truncate">{conv.title}</p>
                </div>
                <div className="flex items-center gap-2 mt-1 ml-6">
                  <span className="text-xs opacity-60">{conv.messageCount} msgs</span>
                  <span className="text-xs opacity-40">
                    {new Date(conv.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 px-6 py-4 flex items-center justify-between bg-white dark:bg-slate-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors lg:hidden"
            >
              <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {currentConversation?.title || 'SkyLara Assistant'}
                </h2>
                {currentConversation && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Started {new Date(currentConversation.createdAt).toLocaleDateString()} - {currentConversation.messageCount} messages
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKnowledgePanel(!showKnowledgePanel)}
              className={`p-2 rounded-lg transition-colors ${
                showKnowledgePanel
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
              title="Knowledge Search"
            >
              <BookOpen className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Empty State with Suggestions */}
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-4">
                    <Sparkles className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    How can I help you today?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-8 text-center max-w-md">
                    Ask about operations, manifests, athlete management, safety protocols, or anything SkyLara
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                    {filteredSuggestions.slice(0, 6).map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => handleSendMessage(suggestion.text)}
                        className="text-left px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-slate-700 dark:border-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {suggestion.text}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {suggestion.category}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-2xl ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 dark:text-gray-300'
                    }`}>
                      {msg.role === 'user' ? (
                        <UserIcon className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div
                        className={`${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-2xl rounded-tr-md'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl rounded-tl-md'
                        } px-5 py-3`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                        {/* Sources */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3 space-y-2 border-t border-white/20 dark:border-gray-700 pt-3">
                            <p className={`text-xs font-medium ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                              Sources:
                            </p>
                            {msg.sources.map((source, idx) => (
                              <a
                                key={idx}
                                href={source.url}
                                className={`flex items-start gap-2 p-2 rounded-lg text-xs transition-colors ${
                                  msg.role === 'user'
                                    ? 'bg-blue-500 hover:bg-blue-400'
                                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                              >
                                <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-medium">{source.title}</span>
                                  {source.excerpt && (
                                    <p className="opacity-75 mt-0.5">{source.excerpt}</p>
                                  )}
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <p className={`text-xs mt-1 px-2 ${
                        msg.role === 'user' ? 'text-right' : 'text-left'
                      } text-gray-400 dark:text-gray-500`}>
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {sending && (
                <div className="flex justify-start">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-gray-600 dark:text-gray-400 dark:text-gray-300" />
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-md px-5 py-4">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Error */}
            {error && (
              <div className="mx-6 mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Input Area */}
            <div className="border-t border-gray-200 dark:border-slate-700 dark:border-gray-700 px-6 py-4 bg-white dark:bg-slate-800 dark:bg-gray-900">
              <div className="flex gap-3">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything about SkyLara..."
                  rows={1}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-xl bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-32"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={sending || !input.trim()}
                  className="flex-shrink-0 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>

          {/* Knowledge Search Panel */}
          {showKnowledgePanel && (
            <div className="w-80 border-l border-gray-200 dark:border-slate-700 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Knowledge Search</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search knowledge base..."
                    value={knowledgeSearch}
                    onChange={(e) => setKnowledgeSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {['How to create a manifest', 'Check-in procedures', 'Waiver requirements', 'Safety briefing checklist', 'Pricing configuration'].map((article, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(`Tell me about: ${article}`);
                      inputRef.current?.focus();
                    }}
                    className="w-full text-left p-3 bg-white dark:bg-slate-800 dark:bg-gray-700 border border-gray-200 dark:border-slate-700 dark:border-gray-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{article}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Knowledge Base</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
