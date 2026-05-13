'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/app-shell';
import { usePermissions } from '@/lib/permissions';
import { useAuth } from '@/lib/auth-provider';
import { commentsApi, type CreateCommentData } from '@/services/comments';
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
import { COMMENT_TYPE_LABELS, COMMENT_SEVERITY_LABELS, COMMENT_STATUS_LABELS } from '@/lib/i18n';
import {
  MessageSquare,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Filter,
  Send,
  Plus,
  Star,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const severityColors: Record<string, string> = {
  CRITICAL: 'bg-destructive/15 text-destructive border-destructive/20',
  WARNING: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20',
  INFO: 'bg-primary/15 text-primary border-primary/20',
};

const statusColors: Record<string, string> = {
  OPEN: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  IN_PROGRESS: 'bg-primary/15 text-primary',
  RESOLVED: 'bg-muted text-foreground/80',
  CLOSED: 'bg-muted text-muted-foreground',
};

const typeIcons: Record<string, React.ReactNode> = {
  PATIENT_NOT_READY: <AlertCircle className="w-4 h-4" />,
  MISSING_OXYGEN_TANK: <AlertTriangle className="w-4 h-4" />,
  DOCTOR_ABSENT: <XCircle className="w-4 h-4" />,
  ELEVATOR_SATURATED: <AlertTriangle className="w-4 h-4" />,
  DELAY: <AlertCircle className="w-4 h-4" />,
  GENERAL: <MessageSquare className="w-4 h-4" />,
  INCIDENT: <AlertTriangle className="w-4 h-4" />,
};

interface Comment {
  id: string;
  content: string;
  isImportant: boolean;
  type: string;
  severity: string;
  status: string;
  userId: string;
  user?: { id: string; firstName: string; lastName: string; role: string };
  transferRequestId?: string;
  transferRequest?: { id: string; trackingToken: string; patient?: { fullName: string } };
  resolvedAt?: string;
  createdAt: string;
}

export default function CommunicationPage() {
  const { can } = usePermissions();
  const { user } = useAuth();
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newComment, setNewComment] = useState<CreateCommentData>({
    content: '', type: 'GENERAL', severity: 'INFO',
  });
  const [creating, setCreating] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page: String(page), limit: '20', ...filters };
      const res = await commentsApi.list(params);
      setComments(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los comentarios');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  useSocketEvent('comment.created', (payload: any) => {
    if (payload?.data) {
      fetchComments();
    }
  });

  useSocketEvent('comment.important', (payload: any) => {
    if (payload?.data) {
      fetchComments();
    }
  });

  const handleCreate = async () => {
    if (!newComment.content.trim()) return;
    setCreating(true);
    try {
      await commentsApi.create(newComment);
      setShowCreateDialog(false);
      setNewComment({ content: '', type: 'GENERAL', severity: 'INFO' });
      fetchComments();
    } catch (err: any) {
      console.error('Failed to create comment:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleMarkImportant = async (id: string) => {
    try {
      await commentsApi.markImportant(id);
      fetchComments();
    } catch (err) {
      console.error('Failed to mark important:', err);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await commentsApi.resolve(id);
      fetchComments();
    } catch (err) {
      console.error('Failed to resolve:', err);
    }
  };

  if (!can('VIEW_COMMENTS')) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No tienes permiso para ver el centro de comunicación.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Centro de comunicación</h1>
            <p className="text-sm text-muted-foreground mt-1">Bitácora de operaciones y seguimiento de incidentes</p>
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
            {can('CREATE_COMMENT') && (
              <button
                onClick={() => setShowCreateDialog(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nuevo comentario
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select
                value={filters.type || ''}
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value, ...(e.target.value ? {} : {}) }))}
                className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              >
                <option value="">Todos los tipos</option>
                <option value="GENERAL">General</option>
                <option value="INCIDENT">Incidente</option>
                <option value="PATIENT_NOT_READY">Paciente no listo</option>
                <option value="MISSING_OXYGEN_TANK">Falta tanque de oxígeno</option>
                <option value="DOCTOR_ABSENT">Médico ausente</option>
                <option value="ELEVATOR_SATURATED">Elevador saturado</option>
                <option value="DELAY">Retraso</option>
              </select>
              <select
                value={filters.severity || ''}
                onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value }))}
                className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              >
                <option value="">Todas las severidades</option>
                <option value="INFO">Informativa</option>
                <option value="WARNING">Advertencia</option>
                <option value="CRITICAL">Crítica</option>
              </select>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              >
                <option value="">Todos los estados</option>
                <option value="OPEN">Abierto</option>
                <option value="IN_PROGRESS">En progreso</option>
                <option value="RESOLVED">Resuelto</option>
                <option value="CLOSED">Cerrado</option>
              </select>
              <select
                value={filters.isImportant || ''}
                onChange={(e) => setFilters((f) => ({ ...f, isImportant: e.target.value }))}
                className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              >
                <option value="">Todos los comentarios</option>
                <option value="true">Solo importantes</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setFilters({}); setPage(1); }}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        )}

        {/* Comments Feed */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchComments} />
        ) : comments.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="w-12 h-12" />}
            title="Sin comentarios"
            description="Aún no hay eventos de comunicación. Crea un comentario para empezar."
            action={can('CREATE_COMMENT') ? { label: 'Nuevo comentario', onClick: () => setShowCreateDialog(true) } : undefined}
          />
        ) : (
          <>
            <div className="space-y-3">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className={cn(
                    'bg-card rounded-xl border p-4 transition-all hover:shadow-sm',
                    comment.isImportant ? 'border-amber-500/30 ring-1 ring-amber-500/15' : 'border-border',
                    comment.status === 'CLOSED' || comment.status === 'RESOLVED' ? 'opacity-60' : '',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'p-2 rounded-lg flex-shrink-0',
                      comment.severity === 'CRITICAL' ? 'bg-destructive/10' : comment.severity === 'WARNING' ? 'bg-amber-500/10' : 'bg-primary/10',
                    )}>
                      {typeIcons[comment.type] || <MessageSquare className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          'text-xs font-medium px-2 py-0.5 rounded-full border',
                          severityColors[comment.severity] || severityColors.INFO,
                        )}>
                          {COMMENT_SEVERITY_LABELS[comment.severity] ?? comment.severity}
                        </span>
                        <span className={cn(
                          'text-xs font-medium px-2 py-0.5 rounded-full',
                          statusColors[comment.status] || statusColors.OPEN,
                        )}>
                          {COMMENT_STATUS_LABELS[comment.status] ?? comment.status}
                        </span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {COMMENT_TYPE_LABELS[comment.type] ?? comment.type?.replace(/_/g, ' ')}
                        </span>
                        {comment.isImportant && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                            <Star className="w-3 h-3 fill-amber-400" />
                            Importante
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{comment.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{comment.user?.firstName} {comment.user?.lastName}</span>
                        <span>•</span>
                        <span>{dayjs(comment.createdAt).fromNow()}</span>
                        {comment.transferRequest?.trackingToken && (
                          <>
                            <span>•</span>
                            <button
                              onClick={() => router.push(`/transfers/${comment.transferRequestId}`)}
                              className="text-primary hover:text-primary/80 hover:underline"
                            >
                              Traslado {comment.transferRequest.trackingToken.substring(0, 8)}…
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!comment.isImportant && can('CREATE_COMMENT') && (
                        <button
                          onClick={() => handleMarkImportant(comment.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                          title="Marcar como importante"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      {(comment.status === 'OPEN' || comment.status === 'IN_PROGRESS') && can('CREATE_COMMENT') && (
                        <button
                          onClick={() => handleResolve(comment.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          title="Resolver"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-border text-foreground rounded-lg disabled:opacity-50 hover:bg-accent"
                >
                  Anterior
                </button>
                <span className="text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </span>
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

      {/* Create Comment Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4 border border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Nuevo comentario</h2>
              <button onClick={() => setShowCreateDialog(false)} className="text-muted-foreground hover:text-foreground">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Tipo</label>
                <select
                  value={newComment.type}
                  onChange={(e) => setNewComment((c) => ({ ...c, type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
                >
                  <option value="GENERAL">General</option>
                  <option value="INCIDENT">Incidente</option>
                  <option value="PATIENT_NOT_READY">Paciente no listo</option>
                  <option value="MISSING_OXYGEN_TANK">Falta tanque de oxígeno</option>
                  <option value="DOCTOR_ABSENT">Médico ausente</option>
                  <option value="ELEVATOR_SATURATED">Elevador saturado</option>
                  <option value="DELAY">Retraso</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Severidad</label>
                  <select
                    value={newComment.severity}
                    onChange={(e) => setNewComment((c) => ({ ...c, severity: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
                  >
                    <option value="INFO">Informativa</option>
                    <option value="WARNING">Advertencia</option>
                    <option value="CRITICAL">Crítica</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Marcar como importante</label>
                  <label className="flex items-center gap-2 px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newComment.isImportant || false}
                      onChange={(e) => setNewComment((c) => ({ ...c, isImportant: e.target.checked }))}
                      className="rounded"
                    />
                    Importante
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Contenido</label>
                <textarea
                  value={newComment.content}
                  onChange={(e) => setNewComment((c) => ({ ...c, content: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground resize-none"
                  placeholder="Describe el incidente o comentario…"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 text-sm text-foreground border border-border rounded-lg hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newComment.content.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {creating ? 'Creando…' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
