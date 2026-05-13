'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');
import { API_BASE_URL } from '@/lib/api';
import {
  ZONE_LABELS,
  TRANSFER_STATUS_LABELS,
  TRANSFER_PRIORITY_LABELS,
  TRANSPORT_TYPE_LABELS,
} from '@/lib/i18n';

const API = API_BASE_URL;

function fetchTracking(token: string) {
  return fetch(`${API}/tracking/${token}`).then(async (res) => {
    if (!res.ok) throw new Error('Traslado no encontrado');
    const json = await res.json();
    return json.data || json;
  });
}

function fetchTrackingTimeline(token: string) {
  return fetch(`${API}/tracking/${token}/timeline`).then(async (res) => {
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || json;
  });
}

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300',
  ASSIGNED: 'bg-primary/15 text-primary',
  ON_THE_WAY: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  PATIENT_PICKED_UP: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
  IN_TRANSFER: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  ARRIVED: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  IN_STUDY: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
  RETURN_REQUESTED: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  COMPLETED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  CANCELLED: 'bg-destructive/15 text-destructive',
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'bg-destructive/10 text-destructive border-destructive/20',
  HIGH: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  NORMAL: 'bg-primary/10 text-primary border-primary/20',
  SCHEDULED: 'bg-muted text-foreground/80 border-border',
};

const TIMELINE_DOT_COLORS: Record<string, string> = {
  REQUESTED: 'bg-muted-foreground',
  ASSIGNED: 'bg-primary',
  ON_THE_WAY: 'bg-indigo-500',
  PATIENT_PICKED_UP: 'bg-purple-500',
  IN_TRANSFER: 'bg-orange-500',
  ARRIVED: 'bg-teal-500',
  IN_STUDY: 'bg-cyan-500',
  RETURN_REQUESTED: 'bg-orange-500',
  COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-destructive',
};

function ElapsedTime({ requestedAt }: { requestedAt: string }) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    function update() {
      const diff = Date.now() - new Date(requestedAt).getTime();
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      const secs = Math.floor((diff % 60000) / 1000);
      if (hrs > 0) {
        setElapsed(`${hrs}h ${mins % 60}m ${secs}s`);
      } else {
        setElapsed(`${mins}m ${secs}s`);
      }
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [requestedAt]);
  return <span className="font-mono text-sm">{elapsed}</span>;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{children || '—'}</span>
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

function SectionDivider() {
  return <div className="border-t border-border my-1" />;
}

