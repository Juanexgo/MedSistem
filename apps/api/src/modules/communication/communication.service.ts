import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CommunicationService {
  constructor(private prisma: PrismaService) {}

  async getOperationsCenter() {
    const [recentComments, unresolvedIncidents, activeAlerts] = await Promise.all([
      this.prisma.comment.findMany({
        where: { deletedAt: null },
        include: { user: { select: { id: true, firstName: true, lastName: true, role: true } }, transferRequest: { select: { id: true, trackingToken: true } } },
        orderBy: { createdAt: 'desc' }, take: 20,
      }),
      this.prisma.securityIncident.findMany({ where: { resolvedAt: null }, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.notification.findMany({ where: { isRead: false }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);

    return { recentComments, unresolvedIncidents, activeAlerts };
  }
}
