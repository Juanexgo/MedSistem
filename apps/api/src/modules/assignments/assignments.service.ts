import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { EventsService } from '../events/events.service';
import { AuditAction, EmployeeStatus, TransferStatus } from '@prisma/client';

@Injectable()
export class AssignmentsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private eventsService: EventsService,
  ) {}

  async assign(transferId: string, transporterId: string, assignedById: string) {
    const transfer = await this.prisma.transferRequest.findUnique({ where: { id: transferId } });
    if (!transfer || transfer.deletedAt) throw new NotFoundException('Transfer not found');
    if (transfer.status === TransferStatus.COMPLETED) throw new BadRequestException('Cannot assign a completed transfer');
    if (transfer.status === TransferStatus.CANCELLED) throw new BadRequestException('Cannot assign a cancelled transfer');

    const transporter = await this.prisma.user.findUnique({ where: { id: transporterId } });
    if (!transporter) throw new NotFoundException('Transporter not found');
    if (!transporter.isActive || transporter.deletedAt) throw new BadRequestException('Transporter is inactive');
    if (transporter.employeeStatus === EmployeeStatus.OFF_SHIFT) {
      throw new BadRequestException('Transporter is off shift');
    }
    if (transporter.employeeStatus === EmployeeStatus.BREAK) {
      throw new BadRequestException('Transporter is on break');
    }

    if (transfer.assignedTransporterId) {
      await this.prisma.assignment.updateMany({
        where: { transferRequestId: transferId, isActive: true },
        data: { isActive: false, unassignedAt: new Date(), reason: 'Reassigned' },
      });
      await this.prisma.user.update({
        where: { id: transfer.assignedTransporterId },
        data: { employeeStatus: EmployeeStatus.AVAILABLE },
      });
    }

    await this.prisma.assignment.create({
      data: { transferRequestId: transferId, transporterId, assignedById },
    });

    await this.prisma.transferRequest.update({
      where: { id: transferId },
      data: {
        assignedTransporterId: transporterId,
        status: TransferStatus.ASSIGNED,
        assignedAt: new Date(),
      },
    });

    await this.prisma.user.update({
      where: { id: transporterId },
      data: { employeeStatus: EmployeeStatus.BUSY },
    });

    await this.auditService.log({
      userId: assignedById,
      action: AuditAction.ASSIGN,
      entity: 'TransferRequest',
      entityId: transferId,
      comment: `Assigned to ${transporter.firstName} ${transporter.lastName}`,
    });

    this.eventsService.emitToRoom('transfer.' + transferId, 'assignment.created', {
      transferId,
      transporterId: transporter.id,
      transporterName: `${transporter.firstName} ${transporter.lastName}`,
    });
    this.eventsService.broadcast('transporter.status_changed', {
      transporterId: transporter.id,
      status: 'BUSY',
    });
    this.eventsService.broadcast('dashboard.metrics_updated', { timestamp: new Date().toISOString() });

    return { message: 'Transporter assigned', transporter: { id: transporter.id, firstName: transporter.firstName, lastName: transporter.lastName } };
  }

  async reassign(transferId: string, newTransporterId: string, assignedById: string) {
    const transfer = await this.prisma.transferRequest.findUnique({ where: { id: transferId } });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status === TransferStatus.COMPLETED) throw new BadRequestException('Cannot reassign a completed transfer');
    if (transfer.status === TransferStatus.CANCELLED) throw new BadRequestException('Cannot reassign a cancelled transfer');

    if (transfer.assignedTransporterId) {
      await this.prisma.assignment.updateMany({
        where: { transferRequestId: transferId, isActive: true },
        data: { isActive: false, unassignedAt: new Date(), reason: 'Reassigned' },
      });
      await this.prisma.user.update({
        where: { id: transfer.assignedTransporterId },
        data: { employeeStatus: EmployeeStatus.AVAILABLE },
      });
    }

    await this.prisma.assignment.create({
      data: { transferRequestId: transferId, transporterId: newTransporterId, assignedById },
    });

    const newTransporter = await this.prisma.user.findUnique({ where: { id: newTransporterId } });
    if (!newTransporter) throw new NotFoundException('New transporter not found');

    await this.prisma.transferRequest.update({
      where: { id: transferId },
      data: { assignedTransporterId: newTransporterId, status: TransferStatus.ASSIGNED, assignedAt: new Date() },
    });

    await this.prisma.user.update({
      where: { id: newTransporterId },
      data: { employeeStatus: EmployeeStatus.BUSY },
    });

    await this.auditService.log({
      userId: assignedById,
      action: AuditAction.REASSIGN,
      entity: 'TransferRequest',
      entityId: transferId,
      comment: `Reassigned to ${newTransporter.firstName} ${newTransporter.lastName}`,
    });

    this.eventsService.emitToRoom('transfer.' + transferId, 'assignment.reassigned', {
      transferId,
      newTransporterId: newTransporter.id,
      newTransporterName: `${newTransporter.firstName} ${newTransporter.lastName}`,
    });
    this.eventsService.broadcast('transporter.status_changed', { transporterId: newTransporter.id, status: 'BUSY' });
    this.eventsService.broadcast('dashboard.metrics_updated', { timestamp: new Date().toISOString() });

    return { message: 'Transporter reassigned' };
  }

  async unassign(transferId: string, assignedById: string) {
    const transfer = await this.prisma.transferRequest.findUnique({ where: { id: transferId } });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (!transfer.assignedTransporterId) throw new NotFoundException('No assignment found');
    if (transfer.status === TransferStatus.COMPLETED) throw new BadRequestException('Cannot unassign a completed transfer');
    if (transfer.status === TransferStatus.CANCELLED) throw new BadRequestException('Cannot unassign a cancelled transfer');

    await this.prisma.assignment.updateMany({
      where: { transferRequestId: transferId, isActive: true },
      data: { isActive: false, unassignedAt: new Date(), reason: 'Unassigned' },
    });

    await this.prisma.transferRequest.update({
      where: { id: transferId },
      data: { assignedTransporterId: null, status: TransferStatus.REQUESTED },
    });

    await this.prisma.user.update({
      where: { id: transfer.assignedTransporterId },
      data: { employeeStatus: EmployeeStatus.AVAILABLE },
    });

    await this.auditService.log({
      userId: assignedById,
      action: AuditAction.REASSIGN,
      entity: 'TransferRequest',
      entityId: transferId,
      comment: 'Transporter unassigned',
    });

    this.eventsService.emitToRoom('transfer.' + transferId, 'assignment.unassigned', {
      transferId,
    });
    this.eventsService.broadcast('transporter.status_changed', {
      transporterId: transfer.assignedTransporterId,
      status: 'AVAILABLE',
    });
    this.eventsService.broadcast('dashboard.metrics_updated', { timestamp: new Date().toISOString() });

    return { message: 'Transporter unassigned' };
  }

  async getAvailableTransporters() {
    return this.prisma.user.findMany({
      where: {
        employeeStatus: { in: [EmployeeStatus.AVAILABLE, EmployeeStatus.BUSY] },
        role: 'TRANSPORTER',
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeStatus: true,
        department: true,
      },
    });
  }
}