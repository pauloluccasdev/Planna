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
import { CreateStudyBlockDto } from './dto/create-study-block.dto.js';
import { CreateRecurringStudyBlockDto } from './dto/create-recurring-study-block.dto.js';
import { ListStudyBlocksQueryDto } from './dto/list-study-blocks-query.dto.js';
import { StudyBlocksService } from './study-blocks.service.js';

@Controller('study-blocks')
@UseGuards(SupabaseAuthGuard)
export class StudyBlocksController {
  constructor(private readonly blocks: StudyBlocksService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListStudyBlocksQueryDto,
  ) {
    return { data: await this.blocks.list(user.id, query) };
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() input: CreateStudyBlockDto,
  ) {
    return { data: await this.blocks.create(user.id, input) };
  }

  @Post('recurring/daily')
  async createDailyRecurrence(
    @CurrentUser() user: AuthUser,
    @Body() input: CreateRecurringStudyBlockDto,
  ) {
    return {
      data: await this.blocks.createDailyRecurrence(user.id, input),
    };
  }

  @Get(':id')
  async get(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { data: await this.blocks.get(user.id, id) };
  }

  @Post(':id/cancel')
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { data: await this.blocks.cancel(user.id, id) };
  }

  @Post('series/:seriesId/cancel')
  async cancelSeries(
    @CurrentUser() user: AuthUser,
    @Param('seriesId', new ParseUUIDPipe()) seriesId: string,
  ) {
    return { data: await this.blocks.cancelSeries(user.id, seriesId) };
  }
}
