import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { OverdueModule } from '../overdue/overdue.module.js';
import { MetricsController } from './metrics.controller.js';
import { MetricsService } from './metrics.service.js';

@Module({
  imports: [AuthModule, OverdueModule],
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class MetricsModule {}
