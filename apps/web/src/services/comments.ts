import { api } from '@/lib/api';

export interface CreateCommentData {
  content: string;
  isImportant?: boolean;
  transferRequestId?: string;
  type?: string;
  severity?: string;
  category?: string;
}

export interface QueryCommentsParams {
  type?: string;
  severity?: string;
  status?: string;
  transferRequestId?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
  isImportant?: string;
  search?: string;
  page?: string;
  limit?: string;
}

export const commentsApi = {
  list: (params?: QueryCommentsParams) => api.get<any>('/comments?' + new URLSearchParams(params as any).toString()),
  getById: (id: string) => api.get<any>(`/comments/${id}`),
  getByTransfer: (transferId: string) => api.get<any>(`/comments/transfer/${transferId}`),
  create: (data: CreateCommentData) => api.post<any>('/comments', data),
  markImportant: (id: string) => api.post<any>(`/comments/${id}/important`),
  resolve: (id: string) => api.post<any>(`/comments/${id}/resolve`),
  close: (id: string) => api.post<any>(`/comments/${id}/close`),
};
