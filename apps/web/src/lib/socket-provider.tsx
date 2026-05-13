'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useAuth } from './auth-provider';
import { connectSocket, disconnectSocket } from './socket';
import { useSocketStore } from '@/stores/socket-store';

const SocketContext = createContext<boolean>(false);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const setStatus = useSocketStore((s) => s.setStatus);
  const status = useSocketStore((s) => s.status);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      disconnectSocket();
      setStatus('disconnected');
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    const socket = connectSocket(token);
    setStatus('connecting');

    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('reconnecting', () => setStatus('reconnecting'));
    socket.on('connect_error', () => setStatus('error'));

    return () => {
      disconnectSocket();
      setStatus('disconnected');
    };
  }, [isAuthenticated, user?.id]);

  return (
    <SocketContext.Provider value={status === 'connected'}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketConnection() {
  return useContext(SocketContext);
}
