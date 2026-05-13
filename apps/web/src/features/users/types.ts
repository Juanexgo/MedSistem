export type UserRole =
  | 'ADMIN'
  | 'HEAD_NURSE'
  | 'NURSING'
  | 'TRANSPORTER'
  | 'SUPERVISOR'
  | 'AUDITOR'
  | 'DOCTOR';

export type EmployeeStatus =
  | 'AVAILABLE'
  | 'BUSY'
  | 'IN_TRANSFER'
  | 'BREAK'
  | 'OFF_SHIFT';

export interface ManagedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  roleId?: string | null;
  employeeStatus?: EmployeeStatus | null;
  department?: string | null;
  phone?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  department?: string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  employeeStatus?: EmployeeStatus;
  phone?: string;
  department?: string;
  password?: string;
}
