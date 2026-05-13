import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionAction, UserRole } from '@prisma/client';
import { PatientsService } from './patients.service';
import { CreatePatientDto, UpdatePatientDto } from './dto/patients.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('patients')
@UseGuards(PermissionsGuard)
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  @Post()
  @RequirePermissions(PermissionAction.VIEW_PATIENT_DATA)
  @ApiOperation({ summary: 'Create patient record' })
  create(@Body() dto: CreatePatientDto) {
    return this.patientsService.create(dto);
  }

  @Get()
  @RequirePermissions(PermissionAction.VIEW_PATIENT_DATA)
  @ApiOperation({
    summary:
      'List patients (TRANSPORTER role gets a sanitized view — no medical record number or clinical notes)',
  })
  findAll(@CurrentUser('role') role: UserRole) {
    return this.patientsService.findAll(role);
  }

  @Get(':id')
  @RequirePermissions(PermissionAction.VIEW_PATIENT_DATA)
  @ApiOperation({
    summary:
      'Get patient by id (TRANSPORTER role gets a sanitized view — no medical record number or clinical notes)',
  })
  findById(@Param('id') id: string, @CurrentUser('role') role: UserRole) {
    return this.patientsService.findById(id, role);
  }

  @Put(':id')
  @RequirePermissions(PermissionAction.VIEW_PATIENT_DATA)
  @ApiOperation({ summary: 'Update patient record' })
  update(@Param('id') id: string, @Body() dto: UpdatePatientDto) {
    return this.patientsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PermissionAction.VIEW_PATIENT_DATA)
  @ApiOperation({ summary: 'Soft-delete a patient record' })
  remove(@Param('id') id: string) {
    return this.patientsService.softDelete(id);
  }
}
