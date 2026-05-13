'use client';

import { AppShell } from '@/components/app-shell';
import { StatusBadge, getNextValidStatuses } from '@/components/status-badge';
import { PriorityBadge } from '@/components/priority-badge';
import { Timeline } from '@/components/timeline';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { usePermissions } from '@/lib/permissions';
import { useState } from 'react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');
import { ArrowRightLeft, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ZONE_LABELS,
  TRANSFER_STATUS_LABELS,
  TRANSPORT_TYPE_LABELS,
  OXYGEN_STATUS_LABELS,
  EMPLOYEE_STATUS_LABELS,
} from '@/lib/i18n';

export default function TransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [statusComment, setStatusComment] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);

  const { data: transfer, isLoading, error } = useQuery({
    queryKey: ['transfer', id],
    queryFn: () => api.get<any>(`/transfers/${id}`),
  });

  const assignMutation = useMutation({
    mutationFn: async ({ transporterId }: { transporterId: string }) => {
      await api.post(`/assignments/${id}/assign/${transporterId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer', id] });
      toast.success('Camillero asignado');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ status, comment }: { status: string; comment?: string }) => {
      const body: any = { status };
      if (comment) body.comment = comment;
      return api.put(`/transfers/${id}/status`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer', id] });
      setStatusComment('');
      toast.success('Estado actualizado');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async (reason: string) => {
      await api.post(`/transfers/${id}/cancel`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer', id] });
      setShowCancel(false);
      setCancelReason('');
      toast.success('Traslado cancelado');
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) return <AppShell><div className="text-center py-12 text-muted-foreground">Cargando…</div></AppShell>;
  if (error) return <AppShell><div className="text-center py-12 text-destructive">Traslado no encontrado</div></AppShell>;
  if (!transfer) return null;

  const nextStatuses = transfer.nextStatuses || getNextValidStatuses(transfer.status);

  return (
    <AppShell>
      <button onClick={() => router.push('/transfers')} className="text-sm text-primary hover:text-primary/80 mb-4 inline-block">
        ← Volver a traslados
      </button>

      {/* Route Tracking */}
      <div className="bg-card rounded-xl border border-border p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Seguimiento de ruta</h2>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {transfer.elapsedMinutes ? `${transfer.elapsedMinutes} min transcurridos` : 'Recién iniciado'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Origin */}
          <div className="flex-1 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="text-[10px] text-primary font-medium uppercase tracking-wider">Origen</div>
            <div className="text-sm font-medium text-foreground mt-1">{ZONE_LABELS[transfer.origin] ?? transfer.origin}</div>
            <div className="text-xs text-muted-foreground">Cama {transfer.bedNumber} · Piso {transfer.floor}</div>
          </div>

          {/* Path Visualization */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <div className="w-16 h-0.5 bg-primary/30 relative">
              <div className="absolute inset-0 bg-primary" style={{ width: `${transfer.status === 'COMPLETED' ? 100 : transfer.status === 'IN_TRANSFER' || transfer.status === 'ARRIVED' ? 75 : transfer.status === 'ON_THE_WAY' || transfer.status === 'PATIENT_PICKED_UP' ? 50 : transfer.status === 'ASSIGNED' ? 25 : 0}%` }} />
            </div>
            <div className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center',
              transfer.status === 'COMPLETED' || transfer.status === 'ARRIVED' || transfer.status === 'IN_TRANSFER'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground',
            )}>
              <ArrowRightLeft className="w-3 h-3" />
            </div>
            <div className="w-16 h-0.5 bg-primary/30" />
            <div className="w-2 h-2 rounded-full bg-primary" />
          </div>

          {/* Destination */}
          <div className="flex-1 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider">Destino</div>
            <div className="text-sm font-medium text-foreground mt-1">{ZONE_LABELS[transfer.destination] ?? transfer.destination}</div>
            {transfer.requestedStudy && (
              <div className="text-xs text-muted-foreground">{transfer.requestedStudy}</div>
            )}
          </div>
        </div>

        {/* Transporter Info */}
        {transfer.assignedTransporter && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>Camillero: {transfer.assignedTransporter.firstName} {transfer.assignedTransporter.lastName}</span>
            <span className="text-muted-foreground/60">|</span>
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-medium',
              transfer.status === 'IN_TRANSFER' || transfer.status === 'ON_THE_WAY' || transfer.status === 'PATIENT_PICKED_UP'
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : 'bg-muted text-foreground/80',
            )}>
              {transfer.status === 'COMPLETED' ? 'Completado' : transfer.status === 'CANCELLED' ? 'Cancelado' : 'En curso'}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-foreground">{transfer.patient?.fullName}</h1>
                <p className="text-sm text-muted-foreground">Cama {transfer.bedNumber} · Piso {transfer.floor}</p>
              </div>
              <div className="flex gap-2">
                <StatusBadge status={transfer.status} />
                <PriorityBadge priority={transfer.priority} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Origen:</span>
                <p className="font-medium text-foreground">{ZONE_LABELS[transfer.origin] ?? transfer.origin}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Destino:</span>
                <p className="font-medium text-foreground">{ZONE_LABELS[transfer.destination] ?? transfer.destination}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Tipo de transporte:</span>
                <p className="font-medium text-foreground">{TRANSPORT_TYPE_LABELS[transfer.transportType] ?? transfer.transportType}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Estudio solicitado:</span>
                <p className="font-medium text-foreground">{transfer.requestedStudy || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Autorizado por:</span>
                <p className="font-medium text-foreground">
                  {transfer.authorizingUser?.firstName} {transfer.authorizingUser?.lastName}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Solicitado:</span>
                <p className="font-medium text-foreground">{dayjs(transfer.requestedAt).format('D MMM YYYY HH:mm')}</p>
              </div>
            </div>

            {transfer.notes && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <span className="text-xs text-muted-foreground font-medium">Notas</span>
                <p className="text-sm text-foreground/80 mt-1">{transfer.notes}</p>
              </div>
            )}
          </div>

          {transfer.requiresOxygen && (
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-lg font-semibold text-foreground mb-3">Soporte de oxígeno</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Tanque:</span> <span className="font-medium text-foreground">{transfer.assignedTank?.code || '—'}</span></div>
                <div><span className="text-muted-foreground">Estado del tanque:</span>
                  <span className={`ml-1 px-2 py-0.5 rounded text-xs font-medium ${
                    transfer.assignedTank?.status === 'FULL' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' :
                    transfer.assignedTank?.status === 'MEDIUM' ? 'bg-primary/15 text-primary' :
                    transfer.assignedTank?.status === 'LOW' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' :
                    transfer.assignedTank?.status === 'CRITICAL' ? 'bg-destructive/15 text-destructive' : ''
                  }`}>
                    {transfer.assignedTank?.status ? (OXYGEN_STATUS_LABELS[transfer.assignedTank.status] ?? transfer.assignedTank.status) : '—'}
                  </span>
                </div>
                <div><span className="text-muted-foreground">Nivel:</span> <span className="font-medium text-foreground">{transfer.tankLevel ?? '—'}%</span></div>
                <div><span className="text-muted-foreground">Litros/min:</span> <span className="font-medium text-foreground">{transfer.oxygenLiters ?? '—'}</span></div>
                <div><span className="text-muted-foreground">Manómetro:</span> <span className="font-medium text-foreground">{transfer.manometer ?? '—'} psi</span></div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Médico acompañante:</span>
                  <span className="font-medium text-foreground ml-1">{transfer.doctorCompanionName || 'No asignado'}</span>
                </div>
              </div>
              {transfer.status !== 'COMPLETED' && transfer.status !== 'CANCELLED' && (
                <div className="mt-3 p-3 rounded-lg border border-border text-xs space-y-1">
                  <p className="font-medium text-foreground mb-1">Validación de oxígeno</p>
                  {[
                    { label: 'Tanque asignado', ok: !!transfer.assignedTankId },
                    { label: 'Nivel del tanque registrado', ok: transfer.tankLevel != null },
                    { label: 'Manómetro registrado', ok: transfer.manometer != null },
                    { label: 'Litros/min configurados', ok: !!transfer.oxygenLiters },
                    { label: 'Médico acompañante asignado', ok: !!transfer.doctorCompanionName },
                  ].map((check) => (
                    <div key={check.label} className="flex items-center gap-1.5">
                      <span className={check.ok ? 'text-emerald-500 dark:text-emerald-400' : 'text-destructive/60'}>
                        {check.ok ? '✓' : '✗'}
                      </span>
                      <span className={check.ok ? 'text-muted-foreground' : 'text-destructive'}>{check.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="bg-card rounded-xl p-6 border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Línea de tiempo</h2>
            <Timeline transferId={id} />
          </div>
        </div>

        <div className="space-y-6">
          {transfer.qrCodeDataUrl && (
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-lg font-semibold text-foreground mb-3">Código QR</h2>
              <div className="flex flex-col items-center gap-3">
                <img
                  src={transfer.qrCodeDataUrl}
                  alt="Código QR de seguimiento"
                  className="w-40 h-40 border border-border rounded-lg"
                />
                <p className="text-xs text-muted-foreground text-center break-all">
                  /tracking/{transfer.trackingToken}
                </p>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.download = `mediflow-${transfer.trackingToken}.png`;
                      link.href = transfer.qrCodeDataUrl;
                      link.click();
                    }}
                    className="flex-1 px-3 py-2 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors text-center"
                  >
                    Descargar
                  </button>
                  <button
                    onClick={() => {
                      const pw = globalThis.open?.('', '_blank');
                      if (pw) {
                        pw.document.write(`
                          <html><head><title>Código QR - MediFlow</title>
                          <style>body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fff}
                          img{max-width:90vw;max-height:90vh;image-rendering:pixelated}</style>
                          </head><body><img src="${transfer.qrCodeDataUrl}" /></body></html>
                        `);
                        pw.document.close();
                      }
                    }}
                    className="flex-1 px-3 py-2 text-xs font-medium border border-border hover:bg-accent text-foreground rounded-lg transition-colors text-center"
                  >
                    Imprimir
                  </button>
                  <button
                    onClick={() => {
                      const url = `${globalThis.location?.origin || ''}/tracking/${transfer.trackingToken}`;
                      try { (navigator as any).clipboard?.writeText(url).then(() => toast.success('Enlace copiado')).catch(() => {}); } catch {}
                    }}
                    className="flex-1 px-3 py-2 text-xs font-medium border border-border hover:bg-accent text-foreground rounded-lg transition-colors text-center"
                  >
                    Copiar enlace
                  </button>
                </div>
              </div>
            </div>
          )}

          {can('ASSIGN_TRANSFER') && transfer.status === 'REQUESTED' && (
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-lg font-semibold text-foreground mb-3">Asignar camillero</h2>
              <TransporterSelect
                onSelect={(tid) => assignMutation.mutate({ transporterId: tid })}
                loading={assignMutation.isPending}
              />
            </div>
          )}

          {transfer.status !== 'COMPLETED' && transfer.status !== 'CANCELLED' && (
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                Actualizar estado
                <span className="text-xs font-normal text-muted-foreground ml-2">Actual: {TRANSFER_STATUS_LABELS[transfer.status] ?? transfer.status}</span>
              </h2>
              <div className="space-y-2">
                {nextStatuses.filter((s: string) => s !== 'CANCELLED').map((status: string) => (
                  <button
                    key={status}
                    onClick={() => statusMutation.mutate({ status, comment: statusComment })}
                    disabled={statusMutation.isPending || !can('EDIT_TRANSFER')}
                    className="w-full px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent text-foreground disabled:opacity-50 text-left disabled:cursor-not-allowed transition-colors"
                  >
                    {TRANSFER_STATUS_LABELS[status] ?? status.replace(/_/g, ' ')}
                  </button>
                ))}
                <input
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  placeholder="Comentario (opcional)…"
                  className="w-full mt-2 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}

          {can('CANCEL_TRANSFER') && transfer.status !== 'CANCELLED' && transfer.status !== 'COMPLETED' && (
            <div className="bg-card rounded-xl p-6 border border-destructive/30">
              <h2 className="text-lg font-semibold text-destructive mb-3">Zona de peligro</h2>
              {!showCancel ? (
                <button
                  onClick={() => setShowCancel(true)}
                  className="w-full px-4 py-2 bg-destructive text-destructive-foreground text-sm rounded-lg hover:bg-destructive/90 transition-colors"
                >
                  Cancelar traslado
                </button>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Motivo de cancelación (requerido)…"
                    className="w-full px-3 py-2 bg-background border border-destructive/40 rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-destructive"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => cancelMutation.mutate(cancelReason)}
                      disabled={!cancelReason || cancelMutation.isPending}
                      className="px-4 py-2 bg-destructive text-destructive-foreground text-sm rounded-lg hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                    >
                      Confirmar cancelación
                    </button>
                    <button
                      onClick={() => setShowCancel(false)}
                      className="px-4 py-2 border border-border text-foreground text-sm rounded-lg hover:bg-accent transition-colors"
                    >
                      Volver
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function TransporterSelect({ onSelect, loading }: { onSelect: (id: string) => void; loading: boolean }) {
  const { data: transporters } = useQuery<any[]>({
    queryKey: ['available-transporters'],
    queryFn: () => api.get('/assignments/available'),
  });

  const [selected, setSelected] = useState('');

  return (
    <div className="space-y-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">Selecciona un camillero…</option>
        {transporters?.map((t: any) => (
          <option key={t.id} value={t.id}>
            {t.firstName} {t.lastName} ({EMPLOYEE_STATUS_LABELS[t.employeeStatus] ?? t.employeeStatus})
          </option>
        ))}
      </select>
      <button
        onClick={() => selected && onSelect(selected)}
        disabled={!selected || loading}
        className="w-full px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Asignando…' : 'Asignar'}
      </button>
    </div>
  );
}
