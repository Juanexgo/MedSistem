import { api } from '@/lib/api';

export interface ExportParams {
  from?: string;
  to?: string;
  [key: string]: string | undefined;
}

/**
 * Build a query string skipping empty/undefined/null values.
 * Plain `URLSearchParams({foo: undefined})` produces `?foo=undefined`
 * (literal string), which servers misinterpret as a valid value.
 */
function toQueryString(params?: Record<string, string | undefined>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  ) as [string, string][];
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

export const reportsApi = {
  exportTransfers: (params?: ExportParams) =>
    api.get<any>('/exports/transfers' + toQueryString(params)),
  exportAuditLogs: (params?: ExportParams) =>
    api.get<any>('/exports/audit-logs' + toQueryString(params)),
};
