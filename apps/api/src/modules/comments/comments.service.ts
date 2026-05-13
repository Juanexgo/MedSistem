import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { EventsService } from '../events/events.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCommentDto, QueryCommentsDto } from './dto/comments.dto';
import { AuditAction, CommentStatus } from '@prisma/client';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private eventsService: EventsService,
    private notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateCommentDto, userId: string, request?: any) {
    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        isImportant: dto.isImportant || false,
        transferRequestId: dto.transferRequestId,
        category: dto.category,
        type: (dto.type as any) || 'GENERAL',
        severity: (dto.severity as any) || 'INFO',
        userId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
        transferRequest: { select: { id: true, trackingToken: true, patient: { select: { fullName: true } } } },
      },
    });

    // Emit to transfer room
    if (dto.transferRequestId) {
      this.eventsService.emitToRoom('transfer.' + dto.transferRequestId, 'comment.created', {
        commentId: comment.id,
        transferId: dto.transferRequestId,
        userId,
        isImportant: dto.isImportant || false,
      });
    }

    // Broadcast important comment
    if (dto.isImportant) {
      this.eventsService.broadcast('comment.important', {
        commentId: comment.id,
        transferId: dto.transferRequestId,
        content: dto.content.substring(0, 200),
      });
      // Notify all admin/head_nurse/supervisor
      const managers = await this.prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'HEAD_NURSE', 'SUPERVISOR'] }, isActive: true, deletedAt: null },
        select: { id: true },
      });
      for (const manager of managers) {
        await this.notificationsService.create({
          userId: manager.id,
          type: 'COMMENT_IMPORTANT',
          title: 'Important comment',
          message: dto.content.substring(0, 200),
          metadata: { commentId: comment.id, transferId: dto.transferRequestId },
        }).catch(() => {});
      }
    }

    // Broadcast comment.created for all
    this.eventsService.broadcast('comment.created', {
      commentId: comment.id,
      content: dto.content.substring(0, 200),
      type: dto.type || 'GENERAL',
      severity: dto.severity || 'INFO',
      userId,
      transferId: dto.transferRequestId,
    });

    await this.auditService.log({
      userId, action: AuditAction.CREATE, entity: 'Comment', entityId: comment.id,
      request, comment: `Comment created: ${dto.content.substring(0, 100)}`,
    });
    return comment;
  }

  async findAll(query: QueryCommentsDto) {
    const where: any = { deletedAt: null };
    const page = parseInt(query.page || '1');
    const limit = Math.min(parseInt(query.limit || '20'), 100);
    const skip = (page - 1) * limit;

    if (query.type) where.type = query.type;
    if (query.severity) where.severity = query.severity;
    if (query.status) where.status = query.status;
    if (query.transferRequestId) where.transferRequestId = query.transferRequestId;
    if (query.userId) where.userId = query.userId;
    if (query.isImportant === 'true') where.isImportant = true;
    if (query.search) {
      where.OR = [
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
      if (query.toDate) where.createdAt.lte = new Date(query.toDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, role: true } },
          transferRequest: { select: { id: true, trackingToken: true, patient: { select: { fullName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.comment.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
        transferRequest: { select: { id: true, trackingToken: true, patient: { select: { fullName: true } } } },
      },
    });
    if (!comment || comment.deletedAt) throw new NotFoundException('Comment not found');
    return comment;
  }

  async findByTransfer(transferId: string) {
    return this.prisma.comment.findMany({
      where: { transferRequestId: transferId, deletedAt: null },
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markImportant(id: string, userId: string, request?: any) {
    const comment = await this.findById(id);
    const updated = await this.prisma.comment.update({
      where: { id },
      data: { isImportant: true },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
        transferRequest: { select: { id: true, trackingToken: true } },
      },
    });

    this.eventsService.broadcast('comment.important', {
      commentId: id,
      transferId: comment.transferRequestId,
      content: comment.content.substring(0, 200),
    });

    // Notify managers
    const managers = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'HEAD_NURSE', 'SUPERVISOR'] }, isActive: true, deletedAt: null },
      select: { id: true },
    });
    for (const manager of managers) {
      await this.notificationsService.create({
        userId: manager.id,
        type: 'COMMENT_IMPORTANT',
        title: 'Comment marked as important',
        message: comment.content.substring(0, 200),
        metadata: { commentId: id, transferId: comment.transferRequestId },
      }).catch(() => {});
    }

    await this.auditService.log({
      userId, action: AuditAction.MARK_IMPORTANT, entity: 'Comment', entityId: id,
      request, comment: 'Comment marked as important',
    });
    return updated;
  }

  async resolve(id: string, userId: string, request?: any) {
    const comment = await this.findById(id);
    const updated = await this.prisma.comment.update({
      where: { id },
      data: { status: CommentStatus.RESOLVED, resolvedAt: new Date(), resolvedById: userId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
        transferRequest: { select: { id: true, trackingToken: true } },
      },
    });

    await this.auditService.log({
      userId, action: AuditAction.RESOLVE, entity: 'Comment', entityId: id,
      request, comment: 'Comment resolved',
    });
    return updated;
  }

  async close(id: string, userId: string, request?: any) {
    const comment = await this.findById(id);
    const updated = await this.prisma.comment.update({
      where: { id },
      data: { status: CommentStatus.CLOSED, resolvedAt: new Date(), resolvedById: userId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
        transferRequest: { select: { id: true, trackingToken: true } },
      },
    });

    await this.auditService.log({
      userId, action: AuditAction.RESOLVE, entity: 'Comment', entityId: id,
      request, comment: 'Comment closed',
    });
    return updated;
  }
}
