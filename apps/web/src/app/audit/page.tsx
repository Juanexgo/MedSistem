'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/app-shell';
import { usePermissions } from '@/lib/permissions';
import { auditApi } from '@/services/audit';
import { reportsApi } from '@/services/reports';
import { CardSkeleton } from '@/components/ui/loading-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
dayjs.extend(relativeTime);
dayjs.locale('es');
import {
  ScrollText,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  Monitor,
  Globe,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuditEntry {
  id: string;
  userId?: string;
  user?: { id: string; firstName: string; lastName: string; email: string; role: string };
  action: string;
  entity: string;
  entityId?: string;
  previousData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
  comment?: string;
  createdAt: string;
}

export default function AuditPage() {
  const { can } = usePermissions();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page: String(page), limit: '25', ...filters };
      const res = await auditApi.list(params);
      setEntries(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los registros de auditoría');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchAuditLogs(); }, [fetchAuditLogs]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await reportsApi.exportAuditLogs({
        from: filters.fromDate,
        to: filters.toDate,
      });
      const csv = [
        'Acción,Entidad,ID Entidad,Usuario,Dirección IP,Comentario,Fecha de creación',
        ...(Array.isArray(data) ? data.map((e: any) =>
          `"${e.action}","${e.entity}","${e.entityId || ''}","${e.user ? e.user.firstName + ' ' + e.user.lastName : ''}","${e.ipAddress || ''}","${(e.comment || '').replace(/"/g, '""')}","${e.createdAt}"`
        ) : []),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auditoria-${dayjs().format('YYYY-MM-DD')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const actionColors: Record<string, string> = {
    CREATE: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    UPDATE: 'text-primary bg-primary/10',
    DELETE: 'text-destructive bg-destructive/10',
    LOGIN: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    LOGOUT: 'text-muted-foreground bg-muted',
    LOGIN_FAILED: 'text-destructive bg-destructive/10',
    ASSIGN: 'text-purple-600 dark:text-purple-400 bg-purple-500/10',
    REASSIGN: 'text-orange-600 dark:text-orange-400 bg-orange-500/10',
    CANCEL: 'text-destructive bg-destructive/10',
    COMPLETE: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    VIEW: 'text-muted-foreground bg-muted',
    EXPORT: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10',
    HANDOFF: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10',
    CLOSE_SHIFT: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
    ALERT_TRIGGERED: 'text-rose-600 dark:text-rose-400 bg-rose-500/10',
    RESOLVE: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    MARK_IMPORTANT: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
    READ: 'text-primary bg-primary/10',
  };

  if (!can('VIEW_AUDIT')) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No tienes permiso para ver los registros de auditoría.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Auditoría</h1>
            <p className="text-sm text-muted-foreground mt-1">Registro de todas las acciones y cambios del sistema</p>
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
            {can('EXPORT_REPORTS') && (
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {exporting ? 'Exportando…' : 'Exportar CSV'}
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select
                value={filters.action || ''}
                onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
                className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              >
                <option value="">Todas las acciones</option>
                <option value="CREATE">Crear</option>
                <option value="UPDATE">Actualizar</option>
                <option value="DELETE">Eliminar</option>
                <option value="LOGIN">Inicio de sesión</option>
                <option value="LOGOUT">Cerrar sesión</option>
                <option value="LOGIN_FAILED">Inicio fallido</option>
                <option value="ASSIGN">Asignar</option>
                <option value="REASSIGN">Reasignar</option>
                <option value="CANCEL">Cancelar</option>
                <option value="COMPLETE">Completar</option>
                <option value="EXPORT">Exportar</option>
                <option value="HANDOFF">Entrega</option>
                <option value="RESOLVE">Resolver</option>
              </select>
              <select
                value={filters.entity || ''}
                onChange={(e) => setFilters((f) => ({ ...f, entity: e.target.value }))}
                className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              >
                <option value="">Todas las entidades</option>
                <option value="Transfer">Traslado</option>
                <option value="Comment">Comentario</option>
                <option value="User">Usuario</option>
                <option value="Shift">Turno</option>
                <option value="OxygenTank">Tanque de oxígeno</option>
                <option value="Notification">Notificación</option>
                <option value="SecurityIncident">Incidente de seguridad</option>
              </select>
              <select
                value={filters.role || ''}
                onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
                className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              >
                <option value="">Todos los roles</option>
                <option value="ADMIN">Administrador</option>
                <option value="HEAD_NURSE">Jefa de Enfermería</option>
                <option value="TRANSPORTER">Camillero</option>
                <option value="AUDITOR">Auditor</option>
                <option value="DOCTOR">Médico</option>
                <option value="NURSING">Enfermería</option>
                <option value="SUPERVISOR">Supervisor</option>
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
          <ErrorState message={error} onRetry={fetchAuditLogs} />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<ScrollText className="w-12 h-12" />}
            title="Sin registros de auditoría"
            description="No hay entradas que coincidan con los filtros."
          />
        ) : (
          <>
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="bg-card rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    className="w-full text-left p-4 flex items-start gap-3 hover:bg-accent transition-colors"
                  >
                    <div className={cn('px-2 py-1 rounded text-xs font-medium', actionColors[entry.action] || 'text-muted-foreground bg-muted')}>
                      {entry.action}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-foreground">{entry.entity}</span>
                        {entry.entityId && (
                          <span className="text-xs text-muted-foreground font-mono">#{entry.entityId.substring(0, 8)}</span>
                        )}
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{dayjs(entry.createdAt).fromNow()}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {entry.user && <span>{entry.user.firstName} {entry.user.lastName}</span>}
                        {entry.comment && (
                          <>
                            <span>•</span>
                            <span className="italic">{entry.comment}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        {entry.ipAddress && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {entry.ipAddress}
                          </span>
                        )}
                        {entry.userAgent && (
                          <span className="flex items-center gap-1 truncate max-w-[200px]">
                            <Monitor className="w-3 h-3 flex-shrink-0" />
                            {entry.userAgent}
                          </span>
                        )}
                      </div>
                    </div>
                    {expandedId === entry.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {expandedId === entry.id && (entry.previousData || entry.newData) && (
                    <div className="border-t border-border bg-muted p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {entry.previousData && (
                          <div>
                            <h4 className="text-xs font-semibold text-destructive mb-2">Datos anteriores</h4>
                            <pre className="text-xs text-foreground/80 bg-card rounded-lg p-3 border border-border overflow-auto max-h-40">
                              {JSON.stringify(entry.previousData, null, 2)}
                            </pre>
                          </div>
                        )}
                        {entry.newData && (
                          <div>
                            <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">Datos nuevos</h4>
                            <pre className="text-xs text-foreground/80 bg-card rounded-lg p-3 border border-border overflow-auto max-h-40">
                              {JSON.stringify(entry.newData, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
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
