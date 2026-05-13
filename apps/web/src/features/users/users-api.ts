import { api } from '@/lib/api';
import type { ManagedUser, CreateUserInput, UpdateUserInput } from './types';

export const usersApi = {
  list: () => api.get<ManagedUser[]>('/users'),
  get: (id: string) => api.get<ManagedUser>(`/users/${id}`),
  create: (input: CreateUserInput) => api.post<ManagedUser>('/users', input),
  update: (id: string, input: UpdateUserInput) => api.put<ManagedUser>(`/users/${id}`, input),
  remove: (id: string) => api.delete<{ message: string }>(`/users/${id}`),
  restore: (id: string) => api.post<ManagedUser>(`/users/${id}/restore`),
  updateEmployeeStatus: (id: string, employeeStatus: string) =>
    api.put<ManagedUser>(`/users/${id}/employee-status`, { employeeStatus }),
};
