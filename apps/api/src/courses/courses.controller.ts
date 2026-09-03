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
import { CoursesService } from './courses.service.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { ListCoursesQueryDto } from './dto/list-courses-query.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';

@Controller('courses')
@UseGuards(SupabaseAuthGuard)
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListCoursesQueryDto,
  ) {
    return { data: await this.courses.list(user.id, query.status) };
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() input: CreateCourseDto) {
    return { data: await this.courses.create(user.id, input) };
  }

  @Get(':id')
  async get(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { data: await this.courses.get(user.id, id) };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateCourseDto,
  ) {
    return { data: await this.courses.update(user.id, id, input) };
  }

  @Post(':id/archive')
  async archive(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { data: await this.courses.archive(user.id, id) };
  }

  @Post(':id/restore')
  async restore(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { data: await this.courses.restore(user.id, id) };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.courses.remove(user.id, id);
  }
}
