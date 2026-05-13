import { create } from 'zustand';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error';

interface SocketState {
  status: ConnectionStatus;
  lastConnectedAt: Date | null;
  setStatus: (status: ConnectionStatus) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  status: 'disconnected',
  lastConnectedAt: null,
  setStatus: (status) =>
    set({
      status,
      lastConnectedAt: status === 'connected' ? new Date() : undefined,
    }),
}));
