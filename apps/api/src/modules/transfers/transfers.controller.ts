import {
  Controller, Get, Post, Put, Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionAction } from '@prisma/client';
import { TransfersService } from './transfers.service';
import {
  CreateTransferDto,
  UpdateTransferDto,
  UpdateTransferStatusDto,
  TransferFilterDto,
} from './dto/transfers.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Transfers')
@ApiBearerAuth()
@Controller('transfers')
@UseGuards(PermissionsGuard)
export class TransfersController {
  constructor(private transfersService: TransfersService) {}

  @Post()
  @RequirePermissions(PermissionAction.CREATE_TRANSFER)
  @ApiOperation({ summary: 'Create a transfer request' })
  create(@Body() dto: CreateTransferDto, @CurrentUser('id') userId: string) {
    return this.transfersService.create(dto, userId);
  }

  @Get()
  @RequirePermissions(PermissionAction.VIEW_TRANSFERS)
  @ApiOperation({ summary: 'List transfers with filters, search, pagination' })
  findAll(@Query() filters: TransferFilterDto) {
    return this.transfersService.findAll(filters);
  }

  @Get('active')
  @RequirePermissions(PermissionAction.VIEW_TRANSFERS)
  @ApiOperation({ summary: 'Get active transports (non-terminal statuses)' })
  getActive() {
    return this.transfersService.getActiveTransports();
  }

  @Get(':id')
  @RequirePermissions(PermissionAction.VIEW_TRANSFERS)
  @ApiOperation({ summary: 'Get transfer by ID with full details' })
  findById(@Param('id') id: string) {
    return this.transfersService.findById(id);
  }

  @Get(':id/timeline')
  @RequirePermissions(PermissionAction.VIEW_TRANSFERS)
  @ApiOperation({ summary: 'Get full timeline of a transfer' })
  getTimeline(@Param('id') id: string) {
    return this.transfersService.getTimeline(id);
  }

  @Put(':id')
  @RequirePermissions(PermissionAction.EDIT_TRANSFER)
  @ApiOperation({ summary: 'Update transfer details' })
  update(@Param('id') id: string, @Body() dto: UpdateTransferDto) {
    return this.transfersService.update(id, dto);
  }

  @Put(':id/status')
  @RequirePermissions(PermissionAction.EDIT_TRANSFER)
  @ApiOperation({ summary: 'Update transfer status with validation' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTransferStatusDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.transfersService.updateStatus(id, dto, userId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionAction.CANCEL_TRANSFER)
  @ApiOperation({ summary: 'Cancel a transfer' })
  cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.transfersService.cancel(id, reason, userId);
  }
}