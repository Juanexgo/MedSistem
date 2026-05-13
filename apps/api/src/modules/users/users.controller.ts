import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionAction } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, AssignRoleDto, UpdateEmployeeStatusDto } from './dto/users.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(PermissionsGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @RequirePermissions(PermissionAction.MANAGE_USERS)
  @ApiOperation({ summary: 'Create a new user' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @RequirePermissions(PermissionAction.MANAGE_USERS)
  @ApiOperation({ summary: 'Get all users' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @RequirePermissions(PermissionAction.MANAGE_USERS)
  @ApiOperation({ summary: 'Get user by ID' })
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  @RequirePermissions(PermissionAction.MANAGE_USERS)
  @ApiOperation({ summary: 'Update user' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PermissionAction.MANAGE_USERS)
  @ApiOperation({ summary: 'Soft delete user' })
  remove(@Param('id') id: string) {
    return this.usersService.softDelete(id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionAction.RESTORE_USER)
  @ApiOperation({ summary: 'Restore a soft-deleted user' })
  restore(@Param('id') id: string) {
    return this.usersService.restore(id);
  }

  @Put(':id/role')
  @RequirePermissions(PermissionAction.MANAGE_USERS)
  @ApiOperation({ summary: 'Assign role to user' })
  assignRole(@Param('id') id: string, @Body() dto: AssignRoleDto) {
    return this.usersService.assignRole(id, dto);
  }

  @Put(':id/employee-status')
  @RequirePermissions(PermissionAction.MANAGE_USERS)
  @ApiOperation({ summary: 'Update employee status' })
  updateEmployeeStatus(@Param('id') id: string, @Body() dto: UpdateEmployeeStatusDto) {
    return this.usersService.updateEmployeeStatus(id, dto);
  }
}