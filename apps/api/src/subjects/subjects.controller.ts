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
import { CreateSubjectDto } from './dto/create-subject.dto.js';
import { ListSubjectsQueryDto } from './dto/list-subjects-query.dto.js';
import { UpdateSubjectDto } from './dto/update-subject.dto.js';
import { SubjectsService } from './subjects.service.js';

@Controller()
@UseGuards(SupabaseAuthGuard)
export class SubjectsController {
  constructor(private readonly subjects: SubjectsService) {}

  @Get('courses/:courseId/subjects')
  async list(
    @CurrentUser() user: AuthUser,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Query() query: ListSubjectsQueryDto,
  ) {
    return { data: await this.subjects.list(user.id, courseId, query) };
  }

  @Post('courses/:courseId/subjects')
  async create(
    @CurrentUser() user: AuthUser,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Body() input: CreateSubjectDto,
  ) {
    return { data: await this.subjects.create(user.id, courseId, input) };
  }

  @Get('subjects/:id')
  async get(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { data: await this.subjects.get(user.id, id) };
  }

  @Patch('subjects/:id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateSubjectDto,
  ) {
    return { data: await this.subjects.update(user.id, id, input) };
  }

  @Post('subjects/:id/archive')
  async archive(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { data: await this.subjects.setArchived(user.id, id, true) };
  }

  @Post('subjects/:id/restore')
  async restore(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { data: await this.subjects.setArchived(user.id, id, false) };
  }

  @Delete('subjects/:id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.subjects.remove(user.id, id);
  }
}
