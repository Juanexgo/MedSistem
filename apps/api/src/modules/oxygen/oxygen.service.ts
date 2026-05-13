import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { EventsService } from '../events/events.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOxygenTankDto, UpdateOxygenTankDto, UpdateTankLevelDto } from './dto/oxygen.dto';
import { AuditAction, OxygenTankStatus, NotificationType } from '@prisma/client';

const LEVEL_THRESHOLDS = {
  CRITICAL: 15,
  LOW: 40,
  MEDIUM: 75,
};

function calculateStatus(level: number): OxygenTankStatus {
  if (level >= LEVEL_THRESHOLDS.MEDIUM) return OxygenTankStatus.FULL;
  if (level >= LEVEL_THRESHOLDS.LOW) return OxygenTankStatus.MEDIUM;
  if (level >= LEVEL_THRESHOLDS.CRITICAL) return OxygenTankStatus.LOW;
  return OxygenTankStatus.CRITICAL;
}

@Injectable()
export class OxygenService {
  private readonly logger = new Logger(OxygenService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private eventsService: EventsService,
    private notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateOxygenTankDto, userId: string) {
    const computedStatus = dto.status || calculateStatus(dto.level);

    const tank = await this.prisma.oxygenTank.create({
      data: {
        code: dto.code,
        level: dto.level,
        status: computedStatus,
        psi: dto.psi,
        capacity: dto.capacity,
        location: dto.location,
        isAvailable: dto.isAvailable ?? true,
        notes: dto.notes,
      },
    });

    await this.auditService.log({
      userId, action: AuditAction.CREATE, entity: 'OxygenTank', entityId: tank.id,
      newData: { code: tank.code, level: tank.level, status: tank.status, location: tank.location },
      comment: `Oxygen tank ${tank.code} created`,
    });

    this.eventsService.broadcast('oxygen.tank_created', { tankId: tank.id, code: tank.code, status: tank.status });
    this.eventsService.broadcast('dashboard.metrics_updated', { timestamp: new Date().toISOString() });

    return tank;
  }

