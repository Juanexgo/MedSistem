'use client';

import { AppShell } from '@/components/app-shell';
import { shiftsApi } from '@/services/shifts';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');
import { Clock, User, Calendar, ClipboardList, AlertTriangle } from 'lucide-react';
import { SHIFT_TYPE_LABELS, ROLE_LABELS } from '@/lib/i18n';

export default function ShiftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: shift, isLoading, error } = useQuery({
    queryKey: ['shift', id],
    queryFn: () => shiftsApi.getShiftById(id),
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-48 bg-muted rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (error || !shift) {
    return (
      <AppShell>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive/70 mb-3" />
          <p className="text-muted-foreground">Turno no encontrado</p>
          <button onClick={() => router.push('/shifts')} className="mt-4 text-sm text-primary hover:text-primary/80">
            ← Volver a turnos
          </button>
        </div>
      </AppShell>
    );
  }

  const duration = shift.endedAt
    ? Math.round((new Date(shift.endedAt).getTime() - new Date(shift.startedAt).getTime()) / 3600000)
    : Math.round((Date.now() - new Date(shift.startedAt).getTime()) / 3600000);

  return (
    <AppShell>
      <button onClick={() => router.push('/shifts')} className="text-sm text-primary hover:text-primary/80 mb-4 inline-block">
        ← Volver a turnos
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-foreground">{shift.shiftCode}</h1>
                <p className="text-sm text-muted-foreground mt-1">Turno {SHIFT_TYPE_LABELS[shift.type] ?? shift.type}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                shift.isActive ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-foreground/80'
              }`}>
                {shift.isActive ? 'Activo' : 'Finalizado'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <User className="w-4 h-4" />
                  <span className="text-xs">Empleado</span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {shift.user?.firstName} {shift.user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{shift.user?.role ? (ROLE_LABELS[shift.user.role] ?? shift.user.role.replace(/_/g, ' ')) : ''}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">Duración</span>
                </div>
                <p className="text-sm font-medium text-foreground">{duration}h</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">Iniciado</span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {dayjs(shift.startedAt).format('D MMM YYYY HH:mm')}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">Finalizado</span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {shift.endedAt ? dayjs(shift.endedAt).format('D MMM YYYY HH:mm') : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {shift.handoff ? (
            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Entrega</h2>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Entregado por</span>
                  <p className="font-medium text-foreground">
                    {shift.handoff.handedOffBy?.firstName} {shift.handoff.handedOffBy?.lastName}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Recibido por</span>
                  <p className="font-medium text-foreground">
                    {shift.handoff.receivedBy?.firstName} {shift.handoff.receivedBy?.lastName}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Fecha y hora</span>
                  <p className="font-medium text-foreground">
                    {dayjs(shift.handoff.handoffAt).format('D MMM YYYY HH:mm')}
                  </p>
                </div>
                {shift.handoff.completedServices && (
                  <div>
                    <span className="text-xs text-muted-foreground">Servicios completados</span>
                    <p className="text-foreground/80 mt-0.5">{shift.handoff.completedServices}</p>
                  </div>
                )}
                {shift.handoff.pendingServices && (
                  <div>
                    <span className="text-xs text-muted-foreground">Servicios pendientes</span>
                    <p className="text-amber-700 dark:text-amber-300 mt-0.5">{shift.handoff.pendingServices}</p>
                  </div>
                )}
                {shift.handoff.patientsInTransfer && (
                  <div>
                    <span className="text-xs text-muted-foreground">Pacientes en traslado</span>
                    <p className="text-foreground/80 mt-0.5">{shift.handoff.patientsInTransfer}</p>
                  </div>
                )}
                {shift.handoff.incompleteStudies && (
                  <div>
                    <span className="text-xs text-muted-foreground">Estudios incompletos</span>
                    <p className="text-foreground/80 mt-0.5">{shift.handoff.incompleteStudies}</p>
                  </div>
                )}
                {shift.handoff.incidents && (
                  <div>
                    <span className="text-xs text-muted-foreground">Incidentes</span>
                    <p className="text-destructive mt-0.5">{shift.handoff.incidents}</p>
                  </div>
                )}
                {shift.handoff.lowOxygenTanks && (
                  <div>
                    <span className="text-xs text-muted-foreground">Tanques de oxígeno bajos</span>
                    <p className="text-amber-700 dark:text-amber-300 mt-0.5">{shift.handoff.lowOxygenTanks}</p>
                  </div>
                )}
                {shift.handoff.observations && (
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="text-xs text-muted-foreground">Observaciones</span>
                    <p className="text-foreground/80 mt-0.5 text-sm">{shift.handoff.observations}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="text-center py-6">
                <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/60 mb-3" />
                <p className="text-sm text-muted-foreground">Sin entrega creada</p>
                {!shift.isActive && (
                  <button
                    onClick={() => router.push(`/shifts/handoff?shiftId=${shift.id}`)}
                    className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
                  >
                    Crear entrega
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
