import { Module } from '@nestjs/common';
import { TrackingController } from './tracking.controller';
import { TransfersModule } from '../transfers/transfers.module';

@Module({
  imports: [TransfersModule],
  controllers: [TrackingController],
})
export class TrackingModule {}
