'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/app-shell';
import { operationsLogApi } from '@/services/operations-log';
import { useSocketEvent } from '@/hooks/useSocket';
import { CardSkeleton } from '@/components/ui/loading-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
dayjs.extend(relativeTime);
dayjs.locale('es');
import { ROLE_LABELS } from '@/lib/i18n';
import {
  Activity,
  Filter,
  RefreshCw,
  ArrowRightLeft,
  UserCheck,
  MessageSquare,
  Wind,
  Clock,
  ArrowLeftRight,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogEntry {
  id: string;
  type: 'status_change' | 'assignment' | 'comment' | 'oxygen' | 'shift' | 'handoff' | 'security';
  entityType: string;
  title: string;
  description: string;
  timestamp: string;
  actor?: { id: string; firstName: string; lastName: string; role: string };
  severity: string;
  entityId?: string;
  trackingToken?: string;
  metadata?: Record<string, any>;
}

const typeConfig: Record<string, { icon: React.ReactNode; label: string; color: string; bgColor: string }> = {
  status_change: {
    icon: <ArrowRightLeft className="w-4 h-4" />,
    label: 'Cambio de estado',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  assignment: {
    icon: <UserCheck className="w-4 h-4" />,
    label: 'Asignación',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  comment: {
    icon: <MessageSquare className="w-4 h-4" />,
    label: 'Comentario',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  oxygen: {
    icon: <Wind className="w-4 h-4" />,
    label: 'Oxígeno',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
  shift: {
    icon: <Clock className="w-4 h-4" />,
    label: 'Turno',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  handoff: {
    icon: <ArrowLeftRight className="w-4 h-4" />,
    label: 'Entrega',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-500/10',
  },
  security: {
    icon: <ShieldAlert className="w-4 h-4" />,
    label: 'Seguridad',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
};

const severityBorder: Record<string, string> = {
  critical: 'border-l-destructive',
  warning: 'border-l-amber-500',
  info: 'border-l-primary',
};

export default function OperationsLogPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page: String(page), limit: '30', ...filters };
      const res = await operationsLogApi.list(params);
      setEntries(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar la bitácora de operaciones');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useSocketEvent('transfer.status_changed', () => fetchLogs());
  useSocketEvent('assignment.created', () => fetchLogs());
  useSocketEvent('comment.created', () => fetchLogs());
  useSocketEvent('oxygen.tank_low', () => fetchLogs());
  useSocketEvent('oxygen.tank_critical', () => fetchLogs());
  useSocketEvent('shift.handoff_created', () => fetchLogs());
  useSocketEvent('security.incident_created', () => fetchLogs());

  const handleNavigate = (entry: LogEntry) => {
    if (entry.trackingToken) {
      router.push(`/transfers/${entry.entityId}`);
    } else if (entry.entityType === 'oxygen' && entry.entityId) {
      router.push(`/oxygen/${entry.entityId}`);
    } else if (entry.entityType === 'security' && entry.entityId) {
      router.push('/security-incidents');
    } else if (entry.entityType === 'shift' || entry.entityType === 'handoff') {
      router.push('/shifts');
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-3 h-3 text-destructive" />;
      case 'warning': return <AlertTriangle className="w-3 h-3 text-amber-500 dark:text-amber-400" />;
      default: return <Info className="w-3 h-3 text-primary" />;
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bitácora de operaciones</h1>
            <p className="text-sm text-muted-foreground mt-1">Línea de tiempo unificada de todas las operaciones del hospital</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
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
          </div>
        </div>

        {showFilters && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select
                value={filters.type || ''}
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
                className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              >
                <option value="">Todos los tipos</option>
                <option value="status_change">Estado de traslado</option>
                <option value="assignment">Asignaciones</option>
                <option value="comment">Comentarios</option>
                <option value="oxygen">Oxígeno</option>
                <option value="shift">Turnos</option>
                <option value="handoff">Entregas</option>
                <option value="security">Seguridad</option>
              </select>
              <input
                type="text"
                placeholder="Buscar…"
                value={filters.search || ''}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              />
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
            {[1, 2, 3, 4, 5].map((i) => <CardSkeleton key={i} />)}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchLogs} />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<Activity className="w-12 h-12" />}
            title="Sin entradas en la bitácora"
            description="No hay actividad registrada para los filtros seleccionados."
          />
        ) : (
          <>
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-4">
                {entries.map((entry) => {
                  const config = typeConfig[entry.type] || typeConfig.status_change;
                  return (
                    <button
                      key={entry.id}
                      onClick={() => handleNavigate(entry)}
                      className={cn(
                        'relative w-full text-left bg-card rounded-xl border border-border p-4 pl-14 transition-all hover:shadow-sm',
                        severityBorder[entry.severity] || '',
                      )}
                    >
                      <div className={cn(
                        'absolute left-4 top-5 w-4 h-4 rounded-full border-2 border-card flex items-center justify-center',
                        config.bgColor,
                      )}>
                        <div className={cn('w-2 h-2 rounded-full', config.color.replace('text-', 'bg-'))} />
                      </div>

                      <div className="flex items-start gap-3">
                        <div className={cn('p-1.5 rounded-lg flex-shrink-0', config.bgColor)}>
                          {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn('text-xs font-medium', config.color)}>
                              {config.label}
                            </span>
                            {getSeverityIcon(entry.severity)}
                            <span className="text-xs text-muted-foreground">
                              {dayjs(entry.timestamp).fromNow()}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-foreground mt-0.5">{entry.title}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{entry.description}</p>
                          {entry.actor && (
                            <p className="text-xs text-muted-foreground mt-1">
                              por {entry.actor.firstName} {entry.actor.lastName}
                              <span className="ml-1 text-muted-foreground/60">({entry.actor.role ? (ROLE_LABELS[entry.actor.role] ?? entry.actor.role.replace(/_/g, ' ')) : ''})</span>
                            </p>
                          )}
                          {entry.trackingToken && (
                            <p className="text-xs text-primary mt-0.5 font-mono">
                              #{entry.trackingToken.substring(0, 8)}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
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
