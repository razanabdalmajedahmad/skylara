import { io, Socket } from 'socket.io-client';
import * as SecureStore from '@/lib/secure-store';

const SOCKET_URL = process.env.EXPO_PUBLIC_WS_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
  }
  return socket;
}

export async function connectSocket() {
  const s = getSocket();
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    s.auth = { token };
    s.connect();
  }
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function subscribeToChannel(channel: string) {
  const s = getSocket();
  s.emit('subscribe', { channel });
}

export function unsubscribeFromChannel(channel: string) {
  const s = getSocket();
  s.emit('unsubscribe', { channel });
}
