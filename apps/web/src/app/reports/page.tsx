'use client';

import { useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { usePermissions } from '@/lib/permissions';
import { reportsApi } from '@/services/reports';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');
import {
  Download,
  Loader2,
  ArrowRightLeft,
  ScrollText,
  Wind,
  Clock,
  ShieldAlert,
  Gauge,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const reportCards = [
  {
    id: 'transfers',
    title: 'Traslados diarios',
    description: 'Exporta todas las solicitudes de traslado con datos del paciente, asignaciones e historial de estado.',
    icon: ArrowRightLeft,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
    endpoint: 'transfers',
  },
  {
    id: 'audit',
    title: 'Registros de auditoría',
    description: 'Exporta la auditoría del sistema con acciones, usuarios, direcciones IP y marcas de tiempo.',
    icon: ScrollText,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    endpoint: 'audit-logs',
  },
  {
    id: 'oxygen',
    title: 'Uso de oxígeno',
    description: 'Consulta el inventario, historial de uso y resumen de alertas de tanques de oxígeno.',
    icon: Wind,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    endpoint: null,
  },
  {
    id: 'shifts',
    title: 'Entregas de turno',
    description: 'Revisa los registros de entrega de turnos y los resúmenes pendientes.',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    endpoint: null,
  },
  {
    id: 'incidents',
    title: 'Incidentes',
    description: 'Exporta incidentes de seguridad y eventos de comunicación.',
    icon: ShieldAlert,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/20',
    endpoint: null,
  },
  {
    id: 'sla',
    title: 'Cumplimiento de SLA',
    description: 'Visualiza tasas de cumplimiento de SLA, tiempos de respuesta y métricas de finalización.',
    icon: Gauge,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
    endpoint: null,
  },
];

export default function ReportsPage() {
  const { can } = usePermissions();
  const [exporting, setExporting] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
    to: dayjs().format('YYYY-MM-DD'),
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = async (reportId: string, endpoint: string | null) => {
    if (!endpoint) {
      setMessage({ type: 'error', text: `Este reporte aún no está disponible para exportar como CSV. Consulta el tablero para ver los reportes visuales.` });
      return;
    }

    setExporting(reportId);
    setMessage(null);
    try {
      let data: any;
      if (endpoint === 'transfers') {
        data = await reportsApi.exportTransfers({ from: dateRange.from, to: dateRange.to });
      } else if (endpoint === 'audit-logs') {
        data = await reportsApi.exportAuditLogs({ from: dateRange.from, to: dateRange.to });
      }

      if (!data || (Array.isArray(data) && data.length === 0)) {
        setMessage({ type: 'error', text: 'No se encontraron datos para el rango seleccionado.' });
        return;
      }

      const rows = Array.isArray(data) ? data : [];
      let csv = '';
      if (endpoint === 'transfers') {
        csv = [
          'ID,Paciente,Origen,Destino,Prioridad,Estado,Camillero,Solicitado,Completado',
          ...rows.map((r: any) =>
            `"${r.id}","${r.patient?.fullName || ''}","${r.origin}","${r.destination}","${r.priority}","${r.status}","${r.assignedTransporter ? r.assignedTransporter.firstName + ' ' + r.assignedTransporter.lastName : ''}","${r.requestedAt}","${r.completedAt || ''}"`
          ),
        ].join('\n');
      } else if (endpoint === 'audit-logs') {
        csv = [
          'Acción,Entidad,ID Entidad,Usuario,Dirección IP,Comentario,Fecha',
          ...rows.map((r: any) =>
            `"${r.action}","${r.entity}","${r.entityId || ''}","${r.user ? r.user.firstName + ' ' + r.user.lastName : ''}","${r.ipAddress || ''}","${(r.comment || '').replace(/"/g, '""')}","${r.createdAt}"`
          ),
        ].join('\n');
      }

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${endpoint}-${dayjs().format('YYYY-MM-DD')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: `Reporte exportado correctamente.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'No se pudo exportar' });
    } finally {
      setExporting(null);
    }
  };

  if (!can('EXPORT_REPORTS')) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No tienes permiso para acceder a los reportes.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reportes y exportaciones</h1>
          <p className="text-sm text-muted-foreground mt-1">Genera y descarga reportes operativos</p>
        </div>

        {/* Date Range */}
        <div className="bg-card rounded-xl border border-border p-4">
          <label className="block text-sm font-medium text-foreground mb-2">Rango de fechas</label>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange((d) => ({ ...d, from: e.target.value }))}
              className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
            />
            <span className="text-muted-foreground">al</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange((d) => ({ ...d, to: e.target.value }))}
              className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
            />
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={cn(
            'px-4 py-3 rounded-lg text-sm',
            message.type === 'success' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20',
          )}>
            {message.text}
          </div>
        )}

        {/* Report Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportCards.map((card) => (
            <div
              key={card.id}
              className={cn(
                'bg-card rounded-xl border p-5 space-y-4 transition-all hover:shadow-md',
                card.borderColor,
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('p-2 rounded-lg', card.bgColor)}>
                  <card.icon className={cn('w-5 h-5', card.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{card.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                </div>
              </div>
              <button
                onClick={() => handleExport(card.id, card.endpoint)}
                disabled={exporting === card.id}
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors',
                  card.endpoint
                    ? 'text-primary border-primary/20 hover:bg-primary/10'
                    : 'text-muted-foreground border-border cursor-not-allowed',
                )}
              >
                {exporting === card.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {exporting === card.id ? 'Exportando…' : card.endpoint ? 'Descargar CSV' : 'Próximamente'}
              </button>
            </div>
          ))}
        </div>

        {/* Report Descriptions */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Reportes disponibles</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-foreground">Traslados diarios</span> — Registro completo de traslados con datos del paciente, origen/destino, prioridad, estado, asignación de camillero y marcas de tiempo.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-purple-500 dark:text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-foreground">Registros de auditoría</span> — Auditoría completa del sistema con todas las operaciones CRUD, inicios de sesión, asignaciones y exportaciones con seguimiento de usuario e IP.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-foreground">Reportes adicionales</span> — Uso de oxígeno, entregas de turno, incidentes y cumplimiento de SLA estarán disponibles próximamente. Por ahora consúltalos en el tablero.
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
