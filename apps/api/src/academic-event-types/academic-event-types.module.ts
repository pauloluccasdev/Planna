import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AcademicEventTypesController } from './academic-event-types.controller.js';
import { AcademicEventTypesService } from './academic-event-types.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AcademicEventTypesController],
  providers: [AcademicEventTypesService],
})
export class AcademicEventTypesModule {}
