import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';
import { SupabaseAuthService } from './supabase-auth.service.js';

@Module({
  controllers: [AuthController],
  providers: [SupabaseAuthGuard, SupabaseAuthService],
  exports: [SupabaseAuthGuard, SupabaseAuthService],
})
export class AuthModule {}
