import { Module } from '@nestjs/common';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';
export { ShiftsService };
@Module({ controllers: [ShiftsController], providers: [ShiftsService], exports: [ShiftsService] })
export class ShiftsModule {}