export default function TrackingPage() {
  const { trackingToken } = useParams<{ trackingToken: string }>();
  const [showTimeline, setShowTimeline] = useState(false);

  const { data: transfer, isLoading, error } = useQuery({
    queryKey: ['tracking', trackingToken],
    queryFn: () => fetchTracking(trackingToken),
    refetchInterval: 30000,
    retry: 1,
  });

  const { data: timelineEvents } = useQuery({
    queryKey: ['tracking-timeline', trackingToken],
    queryFn: () => fetchTrackingTimeline(trackingToken),
    enabled: showTimeline,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="animate-pulse text-muted-foreground">Cargando información del traslado…</div>
      </div>
    );
  }

  if (error || !transfer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-2xl shadow-lg border border-border p-8 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h1 className="text-lg font-semibold text-foreground mb-2">Traslado no encontrado</h1>
          <p className="text-sm text-muted-foreground">
            El enlace de seguimiento no es válido o el traslado fue eliminado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="text-center mb-2">
          <h1 className="text-xl font-bold text-foreground">MediFlow</h1>
          <p className="text-xs text-muted-foreground">Seguimiento de traslado de paciente</p>
        </div>

        <div className="flex items-center justify-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[transfer.status] || 'bg-muted text-foreground/80'}`}>
            {TRANSFER_STATUS_LABELS[transfer.status] ?? transfer.status.replace(/_/g, ' ')}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${PRIORITY_COLORS[transfer.priority] || 'bg-muted text-foreground/80 border-border'}`}>
            {TRANSFER_PRIORITY_LABELS[transfer.priority] ?? transfer.priority}
          </span>
        </div>

        <Section title="Paciente">
          <p className="text-lg font-semibold text-foreground">{transfer.patient?.fullName}</p>
          <p className="text-sm text-muted-foreground">Cama {transfer.bedNumber} &middot; Piso {transfer.floor}</p>
        </Section>

        <Section title="Ruta">
          <InfoRow label="Origen">{ZONE_LABELS[transfer.origin] ?? transfer.origin}</InfoRow>
          <SectionDivider />
          <InfoRow label="Destino">{ZONE_LABELS[transfer.destination] ?? transfer.destination}</InfoRow>
          <SectionDivider />
          <InfoRow label="Tipo de transporte">{TRANSPORT_TYPE_LABELS[transfer.transportType] ?? transfer.transportType}</InfoRow>
        </Section>

        <Section title="Detalles">
          <InfoRow label="Estudio solicitado">{transfer.requestedStudy}</InfoRow>
          <SectionDivider />
          <InfoRow label="Prioridad">{TRANSFER_PRIORITY_LABELS[transfer.priority] ?? transfer.priority}</InfoRow>
          <SectionDivider />
          <InfoRow label="Estado">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[transfer.status] || 'bg-muted text-foreground/80'}`}>
              {TRANSFER_STATUS_LABELS[transfer.status] ?? transfer.status.replace(/_/g, ' ')}
            </span>
          </InfoRow>
          <SectionDivider />
          <InfoRow label="Camillero asignado">
            {transfer.assignedTransporter
              ? `${transfer.assignedTransporter.firstName} ${transfer.assignedTransporter.lastName}`
              : 'No asignado'}
          </InfoRow>
          <SectionDivider />
          <InfoRow label="Autorizado por">
            {transfer.authorizingUser
              ? `${transfer.authorizingUser.firstName} ${transfer.authorizingUser.lastName}`
              : '—'}
          </InfoRow>
        </Section>

        <Section title="Tiempo">
          <InfoRow label="Solicitado">
            {dayjs(transfer.requestedAt).format('D MMM YYYY HH:mm')}
          </InfoRow>
          <SectionDivider />
          <InfoRow label="Tiempo transcurrido">
            <ElapsedTime requestedAt={transfer.requestedAt} />
          </InfoRow>
        </Section>

        {transfer.requiresOxygen && (
          <Section title="Soporte de oxígeno">
            <InfoRow label="Requiere oxígeno">Sí</InfoRow>
            <SectionDivider />
            <InfoRow label="Litros/min">{transfer.oxygenLiters ?? '—'}</InfoRow>
            <SectionDivider />
            <InfoRow label="Tanque asignado">{transfer.assignedTank?.code || '—'}</InfoRow>
            <SectionDivider />
            <InfoRow label="Nivel del tanque">{transfer.tankLevel != null ? `${transfer.tankLevel}%` : '—'}</InfoRow>
            <SectionDivider />
            <InfoRow label="Manómetro">{transfer.manometer != null ? `${transfer.manometer} psi` : '—'}</InfoRow>
            <SectionDivider />
            <InfoRow label="Médico acompañante">{transfer.doctorCompanionName || '—'}</InfoRow>
          </Section>
        )}

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="w-full px-5 py-3 flex items-center justify-between text-sm font-semibold text-foreground uppercase tracking-wide hover:bg-accent transition-colors"
          >
            <span>Línea de tiempo</span>
            <svg
              className={`w-4 h-4 transition-transform ${showTimeline ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showTimeline && (
            <div className="px-5 pb-5">
              {!timelineEvents || timelineEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No hay eventos en la línea de tiempo</p>
              ) : (
                <div className="relative mt-2">
                  <div className="absolute left-[11px] top-1 bottom-1 w-0.5 bg-border" />
                  <div className="space-y-0">
                    {timelineEvents.map((event: any, i: number) => (
                      <div key={i} className="flex gap-4 pb-5 relative">
                        <div className={`flex-shrink-0 w-[26px] h-[26px] rounded-full border-2 border-card flex items-center justify-center z-10 shadow-sm ${TIMELINE_DOT_COLORS[event.status] || 'bg-muted-foreground'}`}>
                          <div className="w-2 h-2 rounded-full bg-card" />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-foreground">{event.title}</span>
                          </div>
                          {event.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {dayjs(event.timestamp).format('D MMM HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="text-center pb-8 pt-2">
          <p className="text-xs text-muted-foreground">
            MediFlow v1.0 &mdash; Logística interna del hospital
          </p>
        </div>
      </div>
    </div>
  );
}