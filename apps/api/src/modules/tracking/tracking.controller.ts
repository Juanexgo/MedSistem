import { Controller, Get, Param, Req, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { AuditAction } from '@prisma/client';
import { TransfersService } from '../transfers/transfers.service';
import { AuditService } from '../../audit/audit.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Tracking')
@Controller('tracking')
export class TrackingController {
  private readonly logger = new Logger(TrackingController.name);

  constructor(
    private transfersService: TransfersService,
    private auditService: AuditService,
  ) {}

  @Public()
  @Get(':trackingToken')
  @ApiOperation({ summary: 'Public tracking endpoint for a transfer' })
  async track(@Param('trackingToken') token: string, @Req() req: Request) {
    const data = await this.transfersService.findByTrackingToken(token);

    this.auditService.log({
      action: AuditAction.VIEW,
      entity: 'TransferRequest',
      entityId: data.id,
      request: req,
      comment: `Public tracking page accessed for transfer ${token}`,
    }).catch((err) => this.logger.warn(`Audit log failed: ${err}`));

    return data;
  }

  @Public()
  @Get(':trackingToken/timeline')
  @ApiOperation({ summary: 'Public timeline for a transfer' })
  async trackTimeline(@Param('trackingToken') token: string) {
    return this.transfersService.findByTrackingTokenForTimeline(token);
  }
}
