'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api';
import {
  Send,
  Plus,
  MessageSquare,
  ExternalLink,
  Loader,
  AlertCircle,
  Clock,
} from 'lucide-react';

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

interface Suggestion {
  id: string;
  title: string;
  description: string;
  route: string;
  applicableRoles: string[];
}

export default function AssistantChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const response = await apiGet<{ conversations: Conversation[] }>(
          '/assistant/conversations'
        );
        setConversations(response.conversations);
        if (response.conversations.length > 0) {
          setCurrentConversation(response.conversations[0]);
        }
        setError(null);
      } catch (err) {
        console.error('Failed to load conversations:', err);
        setConversations([]);
        setCurrentConversation(null);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadConversations();
    }
  }, [user]);

  // Load messages for current conversation
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentConversation) return;

      try {
        const response = await apiGet<{
          id: string;
          title?: string;
          messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>;
          messageCount: number;
          createdAt: string;
          updatedAt: string;
        }>(
          `/assistant/conversations/${currentConversation.id}`
        );
        setMessages(
          response.messages.map((m, idx) => ({
            id: `msg_${idx}`,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          }))
        );
      } catch (err) {
        console.error('Failed to load messages:', err);
        setMessages([]);
      }
    };

    loadMessages();
  }, [currentConversation]);

  // Load suggestions for new conversation
  useEffect(() => {
    const loadSuggestions = async () => {
      if (messages.length > 0) return;

      try {
        const response = await apiGet<Suggestion[]>(
          '/assistant/advanced/suggestions'
        );
        if (Array.isArray(response)) {
          setSuggestions(response);
        } else {
          throw new Error('Invalid response');
        }
      } catch (err) {
        console.error('Failed to load suggestions:', err);
        setSuggestions([]);
      }
    };

    loadSuggestions();
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewConversation = async () => {
    try {
      const response = await apiPost<Conversation>('/assistant/conversations', {
        title: `Conversation ${new Date().toLocaleDateString()}`,
      });
      setCurrentConversation(response);
      setConversations((prev) => [response, ...prev]);
      setMessages([]);
      setSuggestions([]);
      setInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create conversation');
    }
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    if (!currentConversation) {
      // Create a new conversation if none exists
      await handleNewConversation();
      return;
    }

    setSending(true);
    setInput('');

    // Add user message to UI immediately
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
        conversationId: string;
      }>(
        `/assistant/message`,
        {
          conversationId: currentConversation.id,
          message: messageText,
        }
      );

      const assistantMessage: ConversationMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: response.response,
        sources: response.sources,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      // Add error message to chat
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_error_${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your message. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(
        inputRef.current.scrollHeight,
        inputRef.current.offsetHeight + 100
      ) + 'px';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-800 dark:bg-gray-900">
        <Loader className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-slate-800 dark:bg-gray-900 -mx-6 -my-6">
      {/* Sidebar - Hidden on mobile */}
      <div className="hidden lg:flex lg:w-64 flex-col bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-slate-700 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 dark:border-gray-700">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
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
              <p className="font-medium truncate">{conv.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {conv.messageCount} messages
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentConversation?.title || 'Assistant'}
            </h2>
            {currentConversation && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Created {new Date(currentConversation.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <button
            onClick={handleNewConversation}
            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center">
              <MessageSquare className="w-12 h-12 text-gray-400 dark:text-gray-600 dark:text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No messages yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-center max-w-sm">
                Ask me anything about SkyLara, your jumps, or how to use the platform
              </p>

              {/* Suggestions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSendMessage(suggestion.title)}
                    className="text-left px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {suggestion.title}
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
              <div
                className={`max-w-md lg:max-w-2xl ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-3xl rounded-tr-lg'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-3xl rounded-tl-lg'
                } px-6 py-3`}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>

                {/* Source Links */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.sources.map((source, idx) => (
                      <a
                        key={idx}
                        href={source.url}
                        className={`flex items-start gap-2 p-2 rounded transition-colors ${
                          msg.role === 'user'
                            ? 'bg-blue-500 hover:bg-blue-400'
                            : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        <ExternalLink className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{source.title}</p>
                          {source.excerpt && (
                            <p className="text-xs opacity-75 line-clamp-2">{source.excerpt}</p>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                )}

                {/* Timestamp */}
                <p
                  className={`text-xs mt-2 ${
                    msg.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-3xl rounded-tl-lg px-6 py-4">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-slate-700 dark:border-gray-700 px-6 py-4 bg-white dark:bg-slate-800 dark:bg-gray-900">
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustTextareaHeight();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              rows={1}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-xl bg-white dark:bg-slate-800 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-32"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={sending || !input.trim()}
              className="flex-shrink-0 p-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
