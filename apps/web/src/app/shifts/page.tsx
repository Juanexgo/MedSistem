'use client';

import { AppShell } from '@/components/app-shell';
import { usePermissions } from '@/lib/permissions';
import { shiftsApi } from '@/services/shifts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');
import { Clock, PlayCircle, StopCircle, AlertTriangle, ClipboardList } from 'lucide-react';
import { SHIFT_TYPE_LABELS } from '@/lib/i18n';

export default function ShiftsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [showStartShift, setShowStartShift] = useState(false);
  const [shiftType, setShiftType] = useState('MORNING');

  const canManage = can('MANAGE_SHIFTS');
  const canHandoff = can('MANAGE_HANDOFF');

  const { data: currentShift, isLoading: loadingCurrent } = useQuery({
    queryKey: ['current-shift'],
    queryFn: () => shiftsApi.getCurrentShift(),
  });

  const { data: currentType } = useQuery({
    queryKey: ['current-shift-type'],
    queryFn: () => shiftsApi.getCurrentShiftType(),
  });

  const { data: activeShifts, isLoading: loadingActive } = useQuery({
    queryKey: ['active-shifts'],
    queryFn: () => shiftsApi.getActiveShifts(),
    enabled: canManage,
  });

  const { data: pendingHandoffs } = useQuery({
    queryKey: ['pending-handoffs'],
    queryFn: () => shiftsApi.getPendingHandoffShifts(),
    enabled: canHandoff,
  });

  const startMutation = useMutation({
    mutationFn: () => shiftsApi.startShift(shiftType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
      queryClient.invalidateQueries({ queryKey: ['active-shifts'] });
      setShowStartShift(false);
      toast.success('Turno iniciado');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const endMutation = useMutation({
    mutationFn: (shiftId: string) => {
      if (!shiftId || shiftId === 'undefined') {
        throw new Error('No hay turno activo para finalizar');
      }
      return shiftsApi.endShift(shiftId);
    },
    onSuccess: (_data, shiftId) => {
      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
      queryClient.invalidateQueries({ queryKey: ['active-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['pending-handoffs'] });
      queryClient.invalidateQueries({ queryKey: ['pending-handoff-shifts'] });
      toast.success('Turno finalizado. Continúa con la entrega.');
      router.push(`/shifts/handoff?shiftId=${shiftId}`);
    },
    onError: (err: any) => toast.error(err?.message || 'No se pudo finalizar el turno'),
  });

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de turnos</h1>
          <p className="text-sm text-muted-foreground mt-1">Administra los turnos de trabajo y las entregas</p>
        </div>
        <div className="flex gap-2">
          {canHandoff && (
            <button
              onClick={() => router.push('/shifts/handoff')}
              className="px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-accent transition-colors flex items-center gap-2"
            >
              <ClipboardList className="w-4 h-4" /> Entrega
            </button>
          )}
          {canManage && !currentShift && (
            <button
              onClick={() => setShowStartShift(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              <PlayCircle className="w-4 h-4" /> Iniciar turno
            </button>
          )}
        </div>
      </div>

      {pendingHandoffs && pendingHandoffs.length > 0 && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">{pendingHandoffs.length} {pendingHandoffs.length > 1 ? 'turnos pendientes de entrega' : 'turno pendiente de entrega'}</span>
          </div>
          <div className="space-y-2">
            {pendingHandoffs.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-2 bg-card rounded-lg border border-amber-500/20">
                <div className="text-sm">
                  <span className="font-medium text-foreground">{s.shiftCode}</span>
                  <span className="text-muted-foreground ml-2">por {s.user?.firstName} {s.user?.lastName}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{dayjs(s.endedAt).format('HH:mm')}</span>
                </div>
                <button
                  onClick={() => router.push(`/shifts/handoff?shiftId=${s.id}`)}
                  className="px-3 py-1 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  Completar entrega
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl p-6 border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Turno actual</h2>
            {currentShift ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-foreground">{currentShift.shiftCode}</span>
                    </div>
                    <p className="text-sm text-primary mt-1">
                      Iniciado {dayjs(currentShift.startedAt).format('D MMM YYYY HH:mm')}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">
                    Activo
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push('/shifts/current')}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
                  >
                    Ver detalles
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('¿Finalizar el turno actual? Se requerirá una entrega.')) {
                        endMutation.mutate(currentShift.id);
                      }
                    }}
                    disabled={endMutation.isPending}
                    className="px-4 py-2 border border-destructive/40 text-destructive rounded-lg text-sm hover:bg-destructive/10 transition-colors flex items-center gap-2"
                  >
                    <StopCircle className="w-4 h-4" /> Finalizar turno
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-2" />
                <p className="text-sm">Sin turno activo</p>
                <p className="text-xs mt-1">Inicia un turno para comenzar a registrar</p>
              </div>
            )}
          </div>

          {canManage && (
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-lg font-semibold text-foreground mb-4">Turnos activos</h2>
              {loadingActive ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2].map(i => <div key={i} className="h-12 bg-muted rounded" />)}
                </div>
              ) : activeShifts && activeShifts.length > 0 ? (
                <div className="space-y-2">
                  {activeShifts.map((s: any) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => router.push(`/shifts/${s.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <div>
                          <span className="text-sm font-medium text-foreground">{s.shiftCode}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {s.user?.firstName} {s.user?.lastName}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {dayjs(s.startedAt).format('HH:mm')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Sin turnos activos</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-xl p-6 border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-3">Periodo actual</h2>
            {currentType ? (
              <div>
                <div className="text-2xl font-bold text-foreground">{SHIFT_TYPE_LABELS[currentType.type] ?? currentType.type}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentType.startTime} — {currentType.endTime}
                </p>
              </div>
            ) : (
              <div className="animate-pulse h-8 bg-muted rounded" />
            )}
          </div>

          <div className="bg-card rounded-xl p-6 border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-3">Acciones rápidas</h2>
            <div className="space-y-2">
              <button
                onClick={() => router.push('/shifts/current')}
                className="w-full text-left px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-accent transition-colors"
              >
                {currentShift ? 'Ver turno actual' : 'Sin turno activo'}
              </button>
              <button
                onClick={() => router.push('/shifts/history')}
                className="w-full text-left px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-accent transition-colors"
              >
                Historial de turnos
              </button>
              {canHandoff && (
                <button
                  onClick={() => router.push('/shifts/handoff')}
                  className="w-full text-left px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-accent transition-colors"
                >
                  Centro de entregas
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showStartShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-xl p-6 w-full max-w-md mx-4 shadow-xl border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Iniciar nuevo turno</h3>
            <div className="space-y-3 mb-4">
              <label className="block text-sm font-medium text-foreground">Tipo de turno</label>
              <div className="grid grid-cols-3 gap-2">
                {['MORNING', 'EVENING', 'NIGHT'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setShiftType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      shiftType === type
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border text-foreground hover:bg-accent'
                    }`}
                  >
                    {SHIFT_TYPE_LABELS[type] ?? type}
                  </button>
                ))}
              </div>
              {currentType && (
                <p className="text-xs text-muted-foreground">
                  Recomendado: {SHIFT_TYPE_LABELS[currentType.type] ?? currentType.type} ({currentType.startTime} - {currentType.endTime})
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {startMutation.isPending ? 'Iniciando…' : 'Iniciar turno'}
              </button>
              <button
                onClick={() => setShowStartShift(false)}
                className="px-4 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
