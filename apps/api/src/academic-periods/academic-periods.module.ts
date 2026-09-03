import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AcademicPeriodsController } from './academic-periods.controller.js';
import { AcademicPeriodsService } from './academic-periods.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AcademicPeriodsController],
  providers: [AcademicPeriodsService],
})
export class AcademicPeriodsModule {}
