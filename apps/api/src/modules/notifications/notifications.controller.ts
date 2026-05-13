import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { QueryNotificationsDto } from './dto/notifications.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications with filters' })
  findMy(@CurrentUser('id') userId: string, @Query() query: QueryNotificationsDto) {
    return this.service.findByUser(userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread count' })
  unreadCount(@CurrentUser('id') userId: string) {
    return this.service.getUnreadCount(userId);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark as read' })
  markRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.markAsRead(id, userId);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all as read' })
  markAllRead(@CurrentUser('id') userId: string) {
    return this.service.markAllAsRead(userId);
  }
}
