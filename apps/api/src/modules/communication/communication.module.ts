import { Module } from '@nestjs/common';
import { CommunicationController } from './communication.controller';
import { CommunicationService } from './communication.service';
import { CommentsModule } from '../comments/comments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SecurityIncidentsModule } from '../security-incidents/security-incidents.module';
@Module({ imports: [CommentsModule, NotificationsModule, SecurityIncidentsModule], controllers: [CommunicationController], providers: [CommunicationService] })
export class CommunicationModule {}
