'use client';

import { AppShell } from '@/components/app-shell';
import { shiftsApi } from '@/services/shifts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');
import toast from 'react-hot-toast';
import { Clock, StopCircle } from 'lucide-react';
import { SHIFT_TYPE_LABELS } from '@/lib/i18n';

export default function CurrentShiftPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: shift, isLoading } = useQuery({
    queryKey: ['current-shift'],
    queryFn: () => shiftsApi.getCurrentShift(),
    refetchInterval: 15000,
  });

  const { data: currentType } = useQuery({
    queryKey: ['current-shift-type'],
    queryFn: () => shiftsApi.getCurrentShiftType(),
  });

  const endMutation = useMutation({
    mutationFn: () => {
      if (!shift?.id) throw new Error('No hay turno activo para finalizar');
      return shiftsApi.endShift(shift.id);
    },
    onSuccess: (data) => {
      const endedId = (data as any)?.id ?? shift?.id;
      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
      queryClient.invalidateQueries({ queryKey: ['active-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['pending-handoff-shifts'] });
      toast.success('Turno finalizado. Continúa con la entrega.');
      router.push(endedId ? `/shifts/handoff?shiftId=${endedId}` : '/shifts/handoff');
    },
    onError: (err: any) => toast.error(err?.message || 'No se pudo finalizar el turno'),
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-32 bg-muted rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!shift) {
    return (
      <AppShell>
        <button onClick={() => router.push('/shifts')} className="text-sm text-primary hover:text-primary/80 mb-4 inline-block">
          ← Volver a turnos
        </button>
        <div className="text-center py-16">
          <Clock className="w-16 h-16 mx-auto text-muted-foreground/60 mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Sin turno activo</h2>
          <p className="text-sm text-muted-foreground mb-6">Inicia un turno para comenzar a registrar tu periodo de trabajo.</p>
          <button
            onClick={() => router.push('/shifts')}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Ir a turnos
          </button>
        </div>
      </AppShell>
    );
  }

  const durationMinutes = Math.floor(
    (Date.now() - new Date(shift.startedAt).getTime()) / 60000,
  );
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  return (
    <AppShell>
      <button onClick={() => router.push('/shifts')} className="text-sm text-primary hover:text-primary/80 mb-4 inline-block">
        ← Volver a turnos
      </button>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-6 text-primary-foreground">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span className="text-lg font-semibold">{shift.shiftCode}</span>
            </div>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-200 rounded-full text-xs font-medium">
              Activo
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-primary-foreground/70 text-xs">Tipo</p>
              <p className="font-medium">{SHIFT_TYPE_LABELS[shift.type] ?? shift.type}</p>
            </div>
            <div>
              <p className="text-primary-foreground/70 text-xs">Duración</p>
              <p className="font-medium">{hours}h {minutes}m</p>
            </div>
            <div>
              <p className="text-primary-foreground/70 text-xs">Iniciado</p>
              <p className="font-medium">{dayjs(shift.startedAt).format('D MMM YYYY HH:mm')}</p>
            </div>
            <div>
              <p className="text-primary-foreground/70 text-xs">Periodo actual</p>
              <p className="font-medium">{currentType?.type ? (SHIFT_TYPE_LABELS[currentType.type] ?? currentType.type) : '—'}</p>
            </div>
          </div>
        </div>

        {shift.handoff ? (
          <div className="bg-card rounded-xl p-6 border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-3">Entrega completada</h2>
            <p className="text-sm text-muted-foreground mb-3">
              La entrega se realizó el {dayjs(shift.handoff.handoffAt).format('D MMM YYYY HH:mm')}
            </p>
            <button
              onClick={() => router.push(`/shifts/handoff?shiftId=${shift.id}`)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
            >
              Ver entrega
            </button>
          </div>
        ) : (
          <div className="bg-card rounded-xl p-6 border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-3">Acciones del turno</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Finaliza este turno para crear una entrega para el siguiente compañero.
            </p>
            <button
              onClick={() => {
                if (confirm('¿Finalizar el turno actual? Tendrás que crear una entrega.')) {
                  endMutation.mutate();
                }
              }}
              disabled={endMutation.isPending}
              className="px-6 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <StopCircle className="w-4 h-4" />
              {endMutation.isPending ? 'Finalizando…' : 'Finalizar turno'}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
