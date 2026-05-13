import { api } from '@/lib/api';
import type {
  DashboardResponse,
  DashboardMetrics,
  TransporterAvailability,
  ZoneSaturation,
  OxygenSummary,
  TimelineEvent,
  DashboardTransferRow,
} from '@mediflow/shared';

export interface DashboardParams {
  timeRange?: 'today' | 'shift' | '7days' | '30days';
  zone?: string;
  priority?: string;
}

function buildQuery(params?: DashboardParams): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  if (params.timeRange) sp.set('timeRange', params.timeRange);
  if (params.zone) sp.set('zone', params.zone);
  if (params.priority) sp.set('priority', params.priority);
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export const dashboardApi = {
  getFullDashboard: (params?: DashboardParams): Promise<DashboardResponse> =>
    api.get(`/dashboard${buildQuery(params)}`),

  getMetrics: (params?: DashboardParams): Promise<{ metrics: DashboardMetrics; priorityBreakdown: Array<{ priority: string; count: number }>; hourlyBreakdown: Array<{ hour: number; count: number }> }> =>
    api.get(`/dashboard/metrics${buildQuery(params)}`),

  getTransporters: (): Promise<TransporterAvailability> =>
    api.get('/dashboard/transporters'),

  getZones: (): Promise<ZoneSaturation[]> =>
    api.get('/dashboard/zones'),

  getOxygen: (): Promise<OxygenSummary> =>
    api.get('/dashboard/oxygen'),

  getActiveTransfers: (zone?: string): Promise<DashboardTransferRow[]> =>
    api.get(`/dashboard/active-transfers${zone ? `?zone=${zone}` : ''}`),

  getUnassignedUrgent: (): Promise<DashboardTransferRow[]> =>
    api.get('/dashboard/unassigned-urgent'),

  getActivity: (): Promise<TimelineEvent[]> =>
    api.get('/dashboard/activity'),
};
