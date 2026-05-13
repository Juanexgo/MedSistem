import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OperationsLogService } from './operations-log.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PermissionAction } from '@prisma/client';

@ApiTags('Operations Log')
@ApiBearerAuth()
@Controller('operations-log')
@UseGuards(PermissionsGuard)
export class OperationsLogController {
  constructor(private service: OperationsLogService) {}

  @Get()
  @RequirePermissions(PermissionAction.VIEW_DASHBOARD)
  @ApiOperation({ summary: 'Get unified operations log' })
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }
}
