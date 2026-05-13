'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/services/dashboard';
import { securityIncidentsApi } from '@/services/security-incidents';
import { usePermissions } from '@/lib/permissions';
import { useSocketEvent } from '@/hooks/useSocket';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { AppShell } from '@/components/app-shell';
import { MetricCard } from '@/components/ui/metric-card';
import { AlertCard } from '@/components/ui/alert-card';
import { DashboardSection } from '@/components/ui/dashboard-section';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/loading-skeleton';
import { StatusBadge } from '@/components/status-badge';
import { PriorityBadge } from '@/components/priority-badge';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
dayjs.extend(relativeTime);
dayjs.locale('es');
import { ZONE_LABELS, TRANSFER_PRIORITY_LABELS, SHIFT_TYPE_LABELS } from '@/lib/i18n';
import {
  Activity,
  AlertTriangle,
  Ambulance,
  ArrowRightLeft,
  Ban,
  CheckCircle2,
  Clock,
  Users,
  Gauge,
  Timer,
  TrendingUp,
  UserCheck,
  UserX,
  AlertCircle,
  MessageSquare,
  ShieldAlert,
  ClipboardList,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const PRIORITY_COLORS = {
  URGENT: '#ef4444',
  HIGH: '#f59e0b',
  NORMAL: '#3b82f6',
  SCHEDULED: '#64748b',
};

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: 'bg-muted',
  ASSIGNED: 'bg-primary/15',
  COMPLETED: 'bg-emerald-500/15',
  CANCELLED: 'bg-destructive/15',
};

