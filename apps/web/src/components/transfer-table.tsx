'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StatusBadge } from './status-badge';
import { PriorityBadge } from './priority-badge';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ZONE_LABELS, TRANSFER_STATUS_LABELS, TRANSFER_PRIORITY_LABELS } from '@/lib/i18n';

interface Filters {
  status?: string;
  priority?: string;
  search?: string;
  page: number;
}

export function TransferTable() {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>({ page: 1 });

  const { data, isLoading, error } = useQuery({
    queryKey: ['transfers', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.search) params.set('search', filters.search);
      params.set('page', String(filters.page));
      params.set('limit', '20');
      return api.get<any>(`/transfers?${params.toString()}`);
    },
  });

  const formatElapsed = (minutes?: number) => {
    if (!minutes && minutes !== 0) return '—';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar paciente, cama, piso, estudio…"
          className="flex-1 min-w-[200px] px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring outline-none"
          onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
        />
        <select
          className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          onChange={(e) => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
        >
          <option value="">Todos los estados</option>
          {['REQUESTED', 'ASSIGNED', 'ON_THE_WAY', 'PATIENT_PICKED_UP', 'IN_TRANSFER', 'ARRIVED', 'IN_STUDY', 'RETURN_REQUESTED', 'COMPLETED', 'CANCELLED'].map(s => (
            <option key={s} value={s}>{TRANSFER_STATUS_LABELS[s] ?? s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select
          className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value, page: 1 }))}
        >
          <option value="">Todas las prioridades</option>
          {['URGENT', 'HIGH', 'NORMAL', 'SCHEDULED'].map(p => (
            <option key={p} value={p}>{TRANSFER_PRIORITY_LABELS[p] ?? p}</option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">Cargando traslados…</div>
      )}

      {error && (
        <div className="text-center py-12 text-destructive">No se pudieron cargar los traslados</div>
      )}

      {data && data.data && data.data.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No se encontraron traslados</div>
      )}

      {data && data.data && data.data.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Paciente</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Origen → Destino</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Prioridad</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Camillero</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Transcurrido</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Estudio</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((t: any) => (
                  <tr
                    key={t.id}
                    className="border-b border-border hover:bg-accent cursor-pointer"
                    onClick={() => router.push(`/transfers/${t.id}`)}
                  >
                    <td className="py-3 px-3">
                      <div className="font-medium text-foreground">{t.patient?.fullName}</div>
                      <div className="text-xs text-muted-foreground">Cama {t.bedNumber} · Piso {t.floor}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-foreground/80">{ZONE_LABELS[t.origin] ?? t.origin}</div>
                      <div className="text-xs text-muted-foreground">→ {ZONE_LABELS[t.destination] ?? t.destination}</div>
                    </td>
                    <td className="py-3 px-3"><StatusBadge status={t.status} /></td>
                    <td className="py-3 px-3"><PriorityBadge priority={t.priority} /></td>
                    <td className="py-3 px-3 text-foreground/80">
                      {t.assignedTransporter ? `${t.assignedTransporter.firstName} ${t.assignedTransporter.lastName}` : '—'}
                    </td>
                    <td className="py-3 px-3">
                      <span className={t.elapsedMinutes > 25 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                        {formatElapsed(t.elapsedMinutes)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-muted-foreground max-w-[150px] truncate">{t.requestedStudy || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Página {data.meta?.page || 1} de {data.meta?.totalPages || 1} ({data.meta?.total || 0} en total)</span>
            <div className="flex gap-2">
              <button
                disabled={filters.page <= 1}
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                className="px-3 py-1 border border-border rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                disabled={filters.page >= (data.meta?.totalPages || 1)}
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                className="px-3 py-1 border border-border rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}