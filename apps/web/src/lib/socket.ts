import { io, Socket } from 'socket.io-client';
import { WS_URL } from './api';

let socket: Socket | null = null;

interface SocketPayload<T = any> {
  data: T;
  timestamp: string;
}

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(token: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  socket.on('socket.error', (payload: { message: string }) => {
    console.warn('[Socket] Server error:', payload.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function subscribeToEvent<T = any>(
  event: string,
  callback: (payload: SocketPayload<T>) => void,
): () => void {
  if (!socket) {
    console.warn('[Socket] Not connected, cannot subscribe to', event);
    return () => {};
  }
  socket.on(event, callback);
  return () => {
    socket?.off(event, callback);
  };
}

export function emitEvent(event: string, data?: any) {
  if (!socket) {
    console.warn('[Socket] Not connected, cannot emit', event);
    return;
  }
  socket.emit(event, data);
}
