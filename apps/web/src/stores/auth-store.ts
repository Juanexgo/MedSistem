import { create } from 'zustand';
import { User } from '@mediflow/shared';
import { api } from '@/lib/api';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  setUser: (user: User) => void;
}

function extractLoginResponse(data: any): { accessToken: string; user: User } | null {
  if (!data || typeof data !== 'object') return null;
  const accessToken = data.accessToken || data.access_token;
  const user = data.user || null;
  if (!accessToken || !user) return null;
  return { accessToken, user };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    const json = await api.post<any>('/auth/login', { email, password });
    const parsed = extractLoginResponse(json);
    if (!parsed) {
      throw new Error('Invalid response from server. Please contact support.');
    }
    api.setAccessToken(parsed.accessToken);
    set({ user: parsed.user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout').catch(() => {});
    } catch {}
    api.clearTokens();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  loadUser: async () => {
    try {
      api.loadTokens();
      if (!api.hasAccessToken()) {
        set({ isLoading: false });
        return;
      }
      const user = await api.get<User>('/auth/me');
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      api.clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user: User) => set({ user }),
}));
