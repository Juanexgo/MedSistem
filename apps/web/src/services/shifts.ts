import { api } from '@/lib/api';

export const shiftsApi = {
  startShift: (type: string) => api.post<any>('/shifts/start', { type }),

  endShift: (shiftId: string, observations?: string) =>
    api.put<any>(`/shifts/${shiftId}/end`, { observations }),

  getCurrentShift: () => api.get<any>('/shifts/current'),

  getCurrentShiftType: () => api.get<{ type: string; startTime: string; endTime: string }>('/shifts/type'),

  getShiftById: (shiftId: string) => api.get<any>(`/shifts/${shiftId}`),

  getAllShifts: (page = 1, limit = 20) =>
    api.get<any>(`/shifts?page=${page}&limit=${limit}`),

  getActiveShifts: () => api.get<any[]>('/shifts/active'),

  getShiftHistory: (page = 1, limit = 20) =>
    api.get<any>(`/shifts/history?page=${page}&limit=${limit}`),

  getPendingHandoffShifts: () => api.get<any[]>('/shifts/pending-handoff'),

  createHandoff: (shiftId: string, data: any) =>
    api.post<any>(`/shift-handoff/${shiftId}`, data),

  getHandoffByShift: (shiftId: string) => api.get<any>(`/shift-handoff/${shiftId}`),

  getAllHandoffs: (page = 1, limit = 20) =>
    api.get<any>(`/shift-handoff?page=${page}&limit=${limit}`),

  getPendingHandoffs: () => api.get<any[]>('/shift-handoff/pending'),

  getHandoffsByUser: (userId: string, page = 1, limit = 20) =>
    api.get<any>(`/shift-handoff/user/${userId}?page=${page}&limit=${limit}`),
};
