import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/auth-user.decorator.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { AvailabilityService } from './availability.service.js';
import { ReplaceAvailabilityDto } from './dto/replace-availability.dto.js';

@Controller('availability')
@UseGuards(SupabaseAuthGuard)
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get()
  async get(@CurrentUser() user: AuthUser) {
    return { data: await this.availability.get(user.id) };
  }

  @Post('validate')
  async validate(
    @CurrentUser() user: AuthUser,
    @Body() input: ReplaceAvailabilityDto,
  ) {
    return { data: await this.availability.validate(user.id, input.intervals) };
  }

  @Put()
  async replace(
    @CurrentUser() user: AuthUser,
    @Body() input: ReplaceAvailabilityDto,
  ) {
    return { data: await this.availability.replace(user.id, input.intervals) };
  }
}
