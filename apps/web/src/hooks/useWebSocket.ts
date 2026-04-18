'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback, createElement, ReactNode } from 'react';
import { getAuthToken } from '@/lib/api';

interface WebSocketMessage {
  type: string;
  data: any;
}

interface WebSocketContextType {
  connected: boolean;
  subscribe: (channel: string, callback: (data: any) => void) => () => void;
  send: (type: string, data: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const subscribersRef = useRef<Map<string, Set<Function>>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    const token = getAuthToken();
    if (!token) return;

    // Decode JWT payload to get dropzoneId for WS room
    let dropzoneId = 'default';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.dropzoneId) dropzoneId = payload.dropzoneId;
    } catch { /* use default */ }

    try {
      const wsUrl = (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001')
        .replace(/^http/, 'ws');
      const ws = new WebSocket(`${wsUrl}/ws/${dropzoneId}?token=${token}`);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          const callbacks = subscribersRef.current.get(message.type);
          if (callbacks) {
            callbacks.forEach((cb) => cb(message.data));
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = () => {
        // Suppress noisy WS errors — reconnection handles recovery
        setConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const subscribe = useCallback((channel: string, callback: (data: any) => void) => {
    if (!subscribersRef.current.has(channel)) {
      subscribersRef.current.set(channel, new Set());
    }
    subscribersRef.current.get(channel)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = subscribersRef.current.get(channel);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          subscribersRef.current.delete(channel);
        }
      }
    };
  }, []);

  const send = useCallback((type: string, data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }));
    } else {
      console.warn('WebSocket not connected');
    }
  }, []);

  const value: WebSocketContextType = {
    connected,
    subscribe,
    send,
  };

  return createElement(WebSocketContext.Provider, { value }, children);
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}
