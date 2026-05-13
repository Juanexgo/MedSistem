import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  TransferStatus,
  AuditAction,
  EmployeeStatus,
  Prisma,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { EventsService } from '../events/events.service';
import { CreateTransferDto, UpdateTransferDto, UpdateTransferStatusDto, TransferFilterDto } from './dto/transfers.dto';

const VALID_TRANSITIONS: Record<TransferStatus, TransferStatus[]> = {
  [TransferStatus.REQUESTED]: [TransferStatus.ASSIGNED, TransferStatus.CANCELLED],
  [TransferStatus.ASSIGNED]: [TransferStatus.ON_THE_WAY, TransferStatus.CANCELLED],
  [TransferStatus.ON_THE_WAY]: [TransferStatus.PATIENT_PICKED_UP, TransferStatus.CANCELLED],
  [TransferStatus.PATIENT_PICKED_UP]: [TransferStatus.IN_TRANSFER, TransferStatus.CANCELLED],
  [TransferStatus.IN_TRANSFER]: [TransferStatus.ARRIVED, TransferStatus.CANCELLED],
  [TransferStatus.ARRIVED]: [TransferStatus.IN_STUDY, TransferStatus.CANCELLED],
  [TransferStatus.IN_STUDY]: [TransferStatus.RETURN_REQUESTED, TransferStatus.CANCELLED],
  [TransferStatus.RETURN_REQUESTED]: [TransferStatus.COMPLETED, TransferStatus.CANCELLED],
  [TransferStatus.COMPLETED]: [],
  [TransferStatus.CANCELLED]: [],
};

const ACTIVE_STATUSES: TransferStatus[] = [
  TransferStatus.ASSIGNED,
  TransferStatus.ON_THE_WAY,
  TransferStatus.PATIENT_PICKED_UP,
  TransferStatus.IN_TRANSFER,
  TransferStatus.ARRIVED,
  TransferStatus.IN_STUDY,
  TransferStatus.RETURN_REQUESTED,
];

@Injectable()
export class TransfersService {
  private readonly logger = new Logger(TransfersService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private eventsService: EventsService,
    private configService: ConfigService,
  ) {}