  async findAll(filters?: { status?: string; location?: string; isAvailable?: string; search?: string }) {
    const where: any = { deletedAt: null };

    if (filters?.status) {
      const statuses = filters.status.split(',') as OxygenTankStatus[];
      where.status = { in: statuses };
    }
    if (filters?.location) where.location = { contains: filters.location, mode: 'insensitive' };
    if (filters?.isAvailable !== undefined) where.isAvailable = filters.isAvailable === 'true';
    if (filters?.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { location: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.oxygenTank.findMany({
      where,
      include: {
        transfers: {
          where: { deletedAt: null, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          select: { id: true, trackingToken: true, status: true, patient: { select: { fullName: true } } },
        },
        _count: { select: { history: true } },
      },
      orderBy: [{ status: 'asc' }, { code: 'asc' }],
    });
  }

  async findById(id: string) {
    const tank = await this.prisma.oxygenTank.findUnique({
      where: { id },
      include: {
        transfers: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, trackingToken: true, status: true, origin: true, destination: true, patient: { select: { fullName: true } } },
        },
        history: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { changedByUser: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });
    if (!tank || tank.deletedAt) throw new NotFoundException('Tank not found');
    return tank;
  }

  async update(id: string, dto: UpdateOxygenTankDto, userId: string) {
    const tank = await this.findById(id);

    const previousData = { code: tank.code, level: tank.level, status: tank.status, psi: tank.psi, location: tank.location, isAvailable: tank.isAvailable };

    const updateData: any = {};
    if (dto.code !== undefined) updateData.code = dto.code;
    if (dto.level !== undefined) {
      updateData.level = dto.level;
      updateData.status = calculateStatus(dto.level);
    }
    if (dto.psi !== undefined) updateData.psi = dto.psi;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.isAvailable !== undefined) updateData.isAvailable = dto.isAvailable;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.status !== undefined) updateData.status = dto.status;

    const updated = await this.prisma.oxygenTank.update({ where: { id }, data: updateData });

    if (dto.level !== undefined && dto.level !== tank.level) {
      await this.prisma.oxygenTankHistory.create({
        data: {
          tankId: id, previousLevel: tank.level, newLevel: updated.level,
          previousStatus: tank.status, newStatus: updated.status,
          changedByUserId: userId,
        },
      });
    }

    await this.auditService.log({
      userId, action: AuditAction.UPDATE, entity: 'OxygenTank', entityId: id,
      previousData, newData: updateData,
      comment: `Tank ${tank.code} updated`,
    });

    this.eventsService.broadcast('oxygen.tank_updated', {
      tankId: id, code: tank.code, previousStatus: tank.status, newStatus: updated.status, level: updated.level,
    });

    await this.checkAndAlert(id, updated, userId);
    this.eventsService.broadcast('dashboard.metrics_updated', { timestamp: new Date().toISOString() });

    return updated;
  }

  async updateLevel(id: string, dto: UpdateTankLevelDto, userId: string) {
    return this.update(id, { level: dto.level, psi: dto.psi, status: dto.status }, userId);
  }

  async updateStatus(id: string, status: OxygenTankStatus, userId: string) {
    return this.update(id, { status }, userId);
  }

  async updateLocation(id: string, location: string, userId: string) {
    return this.update(id, { location }, userId);
  }

  async toggleAvailability(id: string, isAvailable: boolean, userId: string) {
    return this.update(id, { isAvailable }, userId);
  }

  async getLowTanks() {
    return this.prisma.oxygenTank.findMany({
      where: { status: { in: [OxygenTankStatus.LOW, OxygenTankStatus.CRITICAL] }, deletedAt: null },
      orderBy: [{ status: 'asc' }, { level: 'asc' }],
    });
  }

  async getAlerts() {
    const tanks = await this.prisma.oxygenTank.findMany({
      where: { deletedAt: null },
      orderBy: [{ status: 'asc' }, { level: 'asc' }],
    });

    const alerts: Array<{ type: string; severity: string; tankId: string; code: string; message: string }> = [];

    for (const tank of tanks) {
      if (tank.status === OxygenTankStatus.CRITICAL) {
        alerts.push({ type: 'CRITICAL_TANK', severity: 'critical', tankId: tank.id, code: tank.code, message: `Tank ${tank.code} at ${tank.level}% — critically low` });
      } else if (tank.status === OxygenTankStatus.LOW) {
        alerts.push({ type: 'LOW_TANK', severity: 'warning', tankId: tank.id, code: tank.code, message: `Tank ${tank.code} at ${tank.level}% — low` });
      }
    }

    return alerts;
  }

  async releaseTank(tankId: string, transferId: string, userId: string) {
    const tank = await this.prisma.oxygenTank.findUnique({ where: { id: tankId } });
    if (!tank) throw new NotFoundException('Tank not found');

    const updated = await this.prisma.oxygenTank.update({
      where: { id: tankId },
      data: { isAvailable: true },
    });

    await this.auditService.log({
      userId, action: AuditAction.UPDATE, entity: 'OxygenTank', entityId: tankId,
      previousData: { isAvailable: false, assignedTransfer: transferId },
      newData: { isAvailable: true },
      comment: `Tank ${tank.code} released from transfer ${transferId}`,
    });

    this.eventsService.broadcast('oxygen.tank_released', { tankId, code: tank.code, transferId });
    this.eventsService.broadcast('dashboard.metrics_updated', { timestamp: new Date().toISOString() });

    return updated;
  }

  async softDelete(id: string, userId: string) {
    const tank = await this.findById(id);
    await this.prisma.oxygenTank.update({ where: { id }, data: { deletedAt: new Date(), isAvailable: false } });

    await this.auditService.log({
      userId, action: AuditAction.DELETE, entity: 'OxygenTank', entityId: id,
      previousData: { code: tank.code, level: tank.level, status: tank.status },
      comment: `Tank ${tank.code} deactivated`,
    });

    this.eventsService.broadcast('oxygen.tank_updated', { tankId: id, code: tank.code, deleted: true });
    this.eventsService.broadcast('dashboard.metrics_updated', { timestamp: new Date().toISOString() });

    return { message: 'Tank deactivated' };
  }

  private async checkAndAlert(id: string, tank: any, userId: string) {
    if (tank.status === OxygenTankStatus.CRITICAL) {
      await this.createAlert('oxygen.tank_critical', 'CRITICAL_OXYGEN', `Tank ${tank.code} is critically low (${tank.level}%)`, tank, userId);
    } else if (tank.status === OxygenTankStatus.LOW) {
      await this.createAlert('oxygen.tank_low', 'CRITICAL_OXYGEN', `Tank ${tank.code} is low (${tank.level}%)`, tank, userId);
    }
  }

  private async createAlert(event: string, notifType: NotificationType, message: string, tank: any, userId: string) {
    const managers = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'HEAD_NURSE', 'SUPERVISOR'] }, isActive: true, deletedAt: null },
      select: { id: true },
    });

    for (const manager of managers) {
      await this.notificationsService.create({
        userId: manager.id,
        type: notifType,
        title: event === 'oxygen.tank_critical' ? 'Critical Oxygen Tank' : 'Low Oxygen Tank',
        message,
        metadata: { tankId: tank.id, code: tank.code, level: tank.level, status: tank.status },
      }).catch((err) => this.logger.warn(`Notification create failed: ${err}`));
    }

    this.eventsService.broadcast(event, { tankId: tank.id, code: tank.code, level: tank.level, status: tank.status });
    this.eventsService.broadcast('clinical.alert_created', { type: event, tankId: tank.id, message });
  }
}
