import { create } from 'zustand';
import { api } from '@/lib/api';
import type { Notification } from '@mediflow/shared';

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  isLoading: boolean;
  fetch: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  setOpen: (open: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,
  isLoading: false,

  fetch: async () => {
    set({ isLoading: true });
    try {
      const result = await api.get<PaginatedResponse<Notification>>('/notifications');
      set({ notifications: result.data || [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const result = await api.get<number>('/notifications/unread-count');
      const count = typeof result === 'number' ? result : (result as any) || 0;
      set({ unreadCount: count });
    } catch {}
  },

  markAsRead: async (id: string) => {
    await api.post(`/notifications/${id}/read`);
    const { notifications, unreadCount } = get();
    set({
      notifications: notifications.map((n) =>
        n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
      ),
      unreadCount: Math.max(0, unreadCount - 1),
    });
  },

  markAllAsRead: async () => {
    await api.post('/notifications/read-all');
    set({
      notifications: get().notifications.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })),
      unreadCount: 0,
    });
  },

  addNotification: (notification: Notification) => {
    set((state) => {
      const filtered = state.notifications.filter((n) => n.id !== notification.id);
      return {
        notifications: [notification, ...filtered].slice(0, 100),
        unreadCount: notification.isRead ? state.unreadCount : state.unreadCount + 1,
      };
    });
  },

  setOpen: (open: boolean) => set({ isOpen: open }),
}));
