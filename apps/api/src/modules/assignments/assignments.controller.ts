import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionAction } from '@prisma/client';
import { AssignmentsService } from './assignments.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Assignments')
@ApiBearerAuth()
@Controller('assignments')
@UseGuards(PermissionsGuard)
export class AssignmentsController {
  constructor(private assignmentsService: AssignmentsService) {}

  @Post(':transferId/assign/:transporterId')
  @RequirePermissions(PermissionAction.ASSIGN_TRANSFER)
  @ApiOperation({ summary: 'Assign transporter to transfer' })
  assign(@Param('transferId') transferId: string, @Param('transporterId') transporterId: string, @CurrentUser('id') userId: string) {
    return this.assignmentsService.assign(transferId, transporterId, userId);
  }

  @Post(':transferId/reassign/:transporterId')
  @RequirePermissions(PermissionAction.REASSIGN_TRANSFER)
  @ApiOperation({ summary: 'Reassign transporter' })
  reassign(@Param('transferId') transferId: string, @Param('transporterId') transporterId: string, @CurrentUser('id') userId: string) {
    return this.assignmentsService.reassign(transferId, transporterId, userId);
  }

  @Post(':transferId/unassign')
  @RequirePermissions(PermissionAction.REASSIGN_TRANSFER)
  @ApiOperation({ summary: 'Unassign transporter' })
  unassign(@Param('transferId') transferId: string, @CurrentUser('id') userId: string) {
    return this.assignmentsService.unassign(transferId, userId);
  }

  @Get('available')
  @RequirePermissions(PermissionAction.VIEW_TRANSFERS)
  @ApiOperation({ summary: 'Get available transporters' })
  getAvailable() {
    return this.assignmentsService.getAvailableTransporters();
  }
}
