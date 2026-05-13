import { Module } from '@nestjs/common';
import { ShiftHandoffController } from './shift-handoff.controller';
import { ShiftHandoffService } from './shift-handoff.service';
export { ShiftHandoffService };
@Module({ controllers: [ShiftHandoffController], providers: [ShiftHandoffService], exports: [ShiftHandoffService] })
export class ShiftHandoffModule {}
