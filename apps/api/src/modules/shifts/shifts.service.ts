import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { EventsService } from '../events/events.service';
import { ShiftType, AuditAction } from '@prisma/client';
import { StartShiftDto, EndShiftDto } from './dto/shifts.dto';

/**
 * Shift schedule per MediFlow spec:
 *   MORNING shift officially starts at 08:30 AM
 *   EVENING handoff happens at 21:00 (9:00 PM) — the boundary morning→evening is 15:00
 *   NIGHT handoff happens at 08:10 AM (20 min before morning officially takes over)
 *
 * SHIFT_BOUNDARIES are used to determine which shift is "current" at a given time
 * (a hard boundary). HANDOFF_TIMES are the wall-clock times when an outgoing
 * shift should *begin* handing off to the incoming one — these trigger
 * pending-handoff notifications and SLA tracking.
 */
const MIN = (h: number, m = 0) => h * 60 + m;

export const SHIFT_BOUNDARIES = {
  MORNING_START: MIN(8, 30),
  EVENING_START: MIN(15, 0),
  NIGHT_START: MIN(21, 0),
} as const;

export const HANDOFF_TIMES = {
  EVENING_HANDOFF: MIN(21, 0), // evening hands off to night at 21:00
  NIGHT_HANDOFF: MIN(8, 10),   // night hands off to morning at 08:10
} as const;

@Injectable()
export class ShiftsService {
  private readonly shiftPrefixes: Record<ShiftType, string> = { MORNING: 'MOR', EVENING: 'EVE', NIGHT: 'NGT' };

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private eventsService: EventsService,
  ) {}

  private generateShiftCode(type: ShiftType): string {
    const prefix = this.shiftPrefixes[type];
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const date = `${y}-${m}-${d}`;
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${date}-${random}`;
  }

  getCurrentShiftType(): { type: ShiftType; startTime: string; endTime: string } {
    const hour = new Date().getHours();
    const minute = new Date().getMinutes();
    const totalMinutes = hour * 60 + minute;

    if (totalMinutes >= SHIFT_BOUNDARIES.MORNING_START && totalMinutes < SHIFT_BOUNDARIES.EVENING_START) {
      return { type: ShiftType.MORNING, startTime: '08:30', endTime: '15:00' };
    }
    if (totalMinutes >= SHIFT_BOUNDARIES.EVENING_START && totalMinutes < SHIFT_BOUNDARIES.NIGHT_START) {
      return { type: ShiftType.EVENING, startTime: '15:00', endTime: '21:00' };
    }
    return { type: ShiftType.NIGHT, startTime: '21:00', endTime: '08:30' };
  }

  /**
   * Returns true if the current wall-clock time is within the handoff window
   * (10 minutes before the outgoing shift's official end) for a given shift type.
   * Useful for triggering pending-handoff notifications.
   */
  isInHandoffWindow(type: ShiftType, windowMinutes = 30): boolean {
    const now = new Date();
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    const handoffAt =
      type === ShiftType.EVENING ? HANDOFF_TIMES.EVENING_HANDOFF :
      type === ShiftType.NIGHT ? HANDOFF_TIMES.NIGHT_HANDOFF :
      null;
    if (handoffAt === null) return false;
    const startWindow = (handoffAt - windowMinutes + 24 * 60) % (24 * 60);
    if (startWindow <= handoffAt) {
      return totalMinutes >= startWindow && totalMinutes <= handoffAt;
    }
    return totalMinutes >= startWindow || totalMinutes <= handoffAt;
  }

  async startShift(userId: string, dto: StartShiftDto) {
    const activeShift = await this.prisma.shift.findFirst({ where: { userId, isActive: true } });
    if (activeShift) throw new BadRequestException('User already has an active shift');

    const shiftCode = this.generateShiftCode(dto.type);
    const shift = await this.prisma.shift.create({
      data: { shiftCode, type: dto.type, userId },
    });

    await this.auditService.log({
      userId, action: AuditAction.CREATE, entity: 'Shift', entityId: shift.id,
      comment: `Shift started: ${shiftCode}`,
    });

    this.eventsService.broadcast('shift.started', {
      shiftId: shift.id,
      shiftCode,
      type: dto.type,
      userId,
      startedAt: shift.startedAt,
    });
    this.eventsService.broadcast('dashboard.metrics_updated', {});

    return shift;
  }

  async endShift(shiftId: string, userId: string, dto?: EndShiftDto) {
    const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException('Shift not found');
    if (!shift.isActive) throw new BadRequestException('Shift already ended');

    const updated = await this.prisma.shift.update({
      where: { id: shiftId },
      data: { endedAt: new Date(), isActive: false },
    });

    await this.auditService.log({
      userId, action: AuditAction.CLOSE_SHIFT, entity: 'Shift', entityId: shiftId,
      comment: `Shift ended: ${shift.shiftCode}`,
    });

    this.eventsService.broadcast('shift.ended', {
      shiftId: shift.id,
      shiftCode: shift.shiftCode,
      endedAt: updated.endedAt,
    });

    this.eventsService.broadcast('shift.handoff_pending', {
      shiftId: shift.id,
      shiftCode: shift.shiftCode,
    });

    this.eventsService.broadcast('dashboard.metrics_updated', {});

    return updated;
  }

  async getCurrentShift(userId: string) {
    return this.prisma.shift.findFirst({
      where: { userId, isActive: true },
      include: {
        handoff: true,
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });
  }

  async getShiftById(shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        handoff: {
          include: {
            handedOffBy: { select: { id: true, firstName: true, lastName: true } },
            receivedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });
    if (!shift) throw new NotFoundException('Shift not found');
    return shift;
  }

  async getAllShifts(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.shift.findMany({
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, role: true } },
          handoff: { select: { id: true, handoffAt: true } },
        },
      }),
      this.prisma.shift.count(),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getActiveShifts() {
    return this.prisma.shift.findMany({
      where: { isActive: true },
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });
  }

  async getShiftHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.shift.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        include: { handoff: { select: { id: true, handoffAt: true } } },
      }),
      this.prisma.shift.count({ where: { userId } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getPendingHandoffShifts() {
    const shifts = await this.prisma.shift.findMany({
      where: { isActive: false, handoff: null, endedAt: { not: null } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { endedAt: 'desc' },
    });
    return shifts;
  }
}
