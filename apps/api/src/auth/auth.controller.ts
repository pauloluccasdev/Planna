import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from './auth-user.js';
import { CurrentUser } from './auth-user.decorator.js';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';
import { SupabaseAuthService } from './supabase-auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Controller()
export class AuthController {
  constructor(private readonly auth: SupabaseAuthService) {}

  @Post('auth/login')
  async login(@Body() input: LoginDto) {
    return { data: await this.auth.login(input) };
  }

  @Post('auth/register')
  async register(@Body() input: RegisterDto) {
    return { data: await this.auth.register(input) };
  }

  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return {
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }
}
