import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AcademicEventsController } from './academic-events.controller.js';
import { AcademicEventsService } from './academic-events.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AcademicEventsController],
  providers: [AcademicEventsService],
})
export class AcademicEventsModule {}
