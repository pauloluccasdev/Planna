import { Controller, Get, UseGuards } from '@nestjs/common';
import type { AuthUser } from './auth-user.js';
import { CurrentUser } from './auth-user.decorator.js';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';

@Controller()
export class AuthController {
  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return { data: { id: user.id, email: user.email } };
  }
}
