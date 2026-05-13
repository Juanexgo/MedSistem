import { api } from '@/lib/api';

export interface QueryAuditParams {
  action?: string;
  entity?: string;
  userId?: string;
  role?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: string;
  limit?: string;
}

export const auditApi = {
  list: (params?: QueryAuditParams) =>
    api.get<any>('/audit?' + new URLSearchParams(params as any).toString()),
};
