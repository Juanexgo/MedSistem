export interface Patient {
  id: string;
  fullName: string;
  bedNumber: string;
  floor: string;
  medicalRecordNumber?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePatientInput {
  fullName: string;
  bedNumber: string;
  floor: string;
  medicalRecordNumber?: string;
  notes?: string;
}

export type UpdatePatientInput = Partial<CreatePatientInput>;
