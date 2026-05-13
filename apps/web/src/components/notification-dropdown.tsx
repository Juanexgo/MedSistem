'use client';

import { Bell, CheckCheck, X, AlertTriangle, AlertCircle, MessageSquare, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
dayjs.extend(relativeTime);
dayjs.locale('es');

const typeIcons: Record<string, React.ReactNode> = {
  URGENT_UNASSIGNED: <AlertCircle className="w-4 h-4 text-destructive" />,
  CRITICAL_OXYGEN: <AlertTriangle className="w-4 h-4 text-destructive" />,
  DELAYED_SERVICE: <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
  COMMENT_IMPORTANT: <MessageSquare className="w-4 h-4 text-primary" />,
  ASSIGNMENT_CREATED: <Info className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />,
  TRANSFER_UPDATE: <Info className="w-4 h-4 text-primary" />,
  SYSTEM_ALERT: <AlertCircle className="w-4 h-4 text-purple-500 dark:text-purple-400" />,
};

export function NotificationDropdown() {
  const { notifications, unreadCount, isOpen, toggle, setOpen, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        title="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-destructive-foreground bg-destructive rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-popover text-popover-foreground rounded-xl shadow-lg border border-border z-50 max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Notificaciones</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Marcar todo como leído
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Bell className="w-8 h-8 mb-2" />
                  <p className="text-sm">Sin notificaciones</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) markAsRead(n.id);
                    }}
                    className={cn(
                      'w-full text-left p-3 border-b border-border hover:bg-accent transition-colors',
                      !n.isRead && 'bg-primary/5',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex-shrink-0">
                        {typeIcons[n.type] || <Info className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm', !n.isRead ? 'font-medium text-foreground' : 'text-foreground/80')}>
                          {n.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{dayjs(n.createdAt).fromNow()}</p>
                      </div>
                      {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
