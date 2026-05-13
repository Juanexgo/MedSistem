import { Controller, Get, Post, Body, Param, UseGuards, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionAction } from '@prisma/client';
import { CommentsService } from './comments.service';
import { CreateCommentDto, QueryCommentsDto } from './dto/comments.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Request } from 'express';

@ApiTags('Comments')
@ApiBearerAuth()
@Controller('comments')
@UseGuards(PermissionsGuard)
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Post()
  @RequirePermissions(PermissionAction.CREATE_COMMENT)
  @ApiOperation({ summary: 'Create a comment' })
  create(@Body() dto: CreateCommentDto, @CurrentUser('id') userId: string, @Req() req: Request) {
    return this.commentsService.create(dto, userId, req);
  }

  @Get()
  @RequirePermissions(PermissionAction.VIEW_COMMENTS)
  @ApiOperation({ summary: 'Get all comments with filters' })
  findAll(@Query() query: QueryCommentsDto) {
    return this.commentsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(PermissionAction.VIEW_COMMENTS)
  @ApiOperation({ summary: 'Get comment by id' })
  findById(@Param('id') id: string) {
    return this.commentsService.findById(id);
  }

  @Get('transfer/:transferId')
  @RequirePermissions(PermissionAction.VIEW_COMMENTS)
  @ApiOperation({ summary: 'Get comments by transfer' })
  findByTransfer(@Param('transferId') transferId: string) {
    return this.commentsService.findByTransfer(transferId);
  }

  @Post(':id/important')
  @RequirePermissions(PermissionAction.CREATE_COMMENT)
  @ApiOperation({ summary: 'Mark comment as important' })
  markImportant(@Param('id') id: string, @CurrentUser('id') userId: string, @Req() req: Request) {
    return this.commentsService.markImportant(id, userId, req);
  }

  @Post(':id/resolve')
  @RequirePermissions(PermissionAction.CREATE_COMMENT)
  @ApiOperation({ summary: 'Resolve comment' })
  resolve(@Param('id') id: string, @CurrentUser('id') userId: string, @Req() req: Request) {
    return this.commentsService.resolve(id, userId, req);
  }

  @Post(':id/close')
  @RequirePermissions(PermissionAction.CREATE_COMMENT)
  @ApiOperation({ summary: 'Close comment' })
  close(@Param('id') id: string, @CurrentUser('id') userId: string, @Req() req: Request) {
    return this.commentsService.close(id, userId, req);
  }
}
