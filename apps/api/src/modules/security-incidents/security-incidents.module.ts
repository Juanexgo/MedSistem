import { Global, Module } from '@nestjs/common';
import { SecurityIncidentsController } from './security-incidents.controller';
import { SecurityIncidentsService } from './security-incidents.service';

@Global()
@Module({
  controllers: [SecurityIncidentsController],
  providers: [SecurityIncidentsService],
  exports: [SecurityIncidentsService],
})
export class SecurityIncidentsModule {}
