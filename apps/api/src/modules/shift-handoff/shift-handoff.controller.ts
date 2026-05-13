import { Controller, Post, Get, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PermissionAction } from '@prisma/client';
import { ShiftHandoffService } from './shift-handoff.service';
import { ShiftHandoffDto } from '../shifts/dto/shifts.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Shift Handoff')
@ApiBearerAuth()
@Controller('shift-handoff')
@UseGuards(PermissionsGuard)
export class ShiftHandoffController {
  constructor(private service: ShiftHandoffService) {}

  @Post(':shiftId')
  @RequirePermissions(PermissionAction.MANAGE_HANDOFF)
  @ApiOperation({ summary: 'Create shift handoff' })
  create(
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @Body() dto: ShiftHandoffDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.create(shiftId, { ...dto, handedOffById: userId });
  }

  @Get('pending')
  @RequirePermissions(PermissionAction.MANAGE_HANDOFF)
  @ApiOperation({ summary: 'Get shifts pending handoff' })
  getPending() {
    return this.service.getPending();
  }

  @Get()
  @RequirePermissions(PermissionAction.MANAGE_HANDOFF)
  @ApiOperation({ summary: 'List all handoffs' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.service.findAll(page, limit);
  }

  @Get('user/:userId')
  @RequirePermissions(PermissionAction.MANAGE_HANDOFF)
  @ApiOperation({ summary: 'Get handoffs by user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findByUser(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.findByUser(userId, page, limit);
  }

  @Get(':shiftId')
  @RequirePermissions(PermissionAction.MANAGE_HANDOFF)
  @ApiOperation({ summary: 'Get handoff by shift ID' })
  findByShift(@Param('shiftId', ParseUUIDPipe) shiftId: string) {
    return this.service.findByShiftId(shiftId);
  }
}
