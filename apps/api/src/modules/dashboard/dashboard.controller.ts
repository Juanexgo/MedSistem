import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PermissionAction } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(PermissionsGuard)
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get()
  @RequirePermissions(PermissionAction.VIEW_DASHBOARD)
  @ApiOperation({ summary: 'Get full dashboard data' })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['today', 'shift', '7days', '30days'] })
  @ApiQuery({ name: 'zone', required: false })
  @ApiQuery({ name: 'priority', required: false, enum: ['URGENT', 'HIGH', 'NORMAL', 'SCHEDULED'] })
  getFullDashboard(
    @Query('timeRange') timeRange?: string,
    @Query('zone') zone?: string,
    @Query('priority') priority?: string,
  ) {
    return this.service.getFullDashboard(timeRange, zone, priority);
  }

  @Get('metrics')
  @RequirePermissions(PermissionAction.VIEW_DASHBOARD)
  @ApiOperation({ summary: 'Get operational metrics' })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['today', 'shift', '7days', '30days'] })
  @ApiQuery({ name: 'zone', required: false })
  @ApiQuery({ name: 'priority', required: false, enum: ['URGENT', 'HIGH', 'NORMAL', 'SCHEDULED'] })
  getMetrics(
    @Query('timeRange') timeRange?: string,
    @Query('zone') zone?: string,
    @Query('priority') priority?: string,
  ) {
    return this.service.getMetrics(timeRange, zone, priority);
  }

  @Get('transporters')
  @RequirePermissions(PermissionAction.VIEW_DASHBOARD)
  @ApiOperation({ summary: 'Get transporter availability' })
  getTransporters() {
    return this.service.getTransporterAvailability();
  }

  @Get('zones')
  @RequirePermissions(PermissionAction.VIEW_DASHBOARD)
  @ApiOperation({ summary: 'Get zone saturation' })
  getZones() {
    return this.service.getZoneSaturation();
  }

  @Get('oxygen')
  @RequirePermissions(PermissionAction.VIEW_DASHBOARD)
  @ApiOperation({ summary: 'Get oxygen usage summary' })
  getOxygen() {
    return this.service.getOxygenSummary();
  }

  @Get('active-transfers')
  @RequirePermissions(PermissionAction.VIEW_TRANSFERS)
  @ApiOperation({ summary: 'Get active transfers for dashboard' })
  @ApiQuery({ name: 'zone', required: false })
  getActiveTransfers(@Query('zone') zone?: string) {
    return this.service.getActiveTransfers(zone);
  }

  @Get('unassigned-urgent')
  @RequirePermissions(PermissionAction.VIEW_TRANSFERS)
  @ApiOperation({ summary: 'Get unassigned urgent transfers' })
  getUnassignedUrgent() {
    return this.service.getUnassignedUrgentTransfers();
  }

  @Get('activity')
  @RequirePermissions(PermissionAction.VIEW_DASHBOARD)
  @ApiOperation({ summary: 'Get recent activity feed' })
  getActivity() {
    return this.service.getRecentActivity();
  }
}