  async create(dto: CreateTransferDto, userId: string) {
    this.validateClinicalRules(dto.requiresOxygen, dto.requiresDoctorCompanion, {
      assignedTankId: dto.assignedTankId,
      tankLevel: dto.tankLevel,
      manometer: dto.manometer,
      doctorCompanionName: dto.doctorCompanionName,
      oxygenLiters: dto.oxygenLiters,
    });

    const transfer = await this.prisma.transferRequest.create({
      data: {
        patientId: dto.patientId,
        bedNumber: dto.bedNumber,
        floor: dto.floor,
        origin: dto.origin,
        destination: dto.destination,
        priority: dto.priority,
        transportType: dto.transportType,
        requestedStudy: dto.requestedStudy,
        notes: dto.notes,
        requiresOxygen: dto.requiresOxygen || false,
        oxygenLiters: dto.oxygenLiters,
        assignedTankId: dto.assignedTankId,
        tankLevel: dto.tankLevel,
        manometer: dto.manometer,
        requiresDoctorCompanion: dto.requiresDoctorCompanion || false,
        doctorCompanionName: dto.doctorCompanionName,
        authorizingUserId: userId,
        status: TransferStatus.REQUESTED,
        statusHistory: {
          create: {
            status: TransferStatus.REQUESTED,
            changedByUserId: userId,
            comment: 'Transfer request created',
          },
        },
      },
      include: {
        patient: true,
        authorizingUser: { select: { id: true, firstName: true, lastName: true } },
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (dto.assignedTankId) {
      await this.prisma.oxygenTank.update({
        where: { id: dto.assignedTankId },
        data: { isAvailable: false },
      });
    }

    try {
      const trackingBaseUrl = this.configService.get<string>('TRACKING_BASE_URL', 'http://localhost:3000/tracking');
      const trackingUrl = `${trackingBaseUrl}/${transfer.trackingToken}`;
      const qrCodeDataUrl = await QRCode.toDataURL(trackingUrl, {
        width: 300,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' },
      });
      await this.prisma.transferRequest.update({
        where: { id: transfer.id },
        data: { qrCodeDataUrl },
      });
      transfer.qrCodeDataUrl = qrCodeDataUrl;
    } catch (err) {
      this.logger.warn(`QR generation failed for transfer ${transfer.id}: ${err}`);
    }

    await this.auditService.log({
      userId,
      action: AuditAction.CREATE,
      entity: 'TransferRequest',
      entityId: transfer.id,
      comment: `Transfer created: ${dto.origin} → ${dto.destination} [${dto.priority}]`,
    });

    this.eventsService.broadcast('transfer.created', {
      transferId: transfer.id,
      priority: dto.priority,
      origin: dto.origin,
      destination: dto.destination,
      patientName: transfer.patient?.fullName,
    });
    this.eventsService.broadcast('dashboard.metrics_updated', { timestamp: new Date().toISOString() });

    return this.enrichTransfer(transfer);
  }

  async findAll(filters: TransferFilterDto) {
    const where: any = { deletedAt: null };

    if (filters.status) {
      const statuses = filters.status.split(',');
      where.status = { in: statuses };
    }
    if (filters.priority) where.priority = filters.priority;
    if (filters.transporterId) where.assignedTransporterId = filters.transporterId;
    if (filters.origin) where.origin = { contains: filters.origin, mode: 'insensitive' };
    if (filters.destination) where.destination = { contains: filters.destination, mode: 'insensitive' };
    if (filters.dateFrom || filters.dateTo) {
      where.requestedAt = {};
      if (filters.dateFrom) where.requestedAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.requestedAt.lte = new Date(filters.dateTo);
    }
    if (filters.search) {
      where.OR = [
        { patient: { fullName: { contains: filters.search, mode: 'insensitive' } } },
        { bedNumber: { contains: filters.search, mode: 'insensitive' } },
        { floor: { contains: filters.search, mode: 'insensitive' } },
        { requestedStudy: { contains: filters.search, mode: 'insensitive' } },
        { trackingToken: { contains: filters.search, mode: 'insensitive' } },
        { origin: { contains: filters.search, mode: 'insensitive' } },
        { destination: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    const sortBy = filters.sortBy || 'requestedAt';
    const sortOrder = filters.sortOrder || 'desc';

    const [transfers, total] = await Promise.all([
      this.prisma.transferRequest.findMany({
        where,
        include: {
          patient: { select: { id: true, fullName: true, bedNumber: true, floor: true, medicalRecordNumber: true } },
          authorizingUser: { select: { id: true, firstName: true, lastName: true } },
          assignedTransporter: { select: { id: true, firstName: true, lastName: true, employeeStatus: true } },
          assignedTank: { select: { id: true, code: true, level: true, status: true } },
          statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { comments: true } },
        },
        orderBy: sortBy === 'priority'
          ? [{ priority: sortOrder as Prisma.SortOrder }, { requestedAt: 'desc' }]
          : [{ [sortBy]: sortOrder as Prisma.SortOrder }],
        skip,
        take: limit,
      }),
      this.prisma.transferRequest.count({ where }),
    ]);

    return {
      data: transfers.map(t => ({
        ...t,
        elapsedMinutes: Math.floor((Date.now() - t.requestedAt.getTime()) / 60000),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const transfer = await this.prisma.transferRequest.findUnique({
      where: { id },
      include: {
        patient: true,
        authorizingUser: { select: { id: true, firstName: true, lastName: true, role: true } },
        assignedTransporter: { select: { id: true, firstName: true, lastName: true, employeeStatus: true } },
        assignedTank: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: { changedByUser: { select: { id: true, firstName: true, lastName: true } } },
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
        },
        assignments: {
          orderBy: { assignedAt: 'desc' },
          include: {
            transporter: { select: { id: true, firstName: true, lastName: true } },
            assignedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!transfer || transfer.deletedAt) throw new NotFoundException('Transfer not found');

    return {
      ...transfer,
      elapsedMinutes: Math.floor((Date.now() - transfer.requestedAt.getTime()) / 60000),
      nextStatuses: VALID_TRANSITIONS[transfer.status] || [],
    };
  }

  async update(id: string, dto: UpdateTransferDto) {
    const transfer = await this.prisma.transferRequest.findUnique({ where: { id } });
    if (!transfer || transfer.deletedAt) throw new NotFoundException('Transfer not found');
    if (transfer.status === TransferStatus.COMPLETED || transfer.status === TransferStatus.CANCELLED) {
      throw new BadRequestException('Cannot update a completed or cancelled transfer');
    }

    const previousData = {
      bedNumber: transfer.bedNumber,
      floor: transfer.floor,
      origin: transfer.origin,
      destination: transfer.destination,
      priority: transfer.priority,
    };

    const updated = await this.prisma.transferRequest.update({
      where: { id },
      data: {
        bedNumber: dto.bedNumber,
        floor: dto.floor,
        origin: dto.origin,
        destination: dto.destination,
        priority: dto.priority,
        transportType: dto.transportType,
        requestedStudy: dto.requestedStudy,
        notes: dto.notes,
        oxygenLiters: dto.oxygenLiters,
        assignedTankId: dto.assignedTankId,
        tankLevel: dto.tankLevel,
        manometer: dto.manometer,
        doctorCompanionName: dto.doctorCompanionName,
      },
    });

    await this.auditService.log({
      userId: 'system',
      action: AuditAction.UPDATE,
      entity: 'TransferRequest',
      entityId: id,
      previousData,
      newData: { bedNumber: updated.bedNumber, floor: updated.floor, origin: updated.origin, destination: updated.destination },
      comment: 'Transfer updated',
    });

    return this.findById(id);
  }

  async updateStatus(id: string, dto: UpdateTransferStatusDto, userId: string) {
    const transfer = await this.prisma.transferRequest.findUnique({
      where: { id },
      include: { assignedTransporter: true },
    });
    if (!transfer || transfer.deletedAt) throw new NotFoundException('Transfer not found');

    const newStatus = dto.status;
    const currentStatus = transfer.status;

    const allowedNext = VALID_TRANSITIONS[currentStatus];
    if (!allowedNext || !allowedNext.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}. Valid next statuses: ${(allowedNext || []).join(', ') || 'none'}`,
      );
    }

    if (newStatus === TransferStatus.CANCELLED) {
      if (!dto.cancellationReason) {
        throw new BadRequestException('Cancellation reason is required');
      }
      if (transfer.assignedTransporterId) {
        await this.prisma.user.update({
          where: { id: transfer.assignedTransporterId },
          data: { employeeStatus: EmployeeStatus.AVAILABLE },
        });
      }
      if (transfer.assignedTankId) {
        await this.prisma.oxygenTank.update({
          where: { id: transfer.assignedTankId },
          data: { isAvailable: true },
        });
        this.eventsService.broadcast('oxygen.tank_released', { tankId: transfer.assignedTankId, transferId: id });
      }
    }

    if (newStatus === TransferStatus.COMPLETED) {
      this.validateClinicalRulesForCompletion(transfer);

      if (transfer.assignedTransporterId) {
        const hasMoreActive = await this.prisma.transferRequest.count({
          where: {
            assignedTransporterId: transfer.assignedTransporterId,
            status: { in: ACTIVE_STATUSES },
            id: { not: id },
          },
        });
        await this.prisma.user.update({
          where: { id: transfer.assignedTransporterId },
          data: { employeeStatus: hasMoreActive > 0 ? EmployeeStatus.BUSY : EmployeeStatus.AVAILABLE },
        });
      }
      if (transfer.assignedTankId) {
        await this.prisma.oxygenTank.update({
          where: { id: transfer.assignedTankId },
          data: { isAvailable: true },
        });
        this.eventsService.broadcast('oxygen.tank_released', { tankId: transfer.assignedTankId, transferId: id });
      }
    }

    if (newStatus === TransferStatus.ASSIGNED && !transfer.assignedTransporterId) {
      throw new BadRequestException('Cannot set ASSIGNED without an assigned transporter');
    }

    const now = new Date();
    const updateData: any = { status: newStatus };
    if (newStatus === TransferStatus.ASSIGNED) updateData.assignedAt = now;
    if (newStatus === TransferStatus.ON_THE_WAY) updateData.startedAt = now;
    if (newStatus === TransferStatus.COMPLETED) updateData.completedAt = now;
    if (newStatus === TransferStatus.CANCELLED) {
      updateData.cancelledAt = now;
      updateData.cancellationReason = dto.cancellationReason;
    }

    await this.prisma.transferRequest.update({
      where: { id },
      data: {
        ...updateData,
        statusHistory: {
          create: {
            status: newStatus,
            changedByUserId: userId,
            comment: dto.comment || `Status changed to ${newStatus}`,
          },
        },
      },
    });

    const auditAction = newStatus === TransferStatus.CANCELLED ? AuditAction.CANCEL : AuditAction.UPDATE;
    await this.auditService.log({
      userId,
      action: auditAction,
      entity: 'TransferRequest',
      entityId: id,
      previousData: { status: currentStatus },
      newData: { status: newStatus },
      comment: `Status: ${currentStatus} → ${newStatus}${dto.comment ? ` (${dto.comment})` : ''}`,
    });

    if (newStatus === TransferStatus.CANCELLED) {
      this.eventsService.broadcast('transfer.cancelled', {
        transferId: id,
        reason: dto.cancellationReason || dto.comment,
      });
    } else {
      this.eventsService.emitToRoom('transfer.' + id, 'transfer.status_changed', {
        transferId: id,
        fromStatus: currentStatus,
        toStatus: newStatus,
      });
    }
    this.eventsService.broadcast('dashboard.metrics_updated', { timestamp: new Date().toISOString() });

    return this.findById(id);
  }

  async cancel(id: string, reason: string, userId: string) {
    return this.updateStatus(id, { status: TransferStatus.CANCELLED, cancellationReason: reason }, userId);
  }

  async getActiveTransports() {
    const transfers = await this.prisma.transferRequest.findMany({
      where: {
        deletedAt: null,
        status: { in: ACTIVE_STATUSES },
      },
      include: {
        patient: { select: { id: true, fullName: true, bedNumber: true, floor: true } },
        authorizingUser: { select: { id: true, firstName: true, lastName: true } },
        assignedTransporter: { select: { id: true, firstName: true, lastName: true, employeeStatus: true } },
        assignedTank: { select: { id: true, code: true, level: true, status: true } },
      },
      orderBy: [
        { priority: 'asc' },
        { requestedAt: 'asc' },
      ],
    });

    return transfers.map(t => ({
      ...t,
      elapsedMinutes: Math.floor((Date.now() - t.requestedAt.getTime()) / 60000),
      isDelayed: (Date.now() - t.requestedAt.getTime()) > 25 * 60 * 1000,
    }));
  }

  async getTimeline(id: string) {
    const transfer = await this.prisma.transferRequest.findUnique({
      where: { id },
      include: {
        authorizingUser: { select: { id: true, firstName: true, lastName: true, role: true } },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: { changedByUser: { select: { id: true, firstName: true, lastName: true, role: true } } },
        },
        assignments: {
          orderBy: { assignedAt: 'asc' },
          include: {
            transporter: { select: { id: true, firstName: true, lastName: true } },
            assignedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
        },
      },
    });

    if (!transfer || transfer.deletedAt) throw new NotFoundException('Transfer not found');

    const events: any[] = [];

    events.push({
      type: 'created',
      title: 'Transfer Requested',
      description: `Transfer created from ${transfer.origin} to ${transfer.destination} (${transfer.priority})`,
      timestamp: transfer.requestedAt,
      actor: transfer.authorizingUser,
      metadata: { priority: transfer.priority, transportType: transfer.transportType },
    });

    for (const sh of transfer.statusHistory) {
      if (sh.status === TransferStatus.REQUESTED) continue;
      events.push({
        type: 'status_change',
        title: this.getStatusEventTitle(sh.status),
        description: sh.comment || `Status changed to ${sh.status}`,
        timestamp: sh.createdAt,
        actor: sh.changedByUser,
        metadata: { status: sh.status },
      });
    }

    for (const a of transfer.assignments) {
      if (!a.isActive && a.unassignedAt) {
        events.push({
          type: 'assignment',
          title: 'Transporter Unassigned',
          description: `${a.transporter.firstName} ${a.transporter.lastName} was unassigned`,
          timestamp: a.unassignedAt,
          actor: a.assignedBy,
          metadata: { transporter: a.transporter, reason: a.reason },
        });
      } else {
        events.push({
          type: 'assignment',
          title: 'Transporter Assigned',
          description: `${a.transporter.firstName} ${a.transporter.lastName} was assigned`,
          timestamp: a.assignedAt,
          actor: a.assignedBy,
          metadata: { transporter: a.transporter },
        });
      }
    }

    for (const c of transfer.comments) {
      events.push({
        type: 'comment',
        title: 'Comment Added',
        description: c.content.substring(0, 200),
        timestamp: c.createdAt,
        actor: c.user,
        metadata: { isImportant: c.isImportant, category: c.category },
      });
    }

    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return events;
  }

  async findByTrackingToken(token: string) {
    const transfer = await this.prisma.transferRequest.findUnique({
      where: { trackingToken: token },
      include: {
        patient: { select: { id: true, fullName: true, bedNumber: true, floor: true } },
        authorizingUser: { select: { id: true, firstName: true, lastName: true } },
        assignedTransporter: { select: { id: true, firstName: true, lastName: true, employeeStatus: true } },
        assignedTank: { select: { id: true, code: true, level: true, status: true } },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: { changedByUser: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    if (!transfer || transfer.deletedAt) throw new NotFoundException('Transfer not found');

    return this.sanitizeForPublicTracking(transfer);
  }

  async findByTrackingTokenForTimeline(token: string) {
    const transfer = await this.prisma.transferRequest.findUnique({
      where: { trackingToken: token },
      include: {
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: { changedByUser: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    if (!transfer || transfer.deletedAt) throw new NotFoundException('Transfer not found');

    return transfer.statusHistory.map(sh => ({
      type: 'status_change',
      title: this.getStatusEventTitle(sh.status),
      description: sh.comment || `Status changed to ${sh.status}`,
      timestamp: sh.createdAt,
      status: sh.status,
    }));
  }

  private sanitizeForPublicTracking(transfer: any) {
    return {
      id: transfer.id,
      trackingToken: transfer.trackingToken,
      qrCodeDataUrl: transfer.qrCodeDataUrl,
      patient: {
        id: transfer.patient.id,
        fullName: transfer.patient.fullName,
        bedNumber: transfer.patient.bedNumber,
        floor: transfer.patient.floor,
      },
      bedNumber: transfer.bedNumber,
      floor: transfer.floor,
      origin: transfer.origin,
      destination: transfer.destination,
      priority: transfer.priority,
      transportType: transfer.transportType,
      status: transfer.status,
      requestedStudy: transfer.requestedStudy,
      requiresOxygen: transfer.requiresOxygen,
      oxygenLiters: transfer.oxygenLiters,
      assignedTank: transfer.assignedTank ? {
        id: transfer.assignedTank.id,
        code: transfer.assignedTank.code,
        level: transfer.assignedTank.level,
        status: transfer.assignedTank.status,
      } : null,
      tankLevel: transfer.tankLevel,
      manometer: transfer.manometer,
      requiresDoctorCompanion: transfer.requiresDoctorCompanion,
      doctorCompanionName: transfer.doctorCompanionName,
      authorizingUser: transfer.authorizingUser ? {
        id: transfer.authorizingUser.id,
        firstName: transfer.authorizingUser.firstName,
        lastName: transfer.authorizingUser.lastName,
      } : null,
      assignedTransporter: transfer.assignedTransporter ? {
        id: transfer.assignedTransporter.id,
        firstName: transfer.assignedTransporter.firstName,
        lastName: transfer.assignedTransporter.lastName,
      } : null,
      requestedAt: transfer.requestedAt,
      assignedAt: transfer.assignedAt,
      startedAt: transfer.startedAt,
      completedAt: transfer.completedAt,
      cancelledAt: transfer.cancelledAt,
      cancellationReason: transfer.cancellationReason,
      statusHistory: transfer.statusHistory,
      elapsedMinutes: Math.floor((Date.now() - transfer.requestedAt.getTime()) / 60000),
    };
  }

  private validateClinicalRules(
    requiresOxygen: boolean | undefined,
    requiresDoctorCompanion: boolean | undefined,
    fields: { assignedTankId?: string; tankLevel?: number; manometer?: number; doctorCompanionName?: string; oxygenLiters?: number },
  ) {
    if (requiresOxygen) {
      const missing: string[] = [];
      if (!fields.assignedTankId) missing.push('assigned oxygen tank');
      if (fields.tankLevel === undefined || fields.tankLevel === null) missing.push('tank level reading');
      if (fields.manometer === undefined || fields.manometer === null) missing.push('manometer/PSI reading');
      if (!fields.oxygenLiters) missing.push('oxygen liters per minute');
      if (!fields.doctorCompanionName) missing.push('doctor companion name');
      if (missing.length > 0) {
        throw new BadRequestException(`Oxygen support requires: ${missing.join(', ')}`);
      }
    }
  }

  private validateClinicalRulesForCompletion(transfer: any) {
    if (transfer.requiresOxygen) {
      const missing: string[] = [];
      if (!transfer.assignedTankId) missing.push('assigned oxygen tank');
      if (transfer.tankLevel === undefined || transfer.tankLevel === null) missing.push('oxygen tank level reading');
      if (transfer.manometer === undefined || transfer.manometer === null) missing.push('manometer/PSI reading');
      if (!transfer.oxygenLiters) missing.push('oxygen liters per minute');
      if (!transfer.doctorCompanionName) missing.push('doctor companion name');
      if (!transfer.requiresDoctorCompanion) missing.push('doctor companion flag');
      if (missing.length > 0) {
        throw new BadRequestException(
          `Cannot complete transport: missing required oxygen safety data: ${missing.join(', ')}`,
        );
      }
    }
  }

  private getStatusEventTitle(status: TransferStatus): string {
    const titles: Record<string, string> = {
      [TransferStatus.REQUESTED]: 'Transfer Requested',
      [TransferStatus.ASSIGNED]: 'Transporter Assigned',
      [TransferStatus.ON_THE_WAY]: 'Transporter En Route',
      [TransferStatus.PATIENT_PICKED_UP]: 'Patient Picked Up',
      [TransferStatus.IN_TRANSFER]: 'In Transit',
      [TransferStatus.ARRIVED]: 'Arrived at Destination',
      [TransferStatus.IN_STUDY]: 'Study in Progress',
      [TransferStatus.RETURN_REQUESTED]: 'Return Requested',
      [TransferStatus.COMPLETED]: 'Transport Completed',
      [TransferStatus.CANCELLED]: 'Transport Cancelled',
    };
    return titles[status] || `Status: ${status}`;
  }

  private enrichTransfer(transfer: any) {
    return {
      ...transfer,
      elapsedMinutes: Math.floor((Date.now() - transfer.requestedAt.getTime()) / 60000),
    };
  }
}