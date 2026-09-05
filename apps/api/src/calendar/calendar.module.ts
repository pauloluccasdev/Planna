import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { OverdueModule } from '../overdue/overdue.module.js';
import { CalendarController } from './calendar.controller.js';
import { CalendarService } from './calendar.service.js';

@Module({
  imports: [AuthModule, OverdueModule],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
