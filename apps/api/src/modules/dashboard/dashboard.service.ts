import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(timeRange?: string, zone?: string, priority?: string) {
    const now = new Date();
    const rangeStart = this.getRangeStart(timeRange, now);

    const zoneFilter = zone ? { origin: zone } : undefined;
    const priorityFilter = priority ? { priority: priority as any } : undefined;
    const baseWhere = { deletedAt: null, ...zoneFilter, ...priorityFilter };
    const rangeWhere = { ...baseWhere, requestedAt: { gte: rangeStart } };

    const [
      totalToday,
      urgentToday,
      activeTransports,
      completedToday,
      cancelledToday,
      delayedTransports,
      allTodayTransfers,
      activeEmployees,
      availableTransporters,
      busyTransporters,
      lowTanks,
      criticalTanks,
      pendingShifts,
      pendingHandoffs,
      incidentsToday,
      importantComments,
      unassignedUrgent,
      responseTimes,
      completionTimes,
    ] = await Promise.all([
      this.prisma.transferRequest.count({ where: rangeWhere }),
      this.prisma.transferRequest.count({ where: { ...rangeWhere, priority: 'URGENT' } }),
      this.prisma.transferRequest.count({
        where: { ...baseWhere, status: { in: ['ASSIGNED', 'ON_THE_WAY', 'PATIENT_PICKED_UP', 'IN_TRANSFER', 'IN_STUDY'] } },
      }),
      this.prisma.transferRequest.count({ where: { ...rangeWhere, status: 'COMPLETED' } }),
      this.prisma.transferRequest.count({ where: { ...rangeWhere, status: 'CANCELLED' } }),
      this.prisma.transferRequest.count({
        where: {
          ...baseWhere,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          requestedAt: { lte: new Date(now.getTime() - 25 * 60000) },
          deletedAt: null,
        },
      }),
      this.prisma.transferRequest.findMany({
        where: rangeWhere,
        select: { requestedAt: true, completedAt: true, assignedAt: true, status: true, priority: true },
      }),
      this.prisma.user.count({ where: { isActive: true, deletedAt: null, employeeStatus: { not: 'OFF_SHIFT' } } }),
      this.prisma.user.count({ where: { role: 'TRANSPORTER', isActive: true, deletedAt: null, employeeStatus: 'AVAILABLE' } }),
      this.prisma.user.count({ where: { role: 'TRANSPORTER', isActive: true, deletedAt: null, employeeStatus: { in: ['BUSY', 'IN_TRANSFER'] } } }),
      this.prisma.oxygenTank.count({ where: { status: 'LOW', deletedAt: null } }),
      this.prisma.oxygenTank.count({ where: { status: 'CRITICAL', deletedAt: null } }),
      this.prisma.shift.count({ where: { isActive: true } }),
      this.prisma.shift.count({ where: { isActive: false, handoff: null, endedAt: { not: null } } }),
      this.prisma.securityIncident.count({ where: { createdAt: { gte: rangeStart } } }),
      this.prisma.comment.count({ where: { isImportant: true, resolvedAt: null, deletedAt: null } }),
      this.prisma.transferRequest.count({
        where: { ...baseWhere, status: 'REQUESTED', priority: 'URGENT', assignedTransporterId: null },
      }),
      this.getResponseTimes(rangeStart, now, zone),
      this.getCompletionTimes(rangeStart, now, zone),
    ]);

    const slaCompliance = totalToday > 0
      ? Math.round(((totalToday - delayedTransports) / totalToday) * 100)
      : 100;

    const { avgResponseTime, avgCompletionTime } = this.calcAverages(allTodayTransfers, responseTimes, completionTimes);

    const { priorityBreakdown, hourlyBreakdown } = this.calcBreakdowns(allTodayTransfers);

    const currentShiftType = this.getCurrentShiftTypeLabel();

    return {
      metrics: {
        totalToday,
        urgentToday,
        activeTransports,
        completedToday,
        cancelledToday,
        delayedTransports,
        slaCompliance,
        averageResponseTime: avgResponseTime,
        averageCompletionTime: avgCompletionTime,
        activeEmployees,
        availableTransporters,
        busyTransporters,
        lowTanks,
        criticalTanks,
        pendingShifts,
        pendingHandoffs,
        incidentsToday,
        importantComments,
        unassignedUrgent,
        currentShiftType,
      },
      priorityBreakdown,
      hourlyBreakdown,
    };
  }

  async getTransporterAvailability() {
    const transporters = await this.prisma.user.findMany({
      where: { role: 'TRANSPORTER', isActive: true, deletedAt: null },
      select: { employeeStatus: true },
    });

    const counts: Record<string, number> = {
      AVAILABLE: 0, BUSY: 0, IN_TRANSFER: 0, BREAK: 0, OFF_SHIFT: 0,
    };
    transporters.forEach((t) => {
      counts[t.employeeStatus] = (counts[t.employeeStatus] || 0) + 1;
    });

    return {
      available: counts.AVAILABLE,
      busy: counts.BUSY,
      inTransfer: counts.IN_TRANSFER,
      onBreak: counts.BREAK,
      offShift: counts.OFF_SHIFT,
      total: transporters.length,
    };
  }

  async getZoneSaturation() {
    const zones = await this.prisma.hospitalZone.findMany({
      where: { isActive: true },
      select: { name: true, color: true },
      orderBy: { order: 'asc' },
    });

    const activeTransfers = await this.prisma.transferRequest.findMany({
      where: { deletedAt: null, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      select: { origin: true, destination: true },
    });

    const zoneCounts: Record<string, number> = {};
    activeTransfers.forEach((t) => {
      zoneCounts[t.origin] = (zoneCounts[t.origin] || 0) + 1;
      zoneCounts[t.destination] = (zoneCounts[t.destination] || 0) + 1;
    });

    return zones.map((z) => ({
      zone: z.name,
      activeCount: zoneCounts[z.name] || 0,
      color: z.color || '#94a3b8',
    })).sort((a, b) => b.activeCount - a.activeCount);
  }

  async getOxygenSummary() {
    const tanks = await this.prisma.oxygenTank.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, level: true, status: true, location: true },
      orderBy: [{ status: 'asc' }, { level: 'asc' }],
    });

    const lowTanks = tanks.filter((t) => t.status === 'LOW' || t.status === 'CRITICAL');
    const counts = { full: 0, medium: 0, low: 0, critical: 0 };
    tanks.forEach((t) => {
      const key = t.status.toLowerCase() as keyof typeof counts;
      counts[key] = (counts[key] || 0) + 1;
    });

    return {
      ...counts,
      total: tanks.length,
      lowTanks: lowTanks.map((t) => ({
        id: t.id, code: t.code, level: t.level, status: t.status, location: t.location,
      })),
    };
  }

  async getActiveTransfers(zone?: string, assignedTransporterId?: string) {
    const transfers = await this.prisma.transferRequest.findMany({
      where: {
        deletedAt: null,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        ...(zone ? { origin: zone } : {}),
        ...(assignedTransporterId ? { assignedTransporterId } : {}),
      },
      include: {
        patient: { select: { fullName: true } },
        assignedTransporter: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ priority: 'asc' }, { requestedAt: 'asc' }],
    });

    return transfers.map((t) => this.toTransferRow(t));
  }

  async getUnassignedUrgentTransfers() {
    const transfers = await this.prisma.transferRequest.findMany({
      where: {
        deletedAt: null,
        status: 'REQUESTED',
        priority: 'URGENT',
        assignedTransporterId: null,
      },
      include: {
        patient: { select: { fullName: true } },
        assignedTransporter: { select: { firstName: true, lastName: true } },
      },
      orderBy: { requestedAt: 'asc' },
    });

    return transfers.map((t) => this.toTransferRow(t));
  }

  async getRecentActivity() {
    const [statusChanges, assignments, comments] = await Promise.all([
      this.prisma.transferStatusHistory.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          changedByUser: { select: { id: true, firstName: true, lastName: true, role: true } },
          transferRequest: { select: { id: true, trackingToken: true, patient: { select: { fullName: true } } } },
        },
      }),
      this.prisma.assignment.findMany({
        take: 10,
        orderBy: { assignedAt: 'desc' },
        include: {
          transporter: { select: { id: true, firstName: true, lastName: true, role: true } },
          assignedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
          transferRequest: { select: { id: true, trackingToken: true, patient: { select: { fullName: true } } } },
        },
      }),
      this.prisma.comment.findMany({
        take: 10,
        where: { isImportant: true, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, role: true } },
          transferRequest: { select: { id: true, trackingToken: true, patient: { select: { fullName: true } } } },
        },
      }),
    ]);

    const events: any[] = [];

    statusChanges.forEach((s) => {
      events.push({
        type: 'status_change',
        title: `Transfer ${s.status.replace(/_/g, ' ').toLowerCase()}`,
        description: `Transfer for ${s.transferRequest.patient.fullName} is now ${s.status.replace(/_/g, ' ').toLowerCase()}`,
        timestamp: s.createdAt.toISOString(),
        actor: s.changedByUser,
        metadata: { transferId: s.transferRequest.id, trackingToken: s.transferRequest.trackingToken, newStatus: s.status },
      });
    });

    assignments.forEach((a) => {
      events.push({
        type: 'assignment',
        title: `${a.transporter.firstName} ${a.transporter.lastName} assigned`,
        description: `Assigned to ${a.transferRequest.patient.fullName}`,
        timestamp: a.assignedAt.toISOString(),
        actor: a.assignedBy,
        metadata: { transferId: a.transferRequest.id, trackingToken: a.transferRequest.trackingToken, transporterId: a.transporterId },
      });
    });

    comments.forEach((c) => {
      events.push({
        type: 'comment',
        title: 'Important comment',
        description: c.content.length > 100 ? c.content.substring(0, 100) + '...' : c.content,
        timestamp: c.createdAt.toISOString(),
        actor: c.user,
        metadata: { transferId: c.transferRequest?.id, commentId: c.id },
      });
    });

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return events.slice(0, 20);
  }

  async getFullDashboard(timeRange?: string, zone?: string, priority?: string): Promise<any> {
    const [
      baseMetrics,
      transporterAvailability,
      zoneSaturation,
      oxygenSummary,
      activeTransfers,
      unassignedUrgentTransfers,
      recentActivity,
      pendingHandoffList,
      currentShiftInfo,
    ] = await Promise.all([
      this.getMetrics(timeRange, zone, priority),
      this.getTransporterAvailability(),
      this.getZoneSaturation(),
      this.getOxygenSummary(),
      this.getActiveTransfers(zone),
      this.getUnassignedUrgentTransfers(),
      this.getRecentActivity(),
      this.getPendingHandoffDetails(),
      this.getCurrentShiftDetails(),
    ]);

    return {
      ...baseMetrics,
      transporterAvailability,
      zoneSaturation,
      oxygenSummary,
      activeTransfers,
      unassignedUrgentTransfers,
      recentActivity,
      pendingHandoffList,
      currentShiftInfo,
    };
  }

  private async getPendingHandoffDetails() {
    const shifts = await this.prisma.shift.findMany({
      where: { isActive: false, handoff: null, endedAt: { not: null } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { endedAt: 'desc' },
      take: 5,
    });
    return shifts;
  }

  private async getCurrentShiftDetails() {
    const activeShifts = await this.prisma.shift.findMany({
      where: { isActive: true },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
      take: 10,
    });
    return activeShifts;
  }

  private getCurrentShiftTypeLabel(): string {
    const hour = new Date().getHours();
    const minute = new Date().getMinutes();
    const totalMinutes = hour * 60 + minute;
    if (totalMinutes >= 8 * 60 + 30 && totalMinutes < 15 * 60) return 'MORNING';
    if (totalMinutes >= 15 * 60 && totalMinutes < 21 * 60) return 'EVENING';
    return 'NIGHT';
  }

  private toTransferRow(t: any) {
    const elapsed = t.completedAt
      ? Math.round((t.completedAt.getTime() - t.requestedAt.getTime()) / 60000)
      : Math.round((Date.now() - t.requestedAt.getTime()) / 60000);
    return {
      id: t.id,
      trackingToken: t.trackingToken,
      patientName: t.patient?.fullName || 'Unknown',
      bedNumber: t.bedNumber,
      floor: t.floor,
      origin: t.origin,
      destination: t.destination,
      priority: t.priority,
      status: t.status,
      transportType: t.transportType,
      assignedTransporterName: t.assignedTransporter
        ? `${t.assignedTransporter.firstName} ${t.assignedTransporter.lastName}`
        : undefined,
      elapsedMinutes: elapsed,
      requestedAt: t.requestedAt.toISOString(),
    };
  }

  private getRangeStart(timeRange?: string, now?: Date): Date {
    const n = now || new Date();
    switch (timeRange) {
      case 'shift': {
        const hour = n.getHours();
        if (hour < 7) return new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1, 21);
        if (hour < 15) return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 7);
        return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 15);
      }
      case '7days': return new Date(n.getTime() - 7 * 86400000);
      case '30days': return new Date(n.getTime() - 30 * 86400000);
      default: return new Date(n.getFullYear(), n.getMonth(), n.getDate());
    }
  }

  private async getResponseTimes(rangeStart: Date, now: Date, zone?: string) {
    const transfers = await this.prisma.transferRequest.findMany({
      where: {
        assignedAt: { not: null, gte: rangeStart },
        deletedAt: null,
        ...(zone ? { origin: zone } : {}),
      },
      select: { requestedAt: true, assignedAt: true },
    });
    return transfers
      .map((t) => (t.assignedAt!.getTime() - t.requestedAt.getTime()) / 60000)
      .filter((m) => m > 0);
  }

  private async getCompletionTimes(rangeStart: Date, now: Date, zone?: string) {
    const transfers = await this.prisma.transferRequest.findMany({
      where: {
        completedAt: { not: null, gte: rangeStart },
        deletedAt: null,
        ...(zone ? { origin: zone } : {}),
      },
      select: { requestedAt: true, completedAt: true },
    });
    return transfers
      .map((t) => (t.completedAt!.getTime() - t.requestedAt.getTime()) / 60000)
      .filter((m) => m > 0);
  }

  private calcAverages(allTransfers: any[], responseTimes: number[], completionTimes: number[]) {
    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

    const completed = allTransfers.filter((t) => t.status === 'COMPLETED' && t.completedAt);
    const avgCompletionTime = completionTimes.length > 0
      ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
      : 0;

    return { avgResponseTime, avgCompletionTime };
  }

  private calcBreakdowns(transfers: any[]) {
    const priorityBreakdown: Record<string, number> = { URGENT: 0, HIGH: 0, NORMAL: 0, SCHEDULED: 0 };
    const hourlyBreakdown: Record<number, number> = {};

    transfers.forEach((t) => {
      priorityBreakdown[t.priority] = (priorityBreakdown[t.priority] || 0) + 1;
      const hour = new Date(t.requestedAt).getHours();
      hourlyBreakdown[hour] = (hourlyBreakdown[hour] || 0) + 1;
    });

    return {
      priorityBreakdown: Object.entries(priorityBreakdown).map(([key, value]) => ({ priority: key, count: value })),
      hourlyBreakdown: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: hourlyBreakdown[i] || 0 })),
    };
  }
}
