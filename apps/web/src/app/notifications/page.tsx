'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { useNotificationStore } from '@/stores/notification-store';
import { CardSkeleton } from '@/components/ui/loading-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
dayjs.extend(relativeTime);
dayjs.locale('es');
import {
  Bell,
  CheckCheck,
  Filter,
  AlertTriangle,
  AlertCircle,
  MessageSquare,
  Info,
  ShieldAlert,
  Clock,
  ArrowRightLeft,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const typeIcons: Record<string, React.ReactNode> = {
  URGENT_UNASSIGNED: <AlertCircle className="w-4 h-4 text-destructive" />,
  CRITICAL_OXYGEN: <AlertTriangle className="w-4 h-4 text-destructive" />,
  DELAYED_SERVICE: <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
  COMMENT_IMPORTANT: <MessageSquare className="w-4 h-4 text-primary" />,
  COMMENT_CREATED: <MessageSquare className="w-4 h-4 text-primary" />,
  ASSIGNMENT_CREATED: <Info className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />,
  TRANSFER_UPDATE: <Info className="w-4 h-4 text-primary" />,
  SYSTEM_ALERT: <AlertCircle className="w-4 h-4 text-purple-500 dark:text-purple-400" />,
  SECURITY_INCIDENT: <ShieldAlert className="w-4 h-4 text-destructive" />,
  PENDING_HANDOFF: <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
  PATIENT_WAITING: <ArrowRightLeft className="w-4 h-4 text-primary" />,
  OPERATIONS_LOG: <Info className="w-4 h-4 text-muted-foreground" />,
};

const typeLinks: Record<string, string> = {
  TRANSFER_UPDATE: '/transfers',
  ASSIGNMENT_CREATED: '/transfers',
  COMMENT_IMPORTANT: '/communication',
  COMMENT_CREATED: '/communication',
  CRITICAL_OXYGEN: '/oxygen',
  PENDING_HANDOFF: '/shifts/handoff',
  SECURITY_INCIDENT: '/security-incidents',
  URGENT_UNASSIGNED: '/transfers',
};

interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const { markAsRead, markAllAsRead } = useNotificationStore();
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', ...filters });
      const res = await api.get<any>('/notifications?' + params.toString());
      setNotifications(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar las notificaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, [page, filters]);

  const handleMarkRead = async (id: string) => {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)),
    );
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
  };

  const handleNavigate = (notification: NotificationItem) => {
    if (!notification.isRead) handleMarkRead(notification.id);
    const link = typeLinks[notification.type];
    if (link) router.push(link);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notificaciones</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {notifications.filter((n) => !n.isRead).length} sin leer
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors',
                showFilters ? 'bg-primary/10 border-primary/20 text-primary' : 'border-border text-muted-foreground hover:bg-accent',
              )}
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>
            {notifications.some((n) => !n.isRead) && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/15 transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Marcar todo como leído
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select
                value={filters.isRead || ''}
                onChange={(e) => setFilters((f) => ({ ...f, isRead: e.target.value }))}
                className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              >
                <option value="">Todos los estados</option>
                <option value="false">Sin leer</option>
                <option value="true">Leídas</option>
              </select>
              <select
                value={filters.type || ''}
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
                className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              >
                <option value="">Todos los tipos</option>
                <option value="URGENT_UNASSIGNED">Urgente sin asignar</option>
                <option value="CRITICAL_OXYGEN">Oxígeno crítico</option>
                <option value="COMMENT_IMPORTANT">Comentario importante</option>
                <option value="TRANSFER_UPDATE">Actualización de traslado</option>
                <option value="ASSIGNMENT_CREATED">Asignación</option>
                <option value="SECURITY_INCIDENT">Incidente de seguridad</option>
                <option value="SYSTEM_ALERT">Alerta del sistema</option>
                <option value="PENDING_HANDOFF">Entrega pendiente</option>
              </select>
            </div>
            <button
              onClick={() => { setFilters({}); setPage(1); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <CardSkeleton key={i} />)}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchNotifications} />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-12 h-12" />}
            title="Sin notificaciones"
            description="¡Estás al día!"
          />
        ) : (
          <>
            <div className="space-y-2">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNavigate(notification)}
                  className={cn(
                    'w-full text-left bg-card rounded-xl border p-4 transition-all hover:shadow-sm flex items-start gap-3',
                    !notification.isRead ? 'border-primary/20 bg-primary/5' : 'border-border',
                  )}
                >
                  <div className="p-2 rounded-lg bg-muted flex-shrink-0">
                    {typeIcons[notification.type] || <Bell className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-sm', !notification.isRead ? 'font-semibold text-foreground' : 'text-foreground/80')}>
                        {notification.title}
                      </span>
                      {!notification.isRead && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{dayjs(notification.createdAt).fromNow()}</p>
                  </div>
                  {!notification.isRead && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMarkRead(notification.id); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
                      title="Marcar como leída"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                </button>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-border text-foreground rounded-lg disabled:opacity-50 hover:bg-accent"
                >
                  Anterior
                </button>
                <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-border text-foreground rounded-lg disabled:opacity-50 hover:bg-accent"
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
