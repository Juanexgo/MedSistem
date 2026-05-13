import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionAction } from '@prisma/client';
import { CommunicationService } from './communication.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('Communication Center')
@ApiBearerAuth()
@Controller('communication')
@UseGuards(PermissionsGuard)
export class CommunicationController {
  constructor(private service: CommunicationService) {}

  @Get('operations-center')
  @RequirePermissions(PermissionAction.VIEW_COMMENTS)
  @ApiOperation({ summary: 'Get operations center overview' })
  getOpsCenter() { return this.service.getOperationsCenter(); }
}
