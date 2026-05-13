import { Controller, Get, Post, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionAction } from '@prisma/client';
import { SecurityIncidentsService } from './security-incidents.service';
import { QuerySecurityIncidentsDto } from './dto/security-incidents.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Request } from 'express';

@ApiTags('Security Incidents')
@ApiBearerAuth()
@Controller('security-incidents')
@UseGuards(PermissionsGuard)
export class SecurityIncidentsController {
  constructor(private service: SecurityIncidentsService) {}

  @Get()
  @RequirePermissions(PermissionAction.VIEW_SECURITY_INCIDENTS)
  @ApiOperation({ summary: 'Get all security incidents with filters' })
  findAll(@Query() query: QuerySecurityIncidentsDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(PermissionAction.VIEW_SECURITY_INCIDENTS)
  @ApiOperation({ summary: 'Get incident by id' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post(':id/resolve')
  @RequirePermissions(PermissionAction.MANAGE_SECURITY_INCIDENTS)
  @ApiOperation({ summary: 'Resolve incident' })
  resolve(@Param('id') id: string, @Body('resolution') resolution: string, @CurrentUser('id') userId: string, @Req() req: Request) {
    return this.service.resolve(id, userId, resolution, req);
  }
}
