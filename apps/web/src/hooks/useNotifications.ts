'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-provider';
import { useNotificationStore } from '@/stores/notification-store';
import { useSocketEvent } from './useSocket';
import toast from 'react-hot-toast';

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  const {
    notifications,
    unreadCount,
    isOpen,
    isLoading,
    fetch,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
    setOpen,
  } = useNotificationStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetch();
      fetchUnreadCount();
    }
  }, [isAuthenticated]);

  useSocketEvent('notification.created', (payload) => {
    const notif = payload.data;
    addNotification(notif);
    const toastMsg = `${notif.title}: ${notif.message}`;
    switch (notif.type) {
      case 'CRITICAL_OXYGEN':
      case 'URGENT_UNASSIGNED':
        toast.error(toastMsg, { duration: 6000 });
        break;
      case 'COMMENT_IMPORTANT':
        toast(toastMsg, { icon: '💬' });
        break;
      case 'ASSIGNMENT_CREATED':
        toast.success(toastMsg, { duration: 4000 });
        break;
      default:
        toast(toastMsg, { icon: '🔔' });
    }
  });

  return {
    notifications,
    unreadCount,
    isOpen,
    isLoading,
    toggle: () => setOpen(!isOpen),
    setOpen,
    markAsRead,
    markAllAsRead,
  };
}
