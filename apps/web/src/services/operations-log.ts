import { api } from '@/lib/api';

export interface QueryOperationsLogParams {
  type?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: string;
  limit?: string;
}

export const operationsLogApi = {
  list: (params?: QueryOperationsLogParams) =>
    api.get<any>('/operations-log?' + new URLSearchParams(params as any).toString()),
};
