import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/auth-user.decorator.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { ListReplanningSuggestionsQueryDto } from './dto/list-replanning-suggestions-query.dto.js';
import { UpdateReplanningSuggestionDto } from './dto/update-replanning-suggestion.dto.js';
import { ReplanningService } from './replanning.service.js';

@Controller()
@UseGuards(SupabaseAuthGuard)
export class ReplanningController {
  constructor(private readonly replanning: ReplanningService) {}

  @Get('replanning-suggestions')
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListReplanningSuggestionsQueryDto,
  ) {
    return { data: await this.replanning.list(user.id, query.status) };
  }

  @Get('replanning-suggestions/:id')
  async get(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { data: await this.replanning.get(user.id, id) };
  }

  @Patch('replanning-suggestions/:id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateReplanningSuggestionDto,
  ) {
    return { data: await this.replanning.update(user.id, id, input) };
  }

  @Post('replanning-suggestions/:id/accept')
  async accept(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return {
      data: await this.replanning.accept(user.id, id, idempotencyKey),
    };
  }

  @Post('replanning-suggestions/:id/reject')
  async reject(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { data: await this.replanning.reject(user.id, id) };
  }

  @Post('study-blocks/:id/replanning-suggestions')
  async request(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { data: await this.replanning.request(user.id, id) };
  }
}
