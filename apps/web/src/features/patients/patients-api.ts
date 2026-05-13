import { api } from '@/lib/api';
import type { Patient, CreatePatientInput, UpdatePatientInput } from './types';

export const patientsApi = {
  list: () => api.get<Patient[]>('/patients'),
  get: (id: string) => api.get<Patient>(`/patients/${id}`),
  create: (input: CreatePatientInput) => api.post<Patient>('/patients', input),
  update: (id: string, input: UpdatePatientInput) => api.put<Patient>(`/patients/${id}`, input),
  remove: (id: string) => api.delete<{ message: string }>(`/patients/${id}`),
};
