import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, type Patient } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePatientDto, UpdatePatientDto } from './dto/patients.dto';
import { AuditService } from '../../audit/audit.service';

/**
 * Roles that get a sanitized patient view (no medical record number, no notes).
 * Anyone NOT in this set gets the full record.
 */
const LIMITED_VIEW_ROLES = new Set<UserRole>([UserRole.TRANSPORTER]);

export type PatientView = Omit<Patient, 'medicalRecordNumber' | 'notes'> & {
  medicalRecordNumber?: string | null;
  notes?: string | null;
};

function sanitizePatient(patient: Patient, role: UserRole | undefined): PatientView {
  if (!role || !LIMITED_VIEW_ROLES.has(role)) {
    return patient;
  }
  const { medicalRecordNumber: _mrn, notes: _notes, ...rest } = patient;
  return rest;
}

@Injectable()
export class PatientsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(dto: CreatePatientDto) {
    return this.prisma.patient.create({ data: dto });
  }

  async findAll(role?: UserRole) {
    const patients = await this.prisma.patient.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return patients.map((p) => sanitizePatient(p, role));
  }

  async findById(id: string, role?: UserRole) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient || patient.deletedAt) throw new NotFoundException('Patient not found');
    return sanitizePatient(patient, role);
  }

  private async loadFull(id: string): Promise<Patient> {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient || patient.deletedAt) throw new NotFoundException('Patient not found');
    return patient;
  }

  async update(id: string, dto: UpdatePatientDto) {
    await this.loadFull(id);
    return this.prisma.patient.update({ where: { id }, data: dto });
  }

  async softDelete(id: string) {
    await this.loadFull(id);
    await this.prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { message: 'Patient deleted' };
  }
}
