import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '@prisma/client';
import { QuerySecurityIncidentsDto } from './dto/security-incidents.dto';

@Injectable()
export class SecurityIncidentsService {
  private readonly logger = new Logger(SecurityIncidentsService.name);

  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
    private auditService: AuditService,
  ) {}

  async create(params: {
    userId?: string;
    type: string;
    severity: string;
    description: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  }) {
    try {
      const incident = await this.prisma.securityIncident.create({
        data: {
          userId: params.userId,
          type: params.type,
          severity: params.severity,
          description: params.description,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          metadata: params.metadata || undefined,
        },
      });
      this.eventsService.broadcast('security.incident_created', {
        incidentId: incident.id,
        type: incident.type,
        severity: incident.severity,
        description: incident.description,
      });
      return incident;
    } catch (error) {
      this.logger.error(`Failed to create security incident: ${error}`);
    }
  }

  async findAll(query: QuerySecurityIncidentsDto) {
    const where: any = {};
    const page = parseInt(query.page || '1');
    const limit = Math.min(parseInt(query.limit || '20'), 100);
    const skip = (page - 1) * limit;

    if (query.type) where.type = query.type;
    if (query.severity) where.severity = query.severity;
    if (query.status === 'resolved') where.resolvedAt = { not: null };
    else if (query.status === 'open') where.resolvedAt = null;
    if (query.userId) where.userId = query.userId;
    if (query.search) {
      where.OR = [
        { description: { contains: query.search, mode: 'insensitive' } },
        { type: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
      if (query.toDate) where.createdAt.lte = new Date(query.toDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.securityIncident.findMany({
        where,
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.securityIncident.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const incident = await this.prisma.securityIncident.findUnique({
      where: { id },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
    });
    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }

  async resolve(id: string, resolvedById: string, resolution: string, request?: any) {
    const incident = await this.findById(id);
    const updated = await this.prisma.securityIncident.update({
      where: { id },
      data: { resolvedAt: new Date(), resolvedById, resolution },
    });

    await this.auditService.log({
      userId: resolvedById, action: AuditAction.RESOLVE, entity: 'SecurityIncident', entityId: id,
      request, comment: `Incident resolved: ${resolution}`,
    });

    return updated;
  }
}
