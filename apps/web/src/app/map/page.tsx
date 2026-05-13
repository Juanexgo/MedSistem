'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { useSocketEvent } from '@/hooks/useSocket';
import { useRouter } from 'next/navigation';
import { CardSkeleton } from '@/components/ui/loading-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
dayjs.extend(relativeTime);
dayjs.locale('es');
import { ZONE_LABELS } from '@/lib/i18n';
import {
  Map as MapIcon,
  Activity,
  AlertTriangle,
  Users,
  ArrowRightLeft,
  Clock,
  Wind,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ZoneData {
  id: string;
  name: string;
  code: string;
  color: string;
  order: number;
  activeCount: number;
  delayedCount: number;
  isSaturated: boolean;
}

interface MapStats {
  totalActive: number;
  totalDelayed: number;
  saturatedZones: number;
  availableTransporters: number;
  criticalTanks: number;
}

const ZONE_LAYOUT: Record<string, { x: number; y: number; width: number; height: number }> = {
  'Emergency': { x: 10, y: 5, width: 22, height: 25 },
  'Hospitalization': { x: 35, y: 5, width: 30, height: 25 },
  'X-Ray': { x: 68, y: 5, width: 22, height: 25 },
  'CT Scan': { x: 10, y: 35, width: 22, height: 25 },
  'Laboratory': { x: 35, y: 35, width: 22, height: 25 },
  'Operating Rooms': { x: 60, y: 35, width: 30, height: 25 },
  'Elevators': { x: 10, y: 65, width: 22, height: 25 },
  'Outpatient Area': { x: 35, y: 65, width: 55, height: 25 },
};

export default function MapPage() {
  const router = useRouter();
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneData | null>(null);
  const [stats, setStats] = useState<MapStats>({
    totalActive: 0, totalDelayed: 0, saturatedZones: 0,
    availableTransporters: 0, criticalTanks: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [zonesData, dashData] = await Promise.all([
        api.get<ZoneData[]>('/zones'),
        api.get<any>('/dashboard'),
      ]);
      setZones(zonesData || []);
      const m = dashData?.metrics || dashData || {};
      const transporters = dashData?.transporters || [];
      const oxygenAlerts = dashData?.oxygenAlerts || [];
      setStats({
        totalActive: m.activeTransports ?? m.totalActive ?? 0,
        totalDelayed: m.delayedTransports ?? m.totalDelayed ?? 0,
        saturatedZones: (zonesData || []).filter((z) => z.isSaturated).length,
        availableTransporters:
          m.availableTransporters ??
          (Array.isArray(transporters)
            ? transporters.filter((t: any) => t.employeeStatus === 'AVAILABLE').length
            : 0),
        criticalTanks:
          m.criticalTanks ??
          (Array.isArray(oxygenAlerts)
            ? oxygenAlerts.filter((t: any) => t.status === 'CRITICAL').length
            : 0),
      });
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los datos del mapa');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useSocketEvent('transfer.status_changed', () => fetchData());
  useSocketEvent('assignment.created', () => fetchData());
  useSocketEvent('dashboard.metrics_updated', () => fetchData());

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Mapa del hospital</h1>
              <p className="text-sm text-muted-foreground mt-1">Vista por zonas en tiempo real</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <CardSkeleton key={i} />)}
          </div>
          <CardSkeleton />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Mapa del hospital</h1>
              <p className="text-sm text-muted-foreground mt-1">Vista por zonas en tiempo real</p>
            </div>
          </div>
          <ErrorState message={error} onRetry={fetchData} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mapa del hospital</h1>
            <p className="text-sm text-muted-foreground mt-1">Vista por zonas en tiempo real y traslados activos</p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowRightLeft className="w-4 h-4 text-primary" />
              Traslados activos
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.totalActive}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              Retrasados
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.totalDelayed}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="w-4 h-4 text-destructive" />
              Zonas saturadas
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.saturatedZones}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              Camilleros disponibles
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.availableTransporters}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wind className="w-4 h-4 text-destructive" />
              Tanques críticos
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.criticalTanks}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SVG Map */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Plano del piso</h2>
            {zones.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <EmptyState
                  icon={<MapIcon className="w-12 h-12" />}
                  title="No hay zonas configuradas"
                  description="Aún no se han configurado las zonas del hospital."
                />
              </div>
            ) : (
              <svg viewBox="0 0 100 100" className="w-full max-w-2xl mx-auto" style={{ height: 'auto' }}>
                {/* Corridors */}
                <line x1="33" y1="17" x2="67" y2="17" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="2,2" />
                <line x1="33" y1="47" x2="67" y2="47" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="2,2" />
                <line x1="21" y1="30" x2="21" y2="60" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="2,2" />
                <line x1="50" y1="30" x2="50" y2="60" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="2,2" />
                <line x1="75" y1="17" x2="75" y2="60" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="2,2" />

                {zones.map((zone) => {
                  const layout = ZONE_LAYOUT[zone.name];
                  if (!layout) return null;
                  return (
                    <g
                      key={zone.id}
                      onClick={() => setSelectedZone(selectedZone?.id === zone.id ? null : zone)}
                      className="cursor-pointer"
                    >
                      <rect
                        x={layout.x}
                        y={layout.y}
                        width={layout.width}
                        height={layout.height}
                        rx="3"
                        fill={zone.color + '20'}
                        stroke={zone.isSaturated ? 'hsl(var(--destructive))' : zone.color}
                        strokeWidth={zone.isSaturated ? 2.5 : 1.5}
                        className={cn(
                          'transition-all hover:opacity-80',
                          selectedZone?.id === zone.id ? 'stroke-[3]' : '',
                        )}
                      />
                      <text
                        x={layout.x + layout.width / 2}
                        y={layout.y + layout.height / 2 - 4}
                        textAnchor="middle"
                        className="text-[3.5px] font-medium fill-foreground"
                      >
                        {ZONE_LABELS[zone.name] ?? zone.name}
                      </text>
                      <text
                        x={layout.x + layout.width / 2}
                        y={layout.y + layout.height / 2 + 6}
                        textAnchor="middle"
                        className="text-[3px] fill-muted-foreground"
                      >
                        {zone.activeCount === 1 ? '1 activo' : `${zone.activeCount} activos`}
                      </text>
                      {zone.isSaturated && (
                        <text
                          x={layout.x + layout.width - 4}
                          y={layout.y + 5}
                          textAnchor="end"
                          className="text-[3px] fill-destructive font-bold"
                        >
                          !
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          {/* Zone Detail Panel */}
          <div className="space-y-4">
            {selectedZone ? (
              <div className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedZone.color }} />
                    <h3 className="text-lg font-semibold text-foreground">{ZONE_LABELS[selectedZone.name] ?? selectedZone.name}</h3>
                  </div>
                  <button onClick={() => setSelectedZone(null)} className="text-muted-foreground hover:text-foreground">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Código</span>
                    <span className="font-medium text-foreground">{selectedZone.code}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Traslados activos</span>
                    <span className={cn(
                      'font-medium',
                      selectedZone.activeCount > 0 ? 'text-primary' : 'text-muted-foreground',
                    )}>{selectedZone.activeCount}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Estado</span>
                    <span className={cn(
                      'font-medium px-2 py-0.5 rounded text-xs',
                      selectedZone.isSaturated ? 'bg-destructive/15 text-destructive' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                    )}>
                      {selectedZone.isSaturated ? 'Saturada' : 'Normal'}
                    </span>
                  </div>
                  {selectedZone.activeCount > 0 && (
                    <button
                      onClick={() => router.push(`/transfers`)}
                      className="w-full mt-4 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/15 transition-colors"
                    >
                      Ver traslados activos
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Leyenda de zonas</h3>
                <div className="space-y-2">
                  {zones.map((zone) => (
                    <button
                      key={zone.id}
                      onClick={() => setSelectedZone(zone)}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: zone.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-foreground/80">{ZONE_LABELS[zone.name] ?? zone.name}</span>
                          <span className={cn(
                            'text-xs font-medium',
                            zone.activeCount > 0 ? 'text-foreground/80' : 'text-muted-foreground',
                          )}>
                            {zone.activeCount}
                          </span>
                        </div>
                        {zone.isSaturated && (
                          <span className="text-[10px] text-destructive font-medium">Saturada</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Alerts Section */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Alertas</h3>
              <div className="space-y-2">
                {stats.saturatedZones > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg text-xs text-destructive">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{stats.saturatedZones} {stats.saturatedZones > 1 ? 'zonas saturadas' : 'zona saturada'}</span>
                  </div>
                )}
                {stats.criticalTanks > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg text-xs text-destructive">
                    <Wind className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{stats.criticalTanks} {stats.criticalTanks > 1 ? 'tanques de oxígeno críticos' : 'tanque de oxígeno crítico'}</span>
                  </div>
                )}
                {stats.totalDelayed > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{stats.totalDelayed} {stats.totalDelayed > 1 ? 'traslados retrasados' : 'traslado retrasado'}</span>
                  </div>
                )}
                {stats.saturatedZones === 0 && stats.criticalTanks === 0 && stats.totalDelayed === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    Sin alertas activas
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
