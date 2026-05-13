import { Module } from '@nestjs/common';
import { OxygenController } from './oxygen.controller';
import { OxygenService } from './oxygen.service';
import { NotificationsModule } from '../notifications/notifications.module';

export { OxygenService };

@Module({
  imports: [NotificationsModule],
  controllers: [OxygenController],
  providers: [OxygenService],
  exports: [OxygenService],
})
export class OxygenModule {}
