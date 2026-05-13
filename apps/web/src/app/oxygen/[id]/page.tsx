'use client';

import { AppShell } from '@/components/app-shell';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { usePermissions } from '@/lib/permissions';
import { useState } from 'react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');
import { OXYGEN_STATUS_LABELS, TRANSFER_STATUS_LABELS, ZONE_LABELS } from '@/lib/i18n';

const STATUS_STYLES: Record<string, string> = {
  FULL: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  MEDIUM: 'bg-primary/15 text-primary border-primary/20',
  LOW: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20',
  CRITICAL: 'bg-destructive/15 text-destructive border-destructive/20',
};

const LEVEL_BAR_COLORS: Record<string, string> = {
  FULL: 'bg-emerald-500',
  MEDIUM: 'bg-primary',
  LOW: 'bg-amber-500',
  CRITICAL: 'bg-destructive',
};

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{children || '—'}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  );
}

export default function OxygenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const canManage = can('MANAGE_OXYGEN');
  const [showHistory, setShowHistory] = useState(false);
  const [newLevel, setNewLevel] = useState('');
  const [newPsi, setNewPsi] = useState('');

  const { data: tank, isLoading, error } = useQuery<any>({
    queryKey: ['oxygen-tank', id],
    queryFn: () => api.get(`/oxygen/${id}`),
  });

  const updateLevelMutation = useMutation({
    mutationFn: async () => {
      const body: any = { level: parseInt(newLevel) };
      if (newPsi) body.psi = parseInt(newPsi);
      await api.put(`/oxygen/${id}/level`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oxygen-tank', id] });
      setNewLevel(''); setNewPsi('');
      toast.success('Nivel actualizado');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const releaseMutation = useMutation({
    mutationFn: (transferId: string) => api.put(`/oxygen/${id}/release`, { transferId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oxygen-tank', id] });
      toast.success('Tanque liberado');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleAvailMutation = useMutation({
    mutationFn: (avail: boolean) => api.put(`/oxygen/${id}/availability`, { isAvailable: avail }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oxygen-tank', id] });
      toast.success('Disponibilidad actualizada');
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) return <AppShell><div className="text-center py-12 text-muted-foreground">Cargando…</div></AppShell>;
  if (error || !tank) return <AppShell><div className="text-center py-12 text-destructive">Tanque no encontrado</div></AppShell>;

  return (
    <AppShell>
      <button onClick={() => router.push('/oxygen')} className="text-sm text-primary hover:text-primary/80 mb-4 inline-block">
        ← Volver a tanques de oxígeno
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section title="Información del tanque">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-24 h-24 rounded-full border-4 border-border flex items-center justify-center relative">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke={tank.status === 'CRITICAL' ? '#ef4444' : tank.status === 'LOW' ? '#f59e0b' : tank.status === 'MEDIUM' ? 'hsl(var(--primary))' : '#10b981'}
                    strokeWidth="3" strokeDasharray={`${tank.level}, 100`} />
                </svg>
                <span className="absolute text-lg font-bold text-foreground">{tank.level}%</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{tank.code}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${STATUS_STYLES[tank.status] || 'bg-muted text-foreground/80 border-border'}`}>
                    {OXYGEN_STATUS_LABELS[tank.status] ?? tank.status}
                  </span>
                  <span className={`text-xs font-medium ${tank.isAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                    {tank.isAvailable ? 'Disponible' : 'En uso'}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <InfoRow label="PSI / Manómetro">{tank.psi}</InfoRow>
              <InfoRow label="Capacidad">{tank.capacity} L</InfoRow>
              <InfoRow label="Ubicación">{tank.location}</InfoRow>
              <InfoRow label="Creado">{dayjs(tank.createdAt).format('D MMM YYYY')}</InfoRow>
              {tank.notes && <InfoRow label="Notas">{tank.notes}</InfoRow>}
            </div>
          </Section>

          {tank.transfers && tank.transfers.length > 0 && (
            <Section title={tank.transfers[0].status !== 'COMPLETED' && tank.transfers[0].status !== 'CANCELLED' ? 'Traslado activo' : 'Traslados recientes'}>
              <div className="space-y-2">
                {tank.transfers.slice(0, 5).map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => router.push(`/transfers/${t.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.patient?.fullName || 'Desconocido'}</p>
                      <p className="text-xs text-muted-foreground">{ZONE_LABELS[t.origin] ?? t.origin} → {ZONE_LABELS[t.destination] ?? t.destination}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : t.status === 'CANCELLED' ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'}`}>
                      {TRANSFER_STATUS_LABELS[t.status] ?? t.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title="Historial de niveles">
            {!tank.history || tank.history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin historial registrado</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {tank.history.map((h: any) => (
                  <div key={h.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-foreground/80">{h.previousLevel}%</span>
                      <span className="text-muted-foreground/60">→</span>
                      <span className={`font-mono font-medium ${h.newLevel < h.previousLevel ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {h.newLevel}%
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${h.newStatus === 'CRITICAL' ? 'bg-destructive/15 text-destructive' : h.newStatus === 'LOW' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : h.newStatus === 'MEDIUM' ? 'bg-primary/15 text-primary' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'}`}>
                        {OXYGEN_STATUS_LABELS[h.newStatus] ?? h.newStatus}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      <div>{h.changedByUser?.firstName} {h.changedByUser?.lastName}</div>
                      <div>{dayjs(h.createdAt).format('D MMM HH:mm')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          {canManage && (
            <Section title="Actualizar nivel">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Nuevo nivel (%)</label>
                  <input type="number" value={newLevel} onChange={(e) => setNewLevel(e.target.value)}
                    min="0" max="100"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">PSI / Manómetro</label>
                  <input type="number" value={newPsi} onChange={(e) => setNewPsi(e.target.value)}
                    min="0"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <button
                  onClick={() => updateLevelMutation.mutate()}
                  disabled={!newLevel || updateLevelMutation.isPending}
                  className="w-full px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm rounded-lg transition-colors"
                >
                  {updateLevelMutation.isPending ? 'Actualizando…' : 'Actualizar nivel'}
                </button>
              </div>
            </Section>
          )}

          {canManage && tank.transfers?.[0] && tank.transfers[0].status !== 'COMPLETED' && tank.transfers[0].status !== 'CANCELLED' && (
            <Section title="Acciones">
              <button
                onClick={() => releaseMutation.mutate(tank.transfers[0].id)}
                disabled={releaseMutation.isPending}
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
              >
                Liberar del traslado
              </button>
            </Section>
          )}

          {canManage && (
            <Section title="Disponibilidad">
              <button
                onClick={() => toggleAvailMutation.mutate(!tank.isAvailable)}
                className={`w-full px-4 py-2 text-sm rounded-lg transition-colors ${tank.isAvailable ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
              >
                {tank.isAvailable ? 'Marcar como en uso' : 'Marcar como disponible'}
              </button>
            </Section>
          )}
        </div>
      </div>
    </AppShell>
  );
}
