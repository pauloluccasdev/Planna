import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AvailabilityModule } from '../availability/availability.module.js';
import { OverdueModule } from '../overdue/overdue.module.js';
import { ReplanningController } from './replanning.controller.js';
import { ReplanningService } from './replanning.service.js';

@Module({
  imports: [AuthModule, AvailabilityModule, OverdueModule],
  controllers: [ReplanningController],
  providers: [ReplanningService],
  exports: [ReplanningService],
})
export class ReplanningModule {}
