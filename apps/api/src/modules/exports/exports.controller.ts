import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionAction } from '@prisma/client';
import { ExportsService } from './exports.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Request } from 'express';

@ApiTags('Exports')
@ApiBearerAuth()
@Controller('exports')
@UseGuards(PermissionsGuard)
export class ExportsController {
  constructor(private service: ExportsService) {}

  @Get('transfers')
  @RequirePermissions(PermissionAction.EXPORT_REPORTS)
  @ApiOperation({ summary: 'Export transfers' })
  exportTransfers(@Query('from') from?: string, @Query('to') to?: string, @CurrentUser('id') userId?: string, @Req() req?: Request) {
    return this.service.exportTransfers(from, to, userId, req);
  }

  @Get('audit-logs')
  @RequirePermissions(PermissionAction.EXPORT_REPORTS)
  @ApiOperation({ summary: 'Export audit logs' })
  exportAuditLogs(@Query('from') from?: string, @Query('to') to?: string, @CurrentUser('id') userId?: string, @Req() req?: Request) {
    return this.service.exportAuditLogs(from, to, userId, req);
  }
}
