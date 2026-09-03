import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { ContentsService } from './contents.service.js';
import { CreateContentDto } from './dto/create-content.dto.js';
import { ListContentsQueryDto } from './dto/list-contents-query.dto.js';
import { UpdateContentDto } from './dto/update-content.dto.js';

@Controller()
@UseGuards(SupabaseAuthGuard)
export class ContentsController {
  constructor(private readonly contents: ContentsService) {}

  @Get('subjects/:subjectId/contents')
  async list(
    @CurrentUser() user: AuthUser,
    @Param('subjectId', new ParseUUIDPipe()) subjectId: string,
    @Query() query: ListContentsQueryDto,
  ) {
    return { data: await this.contents.list(user.id, subjectId, query) };
  }

  @Post('subjects/:subjectId/contents')
  async create(
    @CurrentUser() user: AuthUser,
    @Param('subjectId', new ParseUUIDPipe()) subjectId: string,
    @Body() input: CreateContentDto,
  ) {
    return { data: await this.contents.create(user.id, subjectId, input) };
  }

  @Get('contents/:id')
  async get(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { data: await this.contents.get(user.id, id) };
  }

  @Patch('contents/:id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateContentDto,
  ) {
    return { data: await this.contents.update(user.id, id, input) };
  }

  @Post('contents/:id/archive')
  async archive(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { data: await this.contents.setArchived(user.id, id, true) };
  }

  @Post('contents/:id/restore')
  async restore(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { data: await this.contents.setArchived(user.id, id, false) };
  }

  @Delete('contents/:id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.contents.remove(user.id, id);
  }
}
