import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionAction } from '@prisma/client';
import { ZonesService } from './zones.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('Hospital Zones')
@ApiBearerAuth()
@Controller('zones')
@UseGuards(PermissionsGuard)
export class ZonesController {
  constructor(private service: ZonesService) {}

  @Get()
  @RequirePermissions(PermissionAction.VIEW_DASHBOARD)
  @ApiOperation({ summary: 'Get all zones' })
  findAll() { return this.service.findAll(); }

  @Post('seed')
  @RequirePermissions(PermissionAction.MANAGE_ZONES)
  @ApiOperation({ summary: 'Seed default zones' })
  seed() { return this.service.seedDefaultZones(); }
}