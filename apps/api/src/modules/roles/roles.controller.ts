import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionAction } from '@prisma/client';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto, AddPermissionDto } from './dto/roles.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(PermissionsGuard)
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Post()
  @RequirePermissions(PermissionAction.MANAGE_ROLES)
  @ApiOperation({ summary: 'Create role' })
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Get()
  @RequirePermissions(PermissionAction.MANAGE_ROLES)
  @ApiOperation({ summary: 'List all roles' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @RequirePermissions(PermissionAction.MANAGE_ROLES)
  @ApiOperation({ summary: 'Get role by ID' })
  findById(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  @Put(':id')
  @RequirePermissions(PermissionAction.MANAGE_ROLES)
  @ApiOperation({ summary: 'Update role and replace permissions' })
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PermissionAction.MANAGE_ROLES)
  @ApiOperation({ summary: 'Delete role (system roles protected)' })
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }

  @Post(':id/permissions')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionAction.MANAGE_ROLES)
  @ApiOperation({ summary: 'Add permission to role' })
  addPermission(@Param('id') id: string, @Body() dto: AddPermissionDto) {
    return this.rolesService.addPermission(id, dto);
  }

  @Delete(':id/permissions/:permissionId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionAction.MANAGE_ROLES)
  @ApiOperation({ summary: 'Remove permission from role' })
  removePermission(@Param('id') id: string, @Param('permissionId') permissionId: string) {
    return this.rolesService.removePermission(id, permissionId);
  }
}