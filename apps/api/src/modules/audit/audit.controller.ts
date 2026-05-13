import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from '../../audit/audit.service';
import { QueryAuditDto } from './dto/audit.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PermissionAction } from '@prisma/client';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(PermissionsGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @RequirePermissions(PermissionAction.VIEW_AUDIT)
  @ApiOperation({ summary: 'Get audit logs with filters' })
  findAll(@Query() query: QueryAuditDto) {
    return this.auditService.findAll(query);
  }
}
