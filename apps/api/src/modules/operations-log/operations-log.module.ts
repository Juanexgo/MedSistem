import { Module } from '@nestjs/common';
import { OperationsLogController } from './operations-log.controller';
import { OperationsLogService } from './operations-log.service';

@Module({
  controllers: [OperationsLogController],
  providers: [OperationsLogService],
})
export class OperationsLogModule {}
