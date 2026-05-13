import { api } from '@/lib/api';

export interface QuerySecurityIncidentsParams {
  type?: string;
  severity?: string;
  status?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: string;
  limit?: string;
}

export const securityIncidentsApi = {
  list: (params?: QuerySecurityIncidentsParams) =>
    api.get<any>('/security-incidents?' + new URLSearchParams(params as any).toString()),
  getById: (id: string) => api.get<any>(`/security-incidents/${id}`),
  resolve: (id: string, resolution: string) =>
    api.post<any>(`/security-incidents/${id}/resolve`, { resolution }),
};
