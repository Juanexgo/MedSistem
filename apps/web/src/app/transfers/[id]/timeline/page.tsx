'use client';

import { AppShell } from '@/components/app-shell';
import { Timeline } from '@/components/timeline';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');
import { ZONE_LABELS } from '@/lib/i18n';

export default function TransferTimelinePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: transfer } = useQuery({
    queryKey: ['transfer', id],
    queryFn: () => api.get<any>(`/transfers/${id}`),
  });

  return (
    <AppShell>
      <button onClick={() => router.push(`/transfers/${id}`)} className="text-sm text-primary hover:text-primary/80 mb-4 inline-block">
        ← Volver al traslado
      </button>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Línea de tiempo del traslado</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {transfer?.patient?.fullName} · {ZONE_LABELS[transfer?.origin] ?? transfer?.origin} → {ZONE_LABELS[transfer?.destination] ?? transfer?.destination} · {dayjs(transfer?.requestedAt).format('D MMM YYYY')}
        </p>
      </div>
      <div className="bg-card rounded-xl p-6 border border-border max-w-2xl">
        <Timeline transferId={id} />
      </div>
    </AppShell>
  );
}