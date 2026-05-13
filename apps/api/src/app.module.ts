import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PatientsModule } from './modules/patients/patients.module';
import { TransfersModule } from './modules/transfers/transfers.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { OxygenModule } from './modules/oxygen/oxygen.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { ShiftHandoffModule } from './modules/shift-handoff/shift-handoff.module';
import { CommentsModule } from './modules/comments/comments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { AuditModule } from './modules/audit/audit.module';
import { SecurityIncidentsModule } from './modules/security-incidents/security-incidents.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ZonesModule } from './modules/zones/zones.module';
import { EventsModule } from './modules/events/events.module';
import { ExportsModule } from './modules/exports/exports.module';
import { OperationsLogModule } from './modules/operations-log/operations-log.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PatientsModule,
    TransfersModule,
    AssignmentsModule,
    OxygenModule,
    TrackingModule,
    ShiftsModule,
    ShiftHandoffModule,
    CommentsModule,
    NotificationsModule,
    CommunicationModule,
    AuditModule,
    SecurityIncidentsModule,
    DashboardModule,
    ZonesModule,
    ExportsModule,
    OperationsLogModule,
    EventsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
