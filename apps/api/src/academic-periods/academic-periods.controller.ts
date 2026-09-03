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
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/auth-user.decorator.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { AcademicPeriodsService } from './academic-periods.service.js';
import { CreateAcademicPeriodDto } from './dto/create-academic-period.dto.js';
import { UpdateAcademicPeriodDto } from './dto/update-academic-period.dto.js';

@Controller()
@UseGuards(SupabaseAuthGuard)
export class AcademicPeriodsController {
  constructor(private readonly periods: AcademicPeriodsService) {}

  @Get('courses/:courseId/periods')
  async list(
    @CurrentUser() user: AuthUser,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
  ) {
    return { data: await this.periods.list(user.id, courseId) };
  }

  @Post('courses/:courseId/periods')
  async create(
    @CurrentUser() user: AuthUser,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Body() input: CreateAcademicPeriodDto,
  ) {
    return { data: await this.periods.create(user.id, courseId, input) };
  }

  @Patch('periods/:id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateAcademicPeriodDto,
  ) {
    return { data: await this.periods.update(user.id, id, input) };
  }

  @Delete('periods/:id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.periods.remove(user.id, id);
  }
}
