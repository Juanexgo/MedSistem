'use client';

import { AppShell } from '@/components/app-shell';
import { shiftsApi } from '@/services/shifts';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { SHIFT_TYPE_LABELS } from '@/lib/i18n';

export default function ShiftHistoryPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['shift-history', page],
    queryFn: () => shiftsApi.getShiftHistory(page, 20),
  });

  return (
    <AppShell>
      <button onClick={() => router.push('/shifts')} className="text-sm text-primary hover:text-primary/80 mb-4 inline-block">
        ← Volver a turnos
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Historial de turnos</h1>
        <p className="text-sm text-muted-foreground mt-1">Tus turnos finalizados</p>
      </div>

      <div className="bg-card rounded-xl border border-border">
        {isLoading ? (
          <div className="animate-pulse p-6 space-y-3">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-muted rounded" />)}
          </div>
        ) : data?.data && data.data.length > 0 ? (
          <>
            <div className="divide-y divide-border">
              {data.data.map((shift: any) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between p-4 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => router.push(`/shifts/${shift.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${shift.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{shift.shiftCode}</span>
                        <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs">
                          {SHIFT_TYPE_LABELS[shift.type] ?? shift.type}
                        </span>
                        {shift.handoff && (
                          <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 rounded text-xs">
                            Entrega completada
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {dayjs(shift.startedAt).format('D MMM YYYY')} ·{' '}
                        {dayjs(shift.startedAt).format('HH:mm')}
                        {shift.endedAt && ` — ${dayjs(shift.endedAt).format('HH:mm')}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {shift.endedAt
                      ? `${Math.round((new Date(shift.endedAt).getTime() - new Date(shift.startedAt).getTime()) / 3600000)}h`
                      : 'Activo'}
                  </div>
                </div>
              ))}
            </div>

            {data.meta && data.meta.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent rounded-lg disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
                <span className="text-sm text-muted-foreground">
                  Página {page} de {data.meta.totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(data.meta.totalPages, p + 1))}
                  disabled={page >= data.meta.totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent rounded-lg disabled:opacity-50"
                >
                  Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 mx-auto text-muted-foreground/60 mb-3" />
            <p className="text-sm text-muted-foreground">No hay historial de turnos disponible</p>
            <p className="text-xs text-muted-foreground mt-1">Tus turnos finalizados aparecerán aquí.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
