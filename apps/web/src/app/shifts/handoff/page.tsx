'use client';

import { AppShell } from '@/components/app-shell';
import { shiftsApi } from '@/services/shifts';
import { api } from '@/lib/api';
import { usePermissions } from '@/lib/permissions';
import { useAuth } from '@/lib/auth-provider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');
import { ClipboardList, AlertTriangle, Send, CheckCircle2, User, FileText } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/i18n';

export default function HandoffPage() {
  return (
    <Suspense fallback={<AppShell><div className="text-center py-12 text-muted-foreground">Cargando…</div></AppShell>}>
      <HandoffContent />
    </Suspense>
  );
}

function HandoffContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const { user } = useAuth();
  const preselectedShiftId = searchParams.get('shiftId');
  const canHandoff = can('MANAGE_HANDOFF');

  const [formData, setFormData] = useState({
    shiftId: preselectedShiftId || '',
    completedServices: '',
    pendingServices: '',
    patientsInTransfer: '',
    incompleteStudies: '',
    incidents: '',
    lowOxygenTanks: '',
    observations: '',
    receivedById: '',
  });

  const { data: pendingShifts } = useQuery({
    queryKey: ['pending-handoff-shifts'],
    queryFn: () => shiftsApi.getPendingHandoffShifts(),
    enabled: canHandoff,
  });

  const { data: availableUsers } = useQuery({
    queryKey: ['available-users-handoff'],
    queryFn: () => api.get<any[]>('/users'),
  });

  const { data: handoffList } = useQuery({
    queryKey: ['handoffs-list'],
    queryFn: () => shiftsApi.getAllHandoffs(1, 10),
    enabled: canHandoff,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      // shiftId travels in the URL; the DTO rejects it in the body.
      const { shiftId, ...body } = data;
      return shiftsApi.createHandoff(shiftId, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-handoff-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['handoffs-list'] });
      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
      queryClient.invalidateQueries({ queryKey: ['full-dashboard'] });
      setFormData({
        shiftId: '', completedServices: '', pendingServices: '',
        patientsInTransfer: '', incompleteStudies: '', incidents: '',
        lowOxygenTanks: '', observations: '', receivedById: '',
      });
      toast.success('Entrega creada');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.shiftId || formData.shiftId === 'undefined') {
      toast.error('Selecciona un turno');
      return;
    }
    if (!formData.receivedById || formData.receivedById === 'undefined') {
      toast.error('Selecciona al empleado que recibe');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <AppShell>
      <button onClick={() => router.push('/shifts')} className="text-sm text-primary hover:text-primary/80 mb-4 inline-block">
        ← Volver a turnos
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Entrega de turno</h1>
        <p className="text-sm text-muted-foreground mt-1">Completa la documentación de entrega de turno</p>
      </div>

      {canHandoff && (!pendingShifts || pendingShifts.length === 0) && !preselectedShiftId && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                No hay turnos pendientes de entrega
              </h3>
              <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-1">
                Para crear una entrega, primero finaliza un turno desde la página de turnos.
              </p>
              <button
                onClick={() => router.push('/shifts')}
                className="mt-3 px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                Ir a turnos
              </button>
            </div>
          </div>
        </div>
      )}

      {canHandoff ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-lg font-semibold text-foreground mb-4">Crear entrega</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Turno</label>
                    <select
                      value={formData.shiftId}
                      onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                      required
                    >
                      <option value="">Selecciona un turno…</option>
                      {pendingShifts?.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.shiftCode} — {s.user?.firstName} {s.user?.lastName}
                        </option>
                      ))}
                    </select>
                    {(!pendingShifts || pendingShifts.length === 0) && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">No hay turnos pendientes de entrega</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Recibe</label>
                    <select
                      value={formData.receivedById}
                      onChange={(e) => setFormData({ ...formData, receivedById: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                      required
                    >
                      <option value="">Selecciona empleado…</option>
                      {Array.isArray(availableUsers)
                        ? availableUsers.map((u: any) => (
                            <option key={u.id} value={u.id}>
                              {u.firstName} {u.lastName} ({u.role ? (ROLE_LABELS[u.role] ?? u.role.replace(/_/g, ' ')) : ''})
                            </option>
                          ))
                        : null}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Servicios completados</label>
                  <textarea
                    value={formData.completedServices}
                    onChange={(e) => setFormData({ ...formData, completedServices: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                    rows={2}
                    placeholder="Lista los servicios completados durante el turno…"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Servicios pendientes</label>
                  <textarea
                    value={formData.pendingServices}
                    onChange={(e) => setFormData({ ...formData, pendingServices: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                    rows={2}
                    placeholder="Lista los servicios pendientes de seguimiento…"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Pacientes en traslado</label>
                    <textarea
                      value={formData.patientsInTransfer}
                      onChange={(e) => setFormData({ ...formData, patientsInTransfer: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                      rows={2}
                      placeholder="Pacientes actualmente en traslado…"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Estudios incompletos</label>
                    <textarea
                      value={formData.incompleteStudies}
                      onChange={(e) => setFormData({ ...formData, incompleteStudies: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                      rows={2}
                      placeholder="Estudios de imagen o laboratorio incompletos…"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Incidentes</label>
                  <textarea
                    value={formData.incidents}
                    onChange={(e) => setFormData({ ...formData, incidents: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                    rows={2}
                    placeholder="Incidentes que ocurrieron…"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Tanques de oxígeno bajos</label>
                  <textarea
                    value={formData.lowOxygenTanks}
                    onChange={(e) => setFormData({ ...formData, lowOxygenTanks: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                    rows={2}
                    placeholder="Tanques de oxígeno con nivel bajo que requieren atención…"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Observaciones del turno</label>
                  <textarea
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                    rows={3}
                    placeholder="Observaciones generales y notas para el siguiente turno…"
                  />
                </div>

                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {createMutation.isPending ? 'Creando entrega…' : 'Enviar entrega'}
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-lg font-semibold text-foreground mb-3">Entregas recientes</h2>
              {handoffList?.data && handoffList.data.length > 0 ? (
                <div className="space-y-2">
                  {handoffList.data.map((h: any) => (
                    <div
                      key={h.id}
                      className="p-3 bg-muted rounded-lg cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => router.push(`/shifts/handoff?shiftId=${h.shiftId}`)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{h.shift?.shiftCode}</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {h.handedOffBy?.firstName} → {h.receivedBy?.firstName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {dayjs(h.handoffAt).format('D MMM HH:mm')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Aún no hay entregas</p>
              )}
            </div>

            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-lg font-semibold text-foreground mb-3">Resumen de entrega</h2>
              <p className="text-xs text-muted-foreground mb-3">
                La entrega documenta la transferencia de responsabilidad entre turnos. Incluye toda la información relevante para la continuidad de la atención.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500 dark:text-emerald-400" /> Servicios completados</li>
                <li className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500 dark:text-amber-400" /> Servicios pendientes</li>
                <li className="flex items-center gap-1"><User className="w-3 h-3 text-primary" /> Pacientes en traslado</li>
                <li className="flex items-center gap-1"><FileText className="w-3 h-3 text-purple-500 dark:text-purple-400" /> Estudios incompletos</li>
                <li className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-destructive" /> Incidentes y oxígeno</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground/60 mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Acceso requerido</h2>
          <p className="text-sm text-muted-foreground">Necesitas el permiso MANAGE_HANDOFF para acceder a esta página.</p>
        </div>
      )}
    </AppShell>
  );
}
