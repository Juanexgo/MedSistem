'use client';

import { AppShell } from '@/components/app-shell';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { usePermissions } from '@/lib/permissions';
import { useSocketEvent } from '@/hooks/useSocket';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { OXYGEN_STATUS_LABELS } from '@/lib/i18n';

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

export default function OxygenPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const canManage = can('MANAGE_OXYGEN');
  const [statusFilter, setStatusFilter] = useState('');
  const [locFilter, setLocFilter] = useState('');
  const [availFilter, setAvailFilter] = useState('');
  const [search, setSearch] = useState('');

  const params = new URLSearchParams();
  if (statusFilter) params.set('status', statusFilter);
  if (locFilter) params.set('location', locFilter);
  if (availFilter) params.set('isAvailable', availFilter);
  if (search) params.set('search', search);
  const qs = params.toString();

  const { data: tanks, isLoading, error, refetch } = useQuery<any[]>({
    queryKey: ['oxygen-tanks', qs],
    queryFn: () => api.get(`/oxygen${qs ? `?${qs}` : ''}`),
  });

  const { data: alerts } = useQuery<any[]>({
    queryKey: ['oxygen-alerts'],
    queryFn: () => api.get('/oxygen/alerts'),
    refetchInterval: 30000,
    enabled: canManage,
  });

  useSocketEvent('oxygen.tank_updated', () => refetch());
  useSocketEvent('oxygen.tank_created', () => refetch());
  useSocketEvent('dashboard.metrics_updated', () => refetch());

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/oxygen/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['oxygen-tanks'] }); toast.success('Tanque desactivado'); },
    onError: (err: any) => toast.error(err.message),
  });

  const locationOptions = tanks ? [...new Set(tanks.map((t: any) => t.location))].sort() : [];

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tanques de oxígeno</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestiona el inventario y estado de los tanques de oxígeno</p>
        </div>
        {canManage && (
          <button
            onClick={() => router.push('/oxygen/new')}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg text-sm transition-colors"
          >
            + Nuevo tanque
          </button>
        )}
      </div>

      {alerts && alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((a: any, i: number) => (
            <div key={i} className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${
              a.severity === 'critical' ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300'
            }`}>
              {a.severity === 'critical' ? '🔴' : '🟡'}
              <span>{a.message}</span>
              <button
                onClick={() => router.push(`/oxygen/${a.tankId}`)}
                className="ml-auto text-xs underline font-medium"
              >
                Ver
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border mb-6">
        <div className="p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Buscar</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Código o ubicación…"
              className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring w-48" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Estado</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
              <option value="">Todos</option>
              <option value="FULL">Lleno</option>
              <option value="MEDIUM">Medio</option>
              <option value="LOW">Bajo</option>
              <option value="CRITICAL">Crítico</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Ubicación</label>
            <select value={locFilter} onChange={(e) => setLocFilter(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
              <option value="">Todas</option>
              {locationOptions.map((loc: string) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Disponibilidad</label>
            <select value={availFilter} onChange={(e) => setAvailFilter(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
              <option value="">Todos</option>
              <option value="true">Disponible</option>
              <option value="false">En uso</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando tanques…</div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">No se pudieron cargar los tanques</div>
      ) : !tanks || tanks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No se encontraron tanques</div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Código</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Nivel</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">PSI</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Ubicación</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Disponibilidad</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Traslado activo</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tanks.map((tank: any) => (
                  <tr key={tank.id} className="border-b border-border hover:bg-accent cursor-pointer"
                    onClick={() => router.push(`/oxygen/${tank.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{tank.code}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${LEVEL_BAR_COLORS[tank.status] || 'bg-muted-foreground'}`}
                            style={{ width: `${Math.min(tank.level, 100)}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{tank.level}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${STATUS_STYLES[tank.status] || 'bg-muted text-foreground/80 border-border'}`}>
                        {OXYGEN_STATUS_LABELS[tank.status] ?? tank.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground/80 font-mono">{tank.psi}</td>
                    <td className="px-4 py-3 text-foreground/80">{tank.location}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${tank.isAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                        {tank.isAvailable ? 'Disponible' : 'En uso'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {tank.transfers?.[0]?.patient?.fullName || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManage && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(tank.id); }}
                          className="text-xs text-destructive hover:text-destructive/80 font-medium"
                        >
                          Desactivar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
