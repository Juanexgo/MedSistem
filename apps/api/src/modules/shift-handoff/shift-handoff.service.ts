import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { EventsService } from '../events/events.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class ShiftHandoffService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private eventsService: EventsService,
  ) {}

  async create(shiftId: string, data: {
    completedServices?: string; pendingServices?: string; patientsInTransfer?: string;
    incompleteStudies?: string; incidents?: string; lowOxygenTanks?: string;
    observations?: string; receivedById: string; handedOffById: string;
  }) {
    const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException('Shift not found');

    const existing = await this.prisma.shiftHandoff.findUnique({ where: { shiftId } });
    if (existing) throw new BadRequestException('Handoff already exists for this shift');

    const handoff = await this.prisma.shiftHandoff.create({
      data: { shiftId, ...data },
      include: {
        shift: { include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } } },
        handedOffBy: { select: { id: true, firstName: true, lastName: true } },
        receivedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.auditService.log({
      userId: data.handedOffById, action: AuditAction.HANDOFF, entity: 'ShiftHandoff', entityId: handoff.id,
      comment: `Shift handoff created for ${shift.shiftCode}`,
    });

    this.eventsService.broadcast('shift.handoff_created', {
      handoffId: handoff.id,
      shiftId,
      shiftCode: shift.shiftCode,
      handedOffById: data.handedOffById,
      receivedById: data.receivedById,
    });

    this.eventsService.broadcast('dashboard.metrics_updated', {});

    return handoff;
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.shiftHandoff.findMany({
        skip,
        take: limit,
        orderBy: { handoffAt: 'desc' },
        include: {
          shift: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, role: true } },
            },
          },
          handedOffBy: { select: { id: true, firstName: true, lastName: true } },
          receivedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.shiftHandoff.count(),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getPending() {
    const shiftsEndedWithoutHandoff = await this.prisma.shift.findMany({
      where: { isActive: false, handoff: null, endedAt: { not: null } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { endedAt: 'desc' },
    });
    return shiftsEndedWithoutHandoff;
  }

  async findByShiftId(shiftId: string) {
    const handoff = await this.prisma.shiftHandoff.findUnique({
      where: { shiftId },
      include: {
        shift: { include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } } },
        handedOffBy: { select: { id: true, firstName: true, lastName: true } },
        receivedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!handoff) throw new NotFoundException('Handoff not found');
    return handoff;
  }

  async findByUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.shiftHandoff.findMany({
        where: {
          OR: [{ handedOffById: userId }, { receivedById: userId }],
        },
        orderBy: { handoffAt: 'desc' },
        skip,
        take: limit,
        include: {
          shift: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, role: true } },
            },
          },
          handedOffBy: { select: { id: true, firstName: true, lastName: true } },
          receivedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.shiftHandoff.count({
        where: {
          OR: [{ handedOffById: userId }, { receivedById: userId }],
        },
      }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
