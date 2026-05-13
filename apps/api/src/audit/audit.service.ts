import { Injectable, Logger } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { Request } from 'express';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const where: any = {};
    const page = parseInt(query.page || '1');
    const limit = Math.min(parseInt(query.limit || '50'), 200);
    const skip = (page - 1) * limit;

    if (query.action) where.action = query.action;
    if (query.entity) where.entity = { contains: query.entity, mode: 'insensitive' };
    if (query.userId) where.userId = query.userId;
    if (query.search) {
      where.OR = [
        { entity: { contains: query.search, mode: 'insensitive' } },
        { comment: { contains: query.search, mode: 'insensitive' } },
        { entityId: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
      if (query.toDate) where.createdAt.lte = new Date(query.toDate);
    }

    if (query.role) {
      where.user = { role: query.role as any };
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async log(params: {
    userId?: string;
    action: AuditAction;
    entity: string;
    entityId?: string;
    previousData?: any;
    newData?: any;
    request?: Request;
    comment?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          previousData: params.previousData || undefined,
          newData: params.newData || undefined,
          ipAddress: params.request?.ip,
          userAgent: params.request?.headers['user-agent'],
          comment: params.comment,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error}`);
    }
  }
}
