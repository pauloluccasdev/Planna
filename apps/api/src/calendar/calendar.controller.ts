import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/auth-user.decorator.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { CalendarService } from './calendar.service.js';
import { CalendarQueryDto } from './dto/calendar-query.dto.js';

@Controller('calendar')
@UseGuards(SupabaseAuthGuard)
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: CalendarQueryDto) {
    return { data: await this.calendar.list(user.id, query) };
  }
}
