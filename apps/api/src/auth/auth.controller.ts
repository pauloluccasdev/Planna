import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from './auth-user.js';
import { CurrentUser } from './auth-user.decorator.js';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';
import { SupabaseAuthService } from './supabase-auth.service.js';
import { LoginDto } from './dto/login.dto.js';

@Controller()
export class AuthController {
  constructor(private readonly auth: SupabaseAuthService) {}

  @Post('auth/login')
  async login(@Body() input: LoginDto) {
    return { data: await this.auth.login(input) };
  }

  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return { data: { id: user.id, email: user.email } };
  }
}