export function DashboardClient() {
  const router = useRouter();
  const { can, role } = usePermissions();
  const [timeRange, setTimeRange] = useState<'today' | 'shift' | '7days'>('today');

  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['full-dashboard', timeRange],
    queryFn: () => dashboardApi.getFullDashboard({ timeRange }),
    refetchInterval: 30000,
  });

  useSocketEvent('dashboard.metrics_updated', () => {
    refetch();
  });

  useSocketEvent('oxygen.tank_created', () => refetch());
  useSocketEvent('oxygen.tank_updated', () => refetch());
  useSocketEvent('oxygen.tank_low', () => refetch());
  useSocketEvent('oxygen.tank_critical', () => refetch());
  useSocketEvent('clinical.alert_created', () => refetch());
  useSocketEvent('shift.started', () => refetch());
  useSocketEvent('shift.ended', () => refetch());
  useSocketEvent('shift.handoff_created', () => refetch());
  useSocketEvent('shift.handoff_pending', () => refetch());
  useSocketEvent('security.incident_created', () => refetchSecurity());

  const metrics = data?.metrics;

  const { data: securityIncidents, refetch: refetchSecurity } = useQuery({
    queryKey: ['security-incidents-dashboard'],
    queryFn: async () => {
      const res = await securityIncidentsApi.list({ limit: '5', page: '1' });
      return (res.data || []) as any[];
    },
    refetchInterval: 30000,
  });

  const isLoadingMetrics = isLoading;

  const isAdmin = role === 'ADMIN';
  const isHeadNurse = role === 'HEAD_NURSE';
  const isTransporter = role === 'TRANSPORTER';
  const isAuditor = role === 'AUDITOR';
  const isDoctor = role === 'DOCTOR';
  const canViewTransfers = can('VIEW_TRANSFERS');
  const canViewOxygen = can('MANAGE_OXYGEN');
  const canViewPatientData = can('VIEW_PATIENT_DATA');
  const canManageSecurity = can('MANAGE_SECURITY_INCIDENTS');

  const formatMinutes = (m?: number) => {
    if (!m && m !== 0) return '—';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h}h ${min}m`;
  };

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : undefined;

  const slaColor = useMemo(() => {
    if (!metrics?.slaCompliance) return 'bg-emerald-500';
    if (metrics.slaCompliance >= 90) return 'bg-emerald-500';
    if (metrics.slaCompliance >= 75) return 'bg-amber-500';
    return 'bg-red-500';
  }, [metrics?.slaCompliance]);

  if (isAuditor) {
    return <AuditorDashboard />;
  }

  if (isTransporter) {
    return <TransporterDashboard />;
  }

  if (isDoctor && !canViewTransfers) {
    return (
      <AppShell>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard label="Traslados activos" value={metrics?.activeTransports ?? 0} icon={ArrowRightLeft} color="blue" loading={isLoadingMetrics} />
          <MetricCard label="Completados hoy" value={metrics?.completedToday ?? 0} icon={CheckCircle2} color="emerald" loading={isLoadingMetrics} />
          <MetricCard label="Cumplimiento de SLA" value={metrics ? `${metrics.slaCompliance}%` : '—'} icon={Gauge} color="purple" loading={isLoadingMetrics} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell onRefresh={refetch} lastUpdated={lastUpdated}>
      {/* Time Range Filter */}
      <div className="flex items-center gap-2 mb-6">
        {(['today', 'shift', '7days'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              timeRange === range
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-card text-muted-foreground border border-border hover:bg-accent'
            }`}
          >
            {range === 'today' ? 'Hoy' : range === 'shift' ? 'Turno actual' : 'Últimos 7 días'}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Traslados de hoy"
          value={metrics?.totalToday ?? 0}
          icon={ArrowRightLeft}
          color="blue"
          loading={isLoadingMetrics}
          subtitle={timeRange === '7days' ? 'Últimos 7 días' : 'Hoy'}
        />
        <MetricCard
          label="Traslados activos"
          value={metrics?.activeTransports ?? 0}
          icon={Activity}
          color="amber"
          loading={isLoadingMetrics}
          subtitle="En curso ahora"
        />
        <MetricCard
          label="Urgentes"
          value={metrics?.urgentToday ?? 0}
          icon={AlertTriangle}
          color="red"
          loading={isLoadingMetrics}
          subtitle={metrics?.unassignedUrgent ? `${metrics.unassignedUrgent} sin asignar` : undefined}
        />
        <MetricCard
          label="Cumplimiento de SLA"
          value={metrics ? `${metrics.slaCompliance}%` : '—'}
          icon={Gauge}
          color={metrics?.slaCompliance && metrics.slaCompliance >= 90 ? 'emerald' : 'amber'}
          loading={isLoadingMetrics}
          subtitle="Meta: ≥90%"
        />
      </div>

      {/* Second row KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Tiempo prom. de respuesta"
          value={formatMinutes(metrics?.averageResponseTime)}
          icon={Timer}
          color="indigo"
          loading={isLoadingMetrics}
        />
        <MetricCard
          label="Tiempo prom. de finalización"
          value={formatMinutes(metrics?.averageCompletionTime)}
          icon={TrendingUp}
          color="purple"
          loading={isLoadingMetrics}
        />
        <MetricCard
          label="Completados hoy"
          value={metrics?.completedToday ?? 0}
          icon={CheckCircle2}
          color="emerald"
          loading={isLoadingMetrics}
        />
        <MetricCard
          label="Cancelados"
          value={metrics?.cancelledToday ?? 0}
          icon={Ban}
          color="rose"
          loading={isLoadingMetrics}
        />
      </div>

      {/* SLA Progress Bar */}
      <div className="bg-card rounded-xl p-6 border border-border mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">Desempeño SLA (meta 25 min)</h3>
          <span className="text-xs text-muted-foreground">
            {metrics?.delayedTransports ?? 0} retrasados de {metrics?.totalToday ?? 0} totales
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${slaColor}`}
            style={{ width: `${metrics?.slaCompliance ?? 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Alerts Section */}
      {(metrics?.unassignedUrgent && metrics.unassignedUrgent > 0) ||
       (metrics?.lowTanks && metrics.lowTanks > 0) ||
       (metrics?.importantComments && metrics.importantComments > 0) ||
       (metrics?.pendingHandoffs && metrics.pendingHandoffs > 0) ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {metrics?.pendingHandoffs && metrics.pendingHandoffs > 0 && (
            <AlertCard
              title={`${metrics.pendingHandoffs} ${metrics.pendingHandoffs > 1 ? 'turnos pendientes de entrega' : 'turno pendiente de entrega'}`}
              description="Completa la documentación de entrega de los turnos finalizados"
              severity="warning"
              action={{ label: 'Ver entregas', onClick: () => router.push('/shifts/handoff') }}
            />
          )}
          {metrics?.unassignedUrgent && metrics.unassignedUrgent > 0 && (
            <AlertCard
              title={`${metrics.unassignedUrgent} ${metrics.unassignedUrgent > 1 ? 'traslados urgentes sin asignar' : 'traslado urgente sin asignar'}`}
              description="Requiere asignación inmediata"
              severity="critical"
              action={{ label: 'Ver traslados', onClick: () => router.push('/transfers?status=REQUESTED') }}
            />
          )}
          {metrics?.lowTanks && metrics.lowTanks > 0 && (
            <AlertCard
              title={`${metrics.lowTanks} ${metrics.lowTanks > 1 ? 'tanques de oxígeno bajos' : 'tanque de oxígeno bajo'}`}
              description={metrics.criticalTanks ? `${metrics.criticalTanks} en estado crítico, requieren atención inmediata` : 'Necesita reposición'}
              severity={metrics.criticalTanks && metrics.criticalTanks > 0 ? 'critical' : 'warning'}
              action={{ label: 'Ver tanques', onClick: () => router.push('/oxygen') }}
            />
          )}
          {metrics?.importantComments && metrics.importantComments > 0 && (
            <AlertCard
              title={`${metrics.importantComments} ${metrics.importantComments > 1 ? 'comentarios importantes' : 'comentario importante'}`}
              description="Hay comentarios sin resolver que requieren atención"
              severity="info"
            />
          )}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Active Transfers */}
        <div className="lg:col-span-2">
          <DashboardSection
            title="Traslados activos"
            subtitle={data?.activeTransfers ? `${data.activeTransfers.length} en curso` : undefined}
            loading={isLoading}
            action={
              canViewTransfers ? (
                <button
                  onClick={() => router.push('/transfers')}
                  className="text-xs text-primary hover:text-primary/80 font-medium"
                >
                  Ver todos
                </button>
              ) : undefined
            }
          >
            {isLoading ? (
              <TableSkeleton rows={4} />
            ) : data?.activeTransfers && data.activeTransfers.length > 0 ? (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-6 py-2 font-medium text-muted-foreground text-xs">Paciente</th>
                      <th className="text-left px-6 py-2 font-medium text-muted-foreground text-xs">Ruta</th>
                      <th className="text-left px-6 py-2 font-medium text-muted-foreground text-xs">Estado</th>
                      <th className="text-left px-6 py-2 font-medium text-muted-foreground text-xs">Prioridad</th>
                      <th className="text-left px-6 py-2 font-medium text-muted-foreground text-xs">Camillero</th>
                      <th className="text-left px-6 py-2 font-medium text-muted-foreground text-xs">Tiempo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.activeTransfers.slice(0, 8).map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-border hover:bg-accent cursor-pointer"
                        onClick={() => router.push(`/transfers/${t.id}`)}
                      >
                        <td className="px-6 py-3">
                          <div className="font-medium text-foreground">{t.patientName}</div>
                          <div className="text-xs text-muted-foreground">Cama {t.bedNumber} · Piso {t.floor}</div>
                        </td>
                        <td className="px-6 py-3 text-foreground/80 text-xs">
                          <div>{ZONE_LABELS[t.origin] ?? t.origin}</div>
                          <div className="text-muted-foreground">→ {ZONE_LABELS[t.destination] ?? t.destination}</div>
                        </td>
                        <td className="px-6 py-3"><StatusBadge status={t.status} /></td>
                        <td className="px-6 py-3"><PriorityBadge priority={t.priority} /></td>
                        <td className="px-6 py-3 text-foreground/80 text-xs">{t.assignedTransporterName || '—'}</td>
                        <td className="px-6 py-3">
                          <span className={`text-xs ${(t.elapsedMinutes ?? 0) > 25 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                            {t.elapsedMinutes ? `${t.elapsedMinutes}m` : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="Sin traslados activos" description="Todos los traslados están completados o aún no hay ninguno." />
            )}
          </DashboardSection>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Transporter Availability */}
          <DashboardSection
            title="Disponibilidad de camilleros"
            subtitle={data?.transporterAvailability ? `${data.transporterAvailability.available} disponibles` : undefined}
            loading={isLoading}
          >
            {data?.transporterAvailability ? (
              <div className="space-y-2">
                <StatusBar
                  label="Disponibles"
                  value={data.transporterAvailability.available}
                  total={data.transporterAvailability.total}
                  color="bg-emerald-500"
                />
                <StatusBar
                  label="Ocupados"
                  value={data.transporterAvailability.busy + data.transporterAvailability.inTransfer}
                  total={data.transporterAvailability.total}
                  color="bg-amber-500"
                />
                <StatusBar
                  label="En descanso"
                  value={data.transporterAvailability.onBreak}
                  total={data.transporterAvailability.total}
                  color="bg-muted-foreground"
                />
                <StatusBar
                  label="Fuera de turno"
                  value={data.transporterAvailability.offShift}
                  total={data.transporterAvailability.total}
                  color="bg-border"
                />
              </div>
            ) : (
              <EmptyState title="Sin datos" description="La disponibilidad de camilleros no está disponible." />
            )}
          </DashboardSection>

          {/* Unassigned Urgent */}
          {data?.unassignedUrgentTransfers && data.unassignedUrgentTransfers.length > 0 && (
            <DashboardSection
              title="Urgentes sin asignar"
              subtitle={`${data.unassignedUrgentTransfers.length} requieren asignación`}
              loading={isLoading}
            >
              <div className="space-y-2">
                {data.unassignedUrgentTransfers.slice(0, 5).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => router.push(`/transfers/${t.id}`)}
                    className="w-full text-left p-3 rounded-lg bg-destructive/10 border border-destructive/20 hover:bg-destructive/15 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-destructive">{t.patientName}</span>
                      <PriorityBadge priority={t.priority} />
                    </div>
                    <div className="text-xs text-destructive/90 mt-1">
                      {ZONE_LABELS[t.origin] ?? t.origin} → {ZONE_LABELS[t.destination] ?? t.destination}
                    </div>
                    <div className="text-xs text-destructive/70 mt-0.5">
                      {dayjs(t.requestedAt).fromNow()}
                    </div>
                  </button>
                ))}
              </div>
            </DashboardSection>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Today Activity Chart */}
        <DashboardSection title="Actividad del día" subtitle="Traslados por hora" loading={isLoading}>
          {data?.hourlyBreakdown ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.hourlyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))' }}
                    formatter={(value: number) => [value, 'Traslados']}
                    labelFormatter={(h) => `${h}:00 - ${h + 1}:00`}
                  />
                  <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Sin datos de actividad" />
          )}
        </DashboardSection>

        {/* Priority Breakdown */}
        <DashboardSection title="Distribución por prioridad" subtitle="Traslados actuales por prioridad" loading={isLoading}>
          {data?.priorityBreakdown ? (
            <div className="h-64 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.priorityBreakdown.filter((p) => p.count > 0)}
                    dataKey="count"
                    nameKey="priority"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {data.priorityBreakdown.filter((p) => p.count > 0).map((entry) => (
                      <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority as keyof typeof PRIORITY_COLORS] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))' }}
                    formatter={(value: number, name: string) => [value, TRANSFER_PRIORITY_LABELS[name] ?? name]}
                  />
                  <Legend
                    formatter={(value: string) => (
                      <span className="text-xs text-muted-foreground">{TRANSFER_PRIORITY_LABELS[value] ?? value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Sin datos de prioridad" />
          )}
        </DashboardSection>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Zone Saturation */}
        <DashboardSection
          title="Saturación por zona"
          subtitle={data?.zoneSaturation ? `${data.zoneSaturation.length} zonas` : undefined}
          loading={isLoading}
        >
          {data?.zoneSaturation && data.zoneSaturation.length > 0 ? (
            <div className="space-y-2">
              {data.zoneSaturation.slice(0, 8).map((z) => (
                <div key={z.zone} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color || 'hsl(var(--muted-foreground))' }} />
                    <span className="text-sm text-muted-foreground">{ZONE_LABELS[z.zone] ?? z.zone}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{z.activeCount}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Sin datos de zonas" />
          )}
        </DashboardSection>

        {/* Oxygen Summary */}
        <DashboardSection
          title="Estado de oxígeno"
          subtitle={data?.oxygenSummary ? `${data.oxygenSummary.total} tanques` : undefined}
          loading={isLoading}
        >
          {data?.oxygenSummary ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-emerald-500/10 rounded-lg text-center">
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{data.oxygenSummary.full}</div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400">Llenos</div>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg text-center">
                  <div className="text-lg font-bold text-primary">{data.oxygenSummary.medium}</div>
                  <div className="text-xs text-primary">Medios</div>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-lg text-center">
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{data.oxygenSummary.low}</div>
                  <div className="text-xs text-amber-600 dark:text-amber-400">Bajos</div>
                </div>
                <div className="p-3 bg-destructive/10 rounded-lg text-center">
                  <div className="text-lg font-bold text-destructive">{data.oxygenSummary.critical}</div>
                  <div className="text-xs text-destructive">Críticos</div>
                </div>
              </div>
              {data.oxygenSummary.lowTanks.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Tanques bajos/críticos</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {data.oxygenSummary.lowTanks.slice(0, 5).map((tank) => (
                      <div key={tank.id} className="flex items-center justify-between text-xs">
                        <span className="text-foreground/80">{tank.code}</span>
                        <span className={tank.status === 'CRITICAL' ? 'text-destructive font-medium' : 'text-amber-600 dark:text-amber-400'}>
                          {tank.level}% · {tank.location}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState title="Sin datos de oxígeno" />
          )}
        </DashboardSection>

        {/* Quick Stats Summary */}
        <DashboardSection title="Resumen de operaciones" loading={isLoading}>
          {metrics ? (
            <div className="space-y-3">
              <SummaryRow label="Empleados activos" value={metrics.activeEmployees} icon={<Users className="w-3.5 h-3.5" />} />
              <SummaryRow label="Camilleros disponibles" value={metrics.availableTransporters} icon={<UserCheck className="w-3.5 h-3.5" />} />
              <SummaryRow label="Camilleros ocupados" value={metrics.busyTransporters} icon={<UserX className="w-3.5 h-3.5" />} />
              <SummaryRow label="Turnos pendientes" value={metrics.pendingShifts} icon={<Clock className="w-3.5 h-3.5" />} />
              <SummaryRow label="Entregas pendientes" value={metrics.pendingHandoffs} icon={<ClipboardList className="w-3.5 h-3.5" />} />
              {metrics.currentShiftType && (
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Periodo actual</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{SHIFT_TYPE_LABELS[metrics.currentShiftType] ?? metrics.currentShiftType}</span>
                </div>
              )}
              <SummaryRow label="Incidentes de hoy" value={metrics.incidentsToday} icon={<AlertCircle className="w-3.5 h-3.5" />} />
              <SummaryRow label="Comentarios importantes" value={metrics.importantComments} icon={<MessageSquare className="w-3.5 h-3.5" />} />
            </div>
          ) : (
            <EmptyState title="Sin datos" />
          )}
        </DashboardSection>
      </div>

      {/* Pending Handoffs */}
      {data?.pendingHandoffList && data.pendingHandoffList.length > 0 && (
        <div className="mt-6">
          <DashboardSection
            title="Entregas pendientes"
            subtitle={`${data.pendingHandoffList.length} ${data.pendingHandoffList.length > 1 ? 'turnos requieren entrega' : 'turno requiere entrega'}`}
            loading={isLoading}
          >
            <div className="space-y-2">
              {data.pendingHandoffList.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <div>
                      <span className="text-sm font-medium text-foreground">{s.shiftCode}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {s.user?.firstName} {s.user?.lastName}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/shifts/handoff?shiftId=${s.id}`)}
                    className="px-3 py-1 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    Completar entrega
                  </button>
                </div>
              ))}
            </div>
          </DashboardSection>
        </div>
      )}

      {/* Current Shift Info */}
      {data?.currentShiftInfo && data.currentShiftInfo.length > 0 && (
        <div className="mt-6">
          <DashboardSection
            title="Turnos activos"
            subtitle={`${data.currentShiftInfo.length} ${data.currentShiftInfo.length > 1 ? 'turnos activos' : 'turno activo'}`}
            loading={isLoading}
          >
            <div className="space-y-2">
              {data.currentShiftInfo.map((s: any) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20 cursor-pointer hover:bg-primary/15 transition-colors"
                  onClick={() => router.push(`/shifts/${s.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-primary" />
                    <div>
                      <span className="text-sm font-medium text-foreground">{s.shiftCode}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {s.user?.firstName} {s.user?.lastName}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{SHIFT_TYPE_LABELS[s.type] ?? s.type}</span>
                </div>
              ))}
            </div>
          </DashboardSection>
        </div>
      )}

      {/* Security Overview */}
      <div className="mt-6">
        <DashboardSection title="Resumen de seguridad" subtitle="Actividad reciente de seguridad">
          {securityIncidents?.length === 0 || !securityIncidents ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <ShieldAlert className="w-8 h-8 mx-auto mb-2" />
              Sin incidentes de seguridad hoy
            </div>
          ) : (
            <div className="space-y-2">
              {securityIncidents.slice(0, 5).map((inc: any) => (
                <div key={inc.id} className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">
                  <div className={`p-1.5 rounded-lg ${
                    inc.severity === 'CRITICAL' ? 'bg-destructive/10' : inc.severity === 'HIGH' ? 'bg-orange-500/10' : 'bg-amber-500/10'
                  }`}>
                    <ShieldAlert className={`w-4 h-4 ${
                      inc.severity === 'CRITICAL' ? 'text-destructive' : inc.severity === 'HIGH' ? 'text-orange-600 dark:text-orange-400' : 'text-amber-600 dark:text-amber-400'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{inc.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {inc.type?.replace(/_/g, ' ')} · {dayjs(inc.createdAt).fromNow()}
                      {inc.user && ` · ${inc.user.firstName} ${inc.user.lastName}`}
                    </p>
                  </div>
                  {inc.severity === 'CRITICAL' && !inc.resolvedAt && (
                    <button
                      onClick={() => router.push('/security-incidents')}
                      className="text-xs text-destructive hover:text-destructive/80 font-medium flex-shrink-0"
                    >
                      Ver
                    </button>
                  )}
                </div>
              ))}
              {(metrics?.incidentsToday ?? 0) > 5 && (
                <button
                  onClick={() => router.push('/security-incidents')}
                  className="w-full text-center text-xs text-primary hover:text-primary/80 py-2"
                >
                  Ver los {metrics?.incidentsToday ?? 0} incidentes
                </button>
              )}
            </div>
          )}
        </DashboardSection>
      </div>

      {/* Recent Activity */}
      <div className="mt-6">
        <DashboardSection
          title="Actividad reciente"
          subtitle="Últimos cambios de estado, asignaciones y comentarios"
          loading={isLoading}
        >
          {data?.recentActivity && data.recentActivity.length > 0 ? (
            <div className="space-y-0 -mx-6">
              {data.recentActivity.slice(0, 10).map((event, i) => (
                <div key={`${event.timestamp}-${i}`} className="flex items-start gap-3 px-6 py-3 border-b border-border last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    event.type === 'status_change' ? 'bg-primary' :
                    event.type === 'assignment' ? 'bg-emerald-500' :
                    'bg-amber-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{event.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {event.actor?.firstName} {event.actor?.lastName}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">·</span>
                      <span className="text-[10px] text-muted-foreground">
                        {dayjs(event.timestamp).fromNow()}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded font-medium ${
                    event.type === 'status_change' ? 'bg-primary/10 text-primary' :
                    event.type === 'assignment' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                    'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}>
                    {event.type === 'status_change' ? 'cambio de estado' : event.type === 'assignment' ? 'asignación' : event.type.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Sin actividad reciente" description="Aquí aparecerá la actividad conforme se creen y actualicen los traslados." />
          )}
        </DashboardSection>
      </div>
    </AppShell>
  );
}

function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SummaryRow({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function AuditorDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-metrics', 'today'],
    queryFn: () => dashboardApi.getMetrics({ timeRange: 'today' }),
    refetchInterval: 60000,
  });

  return (
    <AppShell>
      <h1 className="text-xl font-bold text-foreground mb-6">Tablero de auditoría</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <MetricCard label="Traslados de hoy" value={data?.metrics?.totalToday ?? 0} icon={ArrowRightLeft} color="blue" loading={isLoading} />
        <MetricCard label="Cumplimiento de SLA" value={data?.metrics ? `${data.metrics.slaCompliance}%` : '—'} icon={Gauge} color="purple" loading={isLoading} />
        <MetricCard label="Incidentes de hoy" value={data?.metrics?.incidentsToday ?? 0} icon={ShieldAlert} color="red" loading={isLoading} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricCard label="Tiempo prom. de respuesta" value={data?.metrics?.averageResponseTime ? `${data.metrics.averageResponseTime}m` : '—'} icon={Timer} color="indigo" loading={isLoading} />
        <MetricCard label="Tiempo prom. de finalización" value={data?.metrics?.averageCompletionTime ? `${data.metrics.averageCompletionTime}m` : '—'} icon={TrendingUp} color="emerald" loading={isLoading} />
      </div>
    </AppShell>
  );
}

function TransporterDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['transporter-dashboard'],
    queryFn: () => dashboardApi.getActiveTransfers(),
    refetchInterval: 15000,
  });

  const router = useRouter();

  return (
    <AppShell>
      <h1 className="text-xl font-bold text-foreground mb-2">Mis traslados</h1>
      <p className="text-sm text-muted-foreground mb-6">Traslados activos asignados a ti</p>

      <DashboardSection title="Asignaciones activas" loading={isLoading}>
        {data && data.length > 0 ? (
          <div className="space-y-3">
            {data.filter(t => t.assignedTransporterName).map((t) => (
              <button
                key={t.id}
                onClick={() => router.push(`/transfers/${t.id}`)}
                className="w-full text-left p-4 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">{t.patientName}</span>
                  <StatusBadge status={t.status} />
                </div>
                <div className="text-xs text-muted-foreground">{ZONE_LABELS[t.origin] ?? t.origin} → {ZONE_LABELS[t.destination] ?? t.destination}</div>
                <div className="flex items-center gap-2 mt-2">
                  <PriorityBadge priority={t.priority} />
                  <span className="text-xs text-muted-foreground">{t.elapsedMinutes}m transcurridos</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Sin traslados activos"
            description="Por ahora no tienes traslados asignados."
            icon={<Ambulance className="w-12 h-12" />}
          />
        )}
      </DashboardSection>
    </AppShell>
  );
}
