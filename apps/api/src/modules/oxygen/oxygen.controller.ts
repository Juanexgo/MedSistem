import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionAction, OxygenTankStatus } from '@prisma/client';
import { OxygenService } from './oxygen.service';
import { CreateOxygenTankDto, UpdateOxygenTankDto, UpdateTankLevelDto, TankFilterDto } from './dto/oxygen.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Oxygen')
@ApiBearerAuth()
@Controller('oxygen')
@UseGuards(PermissionsGuard)
export class OxygenController {
  constructor(private oxygenService: OxygenService) {}

  @Post()
  @RequirePermissions(PermissionAction.MANAGE_OXYGEN)
  @ApiOperation({ summary: 'Create an oxygen tank' })
  create(@Body() dto: CreateOxygenTankDto, @CurrentUser('id') userId: string) {
    return this.oxygenService.create(dto, userId);
  }

  @Get()
  @RequirePermissions(PermissionAction.MANAGE_OXYGEN)
  @ApiOperation({ summary: 'List oxygen tanks with filters' })
  findAll(@Query() filters: TankFilterDto) {
    return this.oxygenService.findAll(filters);
  }

  @Get('low')
  @RequirePermissions(PermissionAction.MANAGE_OXYGEN)
  @ApiOperation({ summary: 'Get low/critical tanks' })
  getLow() {
    return this.oxygenService.getLowTanks();
  }

  @Get('alerts')
  @RequirePermissions(PermissionAction.MANAGE_OXYGEN)
  @ApiOperation({ summary: 'Get oxygen alerts' })
  getAlerts() {
    return this.oxygenService.getAlerts();
  }

  @Get(':id')
  @RequirePermissions(PermissionAction.MANAGE_OXYGEN)
  @ApiOperation({ summary: 'Get tank by ID with history and transfers' })
  findById(@Param('id') id: string) {
    return this.oxygenService.findById(id);
  }

  @Put(':id')
  @RequirePermissions(PermissionAction.MANAGE_OXYGEN)
  @ApiOperation({ summary: 'Update tank details' })
  update(@Param('id') id: string, @Body() dto: UpdateOxygenTankDto, @CurrentUser('id') userId: string) {
    return this.oxygenService.update(id, dto, userId);
  }

  @Put(':id/level')
  @RequirePermissions(PermissionAction.MANAGE_OXYGEN)
  @ApiOperation({ summary: 'Update tank level and/or PSI' })
  updateLevel(@Param('id') id: string, @Body() dto: UpdateTankLevelDto, @CurrentUser('id') userId: string) {
    return this.oxygenService.updateLevel(id, dto, userId);
  }

  @Put(':id/status')
  @RequirePermissions(PermissionAction.MANAGE_OXYGEN)
  @ApiOperation({ summary: 'Update tank status' })
  updateStatus(@Param('id') id: string, @Body('status') status: OxygenTankStatus, @CurrentUser('id') userId: string) {
    return this.oxygenService.updateStatus(id, status, userId);
  }

  @Put(':id/location')
  @RequirePermissions(PermissionAction.MANAGE_OXYGEN)
  @ApiOperation({ summary: 'Update tank location' })
  updateLocation(@Param('id') id: string, @Body('location') location: string, @CurrentUser('id') userId: string) {
    return this.oxygenService.updateLocation(id, location, userId);
  }

  @Put(':id/availability')
  @RequirePermissions(PermissionAction.MANAGE_OXYGEN)
  @ApiOperation({ summary: 'Toggle tank availability' })
  toggleAvailability(@Param('id') id: string, @Body('isAvailable') isAvailable: boolean, @CurrentUser('id') userId: string) {
    return this.oxygenService.toggleAvailability(id, isAvailable, userId);
  }

  @Put(':id/release')
  @RequirePermissions(PermissionAction.MANAGE_OXYGEN)
  @ApiOperation({ summary: 'Release tank from transfer' })
  releaseTank(@Param('id') id: string, @Body('transferId') transferId: string, @CurrentUser('id') userId: string) {
    return this.oxygenService.releaseTank(id, transferId, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionAction.MANAGE_OXYGEN)
  @ApiOperation({ summary: 'Deactivate/soft delete tank' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.oxygenService.softDelete(id, userId);
  }
}
