'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StatusBadge } from './status-badge';
import type { TimelineEvent } from '@mediflow/shared';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');
import { ROLE_LABELS } from '@/lib/i18n';

const EVENT_ICONS: Record<string, string> = {
  created: '●',
  status_change: '◆',
  assignment: '►',
  comment: '○',
  oxygen: '◈',
};

const EVENT_COLORS: Record<string, string> = {
  created: 'text-primary',
  status_change: 'text-amber-500 dark:text-amber-400',
  assignment: 'text-emerald-500 dark:text-emerald-400',
  comment: 'text-muted-foreground',
  oxygen: 'text-purple-500 dark:text-purple-400',
};

export function Timeline({ transferId }: { transferId: string }) {
  const { data: events, isLoading, error } = useQuery<TimelineEvent[]>({
    queryKey: ['transfer-timeline', transferId],
    queryFn: () => api.get(`/transfers/${transferId}/timeline`),
  });

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Cargando línea de tiempo…</div>;
  if (error) return <div className="text-center py-8 text-destructive">No se pudo cargar la línea de tiempo</div>;
  if (!events || events.length === 0) return <div className="text-center py-8 text-muted-foreground">Sin eventos registrados</div>;

  return (
    <div className="relative">
      <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />
      <div className="space-y-0">
        {events.map((event, i) => (
          <div key={i} className="flex gap-4 pb-6 relative">
            <div className={`flex-shrink-0 w-4 h-4 rounded-full bg-card border-2 border-border flex items-center justify-center z-10 mt-0.5 ${EVENT_COLORS[event.type] || 'text-muted-foreground'}`}>
              <span className="text-[8px]">{EVENT_ICONS[event.type] || '●'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm text-foreground">{event.title}</span>
                <span className="text-xs text-muted-foreground">{dayjs(event.timestamp).format('D MMM HH:mm')}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{event.description}</p>
              <div className="flex items-center gap-2 mt-1">
                {event.actor && (
                  <span className="text-xs text-muted-foreground">
                    por {event.actor.firstName} {event.actor.lastName}
                    {event.actor.role ? ` (${ROLE_LABELS[event.actor.role] ?? event.actor.role})` : ''}
                  </span>
                )}
                {event.metadata?.status && (
                  <StatusBadge status={event.metadata.status} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}