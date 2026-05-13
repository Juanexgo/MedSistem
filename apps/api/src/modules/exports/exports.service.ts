import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '@prisma/client';

/**
 * Parse an optional date string from query params. Empty strings and the
 * literal "undefined"/"null" (which `URLSearchParams` produces from undefined
 * values) are rejected, and invalid dates return undefined rather than
 * "Invalid Date" — Prisma would otherwise throw a validation error.
 */
function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return undefined;
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

@Injectable()
export class ExportsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async exportTransfers(from?: string, to?: string, userId?: string, request?: any) {
    const where: any = { deletedAt: null };
    const gte = parseDate(from);
    const lte = parseDate(to);
    if (gte || lte) {
      where.requestedAt = {};
      if (gte) where.requestedAt.gte = gte;
      if (lte) where.requestedAt.lte = lte;
    }

    const data = await this.prisma.transferRequest.findMany({
      where,
      include: {
        patient: true,
        authorizingUser: { select: { firstName: true, lastName: true } },
        assignedTransporter: { select: { firstName: true, lastName: true } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { requestedAt: 'desc' },
    });

    if (userId) {
      await this.auditService.log({
        userId, action: AuditAction.EXPORT, entity: 'Transfer', entityId: 'export',
        request, comment: `Exported ${data.length} transfers`,
      });
    }

    return data;
  }

  async exportAuditLogs(from?: string, to?: string, userId?: string, request?: any) {
    const where: any = {};
    const gte = parseDate(from);
    const lte = parseDate(to);
    if (gte || lte) {
      where.createdAt = {};
      if (gte) where.createdAt.gte = gte;
      if (lte) where.createdAt.lte = lte;
    }

    const data = await this.prisma.auditLog.findMany({
      where,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (userId) {
      await this.auditService.log({
        userId, action: AuditAction.EXPORT, entity: 'AuditLog', entityId: 'export',
        request, comment: `Exported ${data.length} audit logs`,
      });
    }

    return data;
  }
}
