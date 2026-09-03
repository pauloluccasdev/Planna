import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/auth-user.decorator.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { MetricsQueryDto } from './dto/metrics-query.dto.js';
import { MetricsService } from './metrics.service.js';

@Controller('metrics')
@UseGuards(SupabaseAuthGuard)
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get('summary')
  async summary(
    @CurrentUser() user: AuthUser,
    @Query() query: MetricsQueryDto,
  ) {
    return { data: await this.metrics.summary(user.id, query) };
  }

  @Get('time')
  async time(@CurrentUser() user: AuthUser, @Query() query: MetricsQueryDto) {
    return { data: await this.metrics.time(user.id, query) };
  }

  @Get('adaptation')
  async adaptation(
    @CurrentUser() user: AuthUser,
    @Query() query: MetricsQueryDto,
  ) {
    return { data: await this.metrics.adaptation(user.id, query) };
  }
}
