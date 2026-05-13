'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/app-shell';
import { usePermissions } from '@/lib/permissions';
import { securityIncidentsApi } from '@/services/security-incidents';
import { CardSkeleton } from '@/components/ui/loading-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
dayjs.extend(relativeTime);
dayjs.locale('es');
import { INCIDENT_SEVERITY_LABELS } from '@/lib/i18n';
import {
  ShieldAlert,
  Filter,
  CheckCircle2,
  Loader2,
  Globe,
  Clock,
  AlertTriangle,
  AlertCircle,
  Info,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SecurityIncident {
  id: string;
  userId?: string;
  user?: { id: string; firstName: string; lastName: string; email: string; role: string };
  type: string;
  severity: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  resolvedAt?: string;
  resolvedById?: string;
  resolution?: string;
  createdAt: string;
}

const severityColors: Record<string, string> = {
  CRITICAL: 'bg-destructive/15 text-destructive border-destructive/20',
  HIGH: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/20',
  MEDIUM: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20',
  LOW: 'bg-primary/15 text-primary border-primary/20',
};

const severityIcons: Record<string, React.ReactNode> = {
  CRITICAL: <AlertCircle className="w-4 h-4" />,
  HIGH: <AlertTriangle className="w-4 h-4" />,
  MEDIUM: <AlertTriangle className="w-4 h-4" />,
  LOW: <Info className="w-4 h-4" />,
};

export default function SecurityIncidentsPage() {
  const { can } = usePermissions();
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null);
  const [resolution, setResolution] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page: String(page), limit: '20', ...filters };
      const res = await securityIncidentsApi.list(params);
      setIncidents(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los incidentes');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  const handleResolve = async () => {
    if (!selectedIncident || !resolution.trim()) return;
    setResolving(true);
    try {
      await securityIncidentsApi.resolve(selectedIncident.id, resolution);
      setSelectedIncident(null);
      setResolution('');
      fetchIncidents();
    } catch (err: any) {
      console.error('Failed to resolve:', err);
    } finally {
      setResolving(false);
    }
  };

  if (!can('VIEW_SECURITY_INCIDENTS')) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No tienes permiso para ver los incidentes de seguridad.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Incidentes de seguridad</h1>
            <p className="text-sm text-muted-foreground mt-1">Registro y gestión de eventos de seguridad</p>
          </div>
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

        {showFilters && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select
                value={filters.severity || ''}
                onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value }))}
                className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              >
                <option value="">Todas las severidades</option>
                <option value="CRITICAL">Crítica</option>
                <option value="HIGH">Alta</option>
                <option value="MEDIUM">Media</option>
                <option value="LOW">Baja</option>
              </select>
              <select
                value={filters.type || ''}
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
                className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              >
                <option value="">Todos los tipos</option>
                <option value="FAILED_LOGIN">Inicio de sesión fallido</option>
                <option value="ACCESS_DENIED">Acceso denegado</option>
                <option value="BRUTE_FORCE_ATTEMPT">Fuerza bruta</option>
                <option value="SUSPICIOUS_TOKEN_REUSE">Reuso de token</option>
                <option value="UNAUTHORIZED_ACCESS">Acceso no autorizado</option>
                <option value="DATA_ACCESS_ANOMALY">Anomalía en acceso a datos</option>
                <option value="OTHER">Otro</option>
              </select>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              >
                <option value="">Todos los estados</option>
                <option value="open">Abierto</option>
                <option value="resolved">Resuelto</option>
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
          <ErrorState message={error} onRetry={fetchIncidents} />
        ) : incidents.length === 0 ? (
          <EmptyState
            icon={<ShieldAlert className="w-12 h-12" />}
            title="Sin incidentes"
            description="No se encontraron incidentes de seguridad. El sistema está seguro."
          />
        ) : (
          <>
            <div className="space-y-2">
              {incidents.map((incident) => (
                <button
                  key={incident.id}
                  onClick={() => setSelectedIncident(incident)}
                  className={cn(
                    'w-full text-left bg-card rounded-xl border p-4 transition-all hover:shadow-sm',
                    incident.resolvedAt ? 'border-border opacity-70' : 'border-destructive/30',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'p-2 rounded-lg',
                      incident.severity === 'CRITICAL' ? 'bg-destructive/10' : incident.severity === 'HIGH' ? 'bg-orange-500/10' : 'bg-amber-500/10',
                    )}>
                      {severityIcons[incident.severity] || <ShieldAlert className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          'text-xs font-medium px-2 py-0.5 rounded-full border',
                          severityColors[incident.severity] || severityColors.LOW,
                        )}>
                          {INCIDENT_SEVERITY_LABELS[incident.severity] ?? incident.severity}
                        </span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {incident.type?.replace(/_/g, ' ')}
                        </span>
                        {incident.resolvedAt ? (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            Resuelto
                          </span>
                        ) : (
                          <span className="text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                            Abierto
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground mt-1">{incident.description}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {incident.user && (
                          <span>{incident.user.firstName} {incident.user.lastName}</span>
                        )}
                        {incident.ipAddress && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {incident.ipAddress}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {dayjs(incident.createdAt).fromNow()}
                        </span>
                      </div>
                    </div>
                  </div>
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

      {/* Incident Detail Drawer */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedIncident(null)} />
          <div className="relative w-full max-w-lg bg-card shadow-xl h-full overflow-y-auto border-l border-border">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Detalles del incidente</h2>
                <button onClick={() => setSelectedIncident(null)} className="text-muted-foreground hover:text-foreground">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-sm font-medium px-2 py-1 rounded-full border',
                    severityColors[selectedIncident.severity] || severityColors.LOW,
                  )}>
                    {INCIDENT_SEVERITY_LABELS[selectedIncident.severity] ?? selectedIncident.severity}
                  </span>
                  <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {selectedIncident.type?.replace(/_/g, ' ')}
                  </span>
                  {selectedIncident.resolvedAt ? (
                    <span className="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">Resuelto</span>
                  ) : (
                    <span className="text-sm text-destructive bg-destructive/10 px-2 py-1 rounded-full">Abierto</span>
                  )}
                </div>

                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Descripción</label>
                  <p className="text-sm text-foreground mt-1">{selectedIncident.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Usuario</label>
                    <p className="text-sm text-foreground mt-1">
                      {selectedIncident.user ? `${selectedIncident.user.firstName} ${selectedIncident.user.lastName}` : 'Desconocido'}
                    </p>
                    {selectedIncident.user?.email && (
                      <p className="text-xs text-muted-foreground">{selectedIncident.user.email}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Creado</label>
                    <p className="text-sm text-foreground mt-1">{dayjs(selectedIncident.createdAt).format('YYYY-MM-DD HH:mm')}</p>
                  </div>
                </div>

                {selectedIncident.ipAddress && (
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Dirección IP</label>
                    <p className="text-sm text-foreground mt-1 font-mono">{selectedIncident.ipAddress}</p>
                  </div>
                )}

                {selectedIncident.userAgent && (
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">User Agent</label>
                    <p className="text-xs text-foreground/80 mt-1 break-all">{selectedIncident.userAgent}</p>
                  </div>
                )}

                {selectedIncident.metadata && (
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Metadatos</label>
                    <pre className="text-xs text-foreground/80 bg-muted rounded-lg p-3 mt-1 border border-border overflow-auto max-h-40">
                      {JSON.stringify(selectedIncident.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedIncident.resolution && (
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Resolución</label>
                    <p className="text-sm text-foreground mt-1">{selectedIncident.resolution}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Resuelto el {dayjs(selectedIncident.resolvedAt).format('YYYY-MM-DD HH:mm')}
                    </p>
                  </div>
                )}

                {!selectedIncident.resolvedAt && can('MANAGE_SECURITY_INCIDENTS') && (
                  <div className="border-t border-border pt-4 space-y-3">
                    <h3 className="text-sm font-medium text-foreground">Resolver incidente</h3>
                    <textarea
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      placeholder="Captura los detalles de la resolución…"
                      rows={3}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground resize-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      onClick={handleResolve}
                      disabled={resolving || !resolution.trim()}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {resolving ? 'Resolviendo…' : 'Resolver incidente'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
