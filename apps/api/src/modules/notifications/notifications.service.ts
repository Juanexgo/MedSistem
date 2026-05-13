import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { EventsService } from '../events/events.service';
import { NotificationType } from '@prisma/client';
import { AuditAction } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private eventsService: EventsService,
  ) {}

  async findByUser(userId: string, query?: any) {
    const where: any = { userId };
    const page = parseInt(query?.page || '1');
    const limit = Math.min(parseInt(query?.limit || '50'), 100);
    const skip = (page - 1) * limit;

    if (query?.isRead === 'true') where.isRead = true;
    else if (query?.isRead === 'false') where.isRead = false;
    if (query?.type) where.type = query.type;
    if (query?.fromDate || query?.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
      if (query.toDate) where.createdAt.lte = new Date(query.toDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: any;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.metadata || undefined,
      },
    });

    // Emit realtime notification to the user
    this.eventsService.emitToUser(data.userId, 'notification.created', {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
    });

    return notification;
  }

  async markAsRead(id: string, userId?: string) {
    const notification = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    if (userId) {
      await this.auditService.log({
        userId, action: AuditAction.READ, entity: 'Notification', entityId: id,
        comment: 'Notification marked as read',
      });
    }

    return notification;
  }

  async markAllAsRead(userId: string) {
    const count = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    await this.auditService.log({
      userId, action: AuditAction.READ, entity: 'Notification', entityId: 'all',
      comment: 'All notifications marked as read',
    });

    return { message: `${count.count} notifications marked as read` };
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }
}
