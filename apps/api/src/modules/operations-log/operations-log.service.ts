import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class OperationsLogService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: {
    type?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
    page?: string;
    limit?: string;
  }) {
    const page = parseInt(query.page || '1');
    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const skip = (page - 1) * limit;
    const results: any[] = [];

    const fromDate = query.fromDate ? new Date(query.fromDate) : new Date(Date.now() - 7 * 86400000);
    const toDate = query.toDate ? new Date(query.toDate) : new Date();

    const types = query.type ? query.type.split(',') : ['all'];

    // Fetch transfer status changes
    if (types.includes('all') || types.includes('transfer')) {
      const statusChanges = await this.prisma.transferStatusHistory.findMany({
        where: {
          createdAt: { gte: fromDate, lte: toDate },
          ...(query.search ? {
            transferRequest: {
              patient: { fullName: { contains: query.search, mode: 'insensitive' } },
            },
          } : {}),
        },
        include: {
          changedByUser: { select: { id: true, firstName: true, lastName: true, role: true } },
          transferRequest: { select: { id: true, trackingToken: true, patient: { select: { fullName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      statusChanges.forEach((s) => {
        results.push({
          id: `status-${s.id}`,
          type: 'status_change',
          entityType: 'transfer',
          title: `Transfer ${s.status.replace(/_/g, ' ').toLowerCase()}`,
          description: `${s.transferRequest.patient.fullName} - ${s.status.replace(/_/g, ' ').toLowerCase()}`,
          timestamp: s.createdAt.toISOString(),
          actor: s.changedByUser,
          severity: 'info',
          entityId: s.transferRequest.id,
          trackingToken: s.transferRequest.trackingToken,
          metadata: { status: s.status },
        });
      });
    }

    // Fetch assignments
    if (types.includes('all') || types.includes('assignment')) {
      const assignments = await this.prisma.assignment.findMany({
        where: {
          assignedAt: { gte: fromDate, lte: toDate },
          ...(query.search ? {
            transferRequest: {
              patient: { fullName: { contains: query.search, mode: 'insensitive' } },
            },
          } : {}),
        },
        include: {
          transporter: { select: { id: true, firstName: true, lastName: true, role: true } },
          assignedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
          transferRequest: { select: { id: true, trackingToken: true, patient: { select: { fullName: true } } } },
        },
        orderBy: { assignedAt: 'desc' },
        take: limit,
      });
      assignments.forEach((a) => {
        results.push({
          id: `assignment-${a.id}`,
          type: 'assignment',
          entityType: 'assignment',
          title: `${a.transporter.firstName} ${a.transporter.lastName} assigned`,
          description: `To ${a.transferRequest.patient.fullName}`,
          timestamp: a.assignedAt.toISOString(),
          actor: a.assignedBy,
          severity: 'info',
          entityId: a.transferRequest.id,
          trackingToken: a.transferRequest.trackingToken,
          metadata: { transporterId: a.transporterId },
        });
      });
    }

    // Fetch comments
    if (types.includes('all') || types.includes('comment')) {
      const comments = await this.prisma.comment.findMany({
        where: {
          deletedAt: null,
          createdAt: { gte: fromDate, lte: toDate },
          ...(query.search ? { content: { contains: query.search, mode: 'insensitive' } } : {}),
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, role: true } },
          transferRequest: { select: { id: true, trackingToken: true, patient: { select: { fullName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      comments.forEach((c) => {
        results.push({
          id: `comment-${c.id}`,
          type: 'comment',
          entityType: 'comment',
          title: c.isImportant ? 'Important comment' : 'Comment',
          description: c.content.substring(0, 200),
          timestamp: c.createdAt.toISOString(),
          actor: c.user,
          severity: c.severity?.toLowerCase() || 'info',
          entityId: c.transferRequest?.id,
          trackingToken: c.transferRequest?.trackingToken,
          metadata: { commentId: c.id, isImportant: c.isImportant },
        });
      });
    }

    // Fetch oxygen alerts
    if (types.includes('all') || types.includes('oxygen')) {
      const tankHistory = await this.prisma.oxygenTankHistory.findMany({
        where: {
          createdAt: { gte: fromDate, lte: toDate },
          ...(query.search ? {
            tank: { code: { contains: query.search, mode: 'insensitive' } },
          } : {}),
        },
        include: {
          tank: { select: { id: true, code: true } },
          changedByUser: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      tankHistory.forEach((t) => {
        let severity = 'info';
        if (t.newStatus === 'CRITICAL') severity = 'critical';
        else if (t.newStatus === 'LOW') severity = 'warning';
        results.push({
          id: `oxygen-${t.id}`,
          type: 'oxygen',
          entityType: 'oxygen',
          title: `Tank ${t.tank.code} level changed`,
          description: `${t.previousLevel}% → ${t.newLevel}% (${t.newStatus})`,
          timestamp: t.createdAt.toISOString(),
          actor: t.changedByUser,
          severity,
          entityId: t.tank.id,
          metadata: { tankCode: t.tank.code, previousLevel: t.previousLevel, newLevel: t.newLevel },
        });
      });
    }

    // Fetch shift events
    if (types.includes('all') || types.includes('shift')) {
      const shifts = await this.prisma.shift.findMany({
        where: {
          createdAt: { gte: fromDate, lte: toDate },
          ...(query.search ? {
            user: {
              OR: [
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          } : {}),
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      shifts.forEach((s) => {
        results.push({
          id: `shift-${s.id}`,
          type: 'shift',
          entityType: 'shift',
          title: `Shift ${s.type} ${s.isActive ? 'started' : 'ended'}`,
          description: `${s.shiftCode} - ${s.user.firstName} ${s.user.lastName}`,
          timestamp: (s.isActive ? s.createdAt : s.endedAt)?.toISOString() || s.createdAt.toISOString(),
          actor: s.user,
          severity: 'info',
          entityId: s.id,
          metadata: { shiftCode: s.shiftCode, type: s.type, isActive: s.isActive },
        });
      });
    }

    // Fetch handoffs
    if (types.includes('all') || types.includes('handoff')) {
      const handoffs = await this.prisma.shiftHandoff.findMany({
        where: {
          handoffAt: { gte: fromDate, lte: toDate },
        },
        include: {
          handedOffBy: { select: { id: true, firstName: true, lastName: true, role: true } },
          receivedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
          shift: { select: { shiftCode: true, type: true } },
        },
        orderBy: { handoffAt: 'desc' },
        take: limit,
      });
      handoffs.forEach((h) => {
        results.push({
          id: `handoff-${h.id}`,
          type: 'handoff',
          entityType: 'handoff',
          title: `Shift handoff completed`,
          description: `${h.shift.shiftCode} - ${h.handedOffBy.firstName} → ${h.receivedBy.firstName}`,
          timestamp: h.handoffAt.toISOString(),
          actor: h.handedOffBy,
          severity: 'info',
          entityId: h.shiftId,
          metadata: { shiftCode: h.shift.shiftCode, receivedById: h.receivedById },
        });
      });
    }

    // Fetch security incidents
    if (types.includes('all') || types.includes('security')) {
      const incidents = await this.prisma.securityIncident.findMany({
        where: {
          createdAt: { gte: fromDate, lte: toDate },
          ...(query.search ? { description: { contains: query.search, mode: 'insensitive' } } : {}),
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      incidents.forEach((inc) => {
        results.push({
          id: `security-${inc.id}`,
          type: 'security',
          entityType: 'security',
          title: `Security incident: ${inc.type}`,
          description: inc.description.substring(0, 200),
          timestamp: inc.createdAt.toISOString(),
          actor: inc.user,
          severity: inc.severity?.toLowerCase() || 'warning',
          entityId: inc.id,
          metadata: { incidentType: inc.type, resolved: !!inc.resolvedAt },
        });
      });
    }

    // Sort by timestamp descending
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = results.length;
    const paginatedResults = results.slice(skip, skip + limit);

    return {
      data: paginatedResults,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
