'use client';

import { useEffect, useCallback, useRef } from 'react';
import { subscribeToEvent, getSocket } from '@/lib/socket';

export function useSocketEvent<T = any>(
  event: string,
  callback: (payload: { data: T; timestamp: string }) => void,
  deps: any[] = [],
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const cleanup = subscribeToEvent<T>(event, (payload) => {
      callbackRef.current(payload);
    });
    return cleanup;
  }, [event]);
}

export function useSocketConnected(): boolean {
  const socket = getSocket();
  return socket?.connected ?? false;
}

export function useEmit() {
  return useCallback((event: string, data?: any) => {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit(event, data);
    }
  }, []);
}
