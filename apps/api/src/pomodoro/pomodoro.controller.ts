import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/auth-user.decorator.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { UpdatePomodoroPreferenceDto } from './dto/update-pomodoro-preference.dto.js';
import { PomodoroService } from './pomodoro.service.js';

@Controller('pomodoro-preference')
@UseGuards(SupabaseAuthGuard)
export class PomodoroController {
  constructor(private readonly pomodoro: PomodoroService) {}

  @Get()
  async get(@CurrentUser() user: AuthUser) {
    return { data: await this.pomodoro.get(user.id) };
  }

  @Put()
  async update(
    @CurrentUser() user: AuthUser,
    @Body() input: UpdatePomodoroPreferenceDto,
  ) {
    return { data: await this.pomodoro.update(user.id, input) };
  }
}
