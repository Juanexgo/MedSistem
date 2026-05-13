import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PermissionAction } from '@prisma/client';
import { ShiftsService } from './shifts.service';
import { StartShiftDto, EndShiftDto } from './dto/shifts.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Shifts')
@ApiBearerAuth()
@Controller('shifts')
@UseGuards(PermissionsGuard)
export class ShiftsController {
  constructor(private shiftsService: ShiftsService) {}

  @Post('start')
  @RequirePermissions(PermissionAction.MANAGE_SHIFTS)
  @ApiOperation({ summary: 'Start a shift' })
  startShift(@CurrentUser('id') userId: string, @Body() dto: StartShiftDto) {
    return this.shiftsService.startShift(userId, dto);
  }

  @Put(':id/end')
  @RequirePermissions(PermissionAction.MANAGE_SHIFTS)
  @ApiOperation({ summary: 'End a shift' })
  endShift(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto?: EndShiftDto,
  ) {
    return this.shiftsService.endShift(id, userId, dto);
  }

  @Get('type')
  @ApiOperation({ summary: 'Get current shift type based on time' })
  getCurrentType() {
    return this.shiftsService.getCurrentShiftType();
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current shift for user' })
  getCurrent(@CurrentUser('id') userId: string) {
    return this.shiftsService.getCurrentShift(userId);
  }

  @Get('active')
  @RequirePermissions(PermissionAction.MANAGE_SHIFTS)
  @ApiOperation({ summary: 'Get all active shifts' })
  getActive() {
    return this.shiftsService.getActiveShifts();
  }

  @Get('pending-handoff')
  @RequirePermissions(PermissionAction.MANAGE_HANDOFF)
  @ApiOperation({ summary: 'Get shifts pending handoff' })
  getPendingHandoff() {
    return this.shiftsService.getPendingHandoffShifts();
  }

  @Get('history')
  @ApiOperation({ summary: 'Get shift history for user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getHistory(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.shiftsService.getShiftHistory(userId, page, limit);
  }

  @Get()
  @RequirePermissions(PermissionAction.MANAGE_SHIFTS)
  @ApiOperation({ summary: 'Get all shifts' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.shiftsService.getAllShifts(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shift by ID' })
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.shiftsService.getShiftById(id);
  }
}
