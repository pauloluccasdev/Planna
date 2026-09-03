import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/auth-user.decorator.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { CompleteStudySessionDto } from './dto/complete-study-session.dto.js';
import { ListStudySessionsQueryDto } from './dto/list-study-sessions-query.dto.js';
import { StartUnplannedSessionDto } from './dto/start-unplanned-session.dto.js';
import { StudySessionsService } from './study-sessions.service.js';

@Controller()
@UseGuards(SupabaseAuthGuard)
export class StudySessionsController {
  constructor(private readonly sessions: StudySessionsService) {}

  @Get('study-sessions')
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListStudySessionsQueryDto,
  ) {
    return { data: await this.sessions.list(user.id, query) };
  }

  @Get('study-sessions/active')
  async active(@CurrentUser() user: AuthUser) {
    return { data: await this.sessions.active(user.id) };
  }

  @Get('study-sessions/:id')
  async get(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { data: await this.sessions.get(user.id, id) };
  }

  @Post('study-blocks/:blockId/sessions/start')
  async startPlanned(
    @CurrentUser() user: AuthUser,
    @Param('blockId', new ParseUUIDPipe()) blockId: string,
  ) {
    return { data: await this.sessions.startPlanned(user.id, blockId) };
  }

  @Post('study-sessions/unplanned/start')
  async startUnplanned(
    @CurrentUser() user: AuthUser,
    @Body() input: StartUnplannedSessionDto,
  ) {
    return { data: await this.sessions.startUnplanned(user.id, input) };
  }

  @Post('study-sessions/:id/pause')
  async pause(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { data: await this.sessions.pause(user.id, id) };
  }

  @Post('study-sessions/:id/resume')
  async resume(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { data: await this.sessions.resume(user.id, id) };
  }

  @Post('study-sessions/:id/complete')
  async complete(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: CompleteStudySessionDto,
  ) {
    return { data: await this.sessions.complete(user.id, id, input) };
  }
}
