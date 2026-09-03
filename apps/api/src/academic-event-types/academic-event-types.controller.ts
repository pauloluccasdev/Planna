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
import { AcademicEventTypesService } from './academic-event-types.service.js';
import { CreateAcademicEventTypeDto } from './dto/create-academic-event-type.dto.js';
import { UpdateAcademicEventTypeDto } from './dto/update-academic-event-type.dto.js';

@Controller('academic-event-types')
@UseGuards(SupabaseAuthGuard)
export class AcademicEventTypesController {
  constructor(private readonly eventTypes: AcademicEventTypesService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    return { data: await this.eventTypes.list(user.id) };
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() input: CreateAcademicEventTypeDto,
  ) {
    return { data: await this.eventTypes.create(user.id, input) };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateAcademicEventTypeDto,
  ) {
    return { data: await this.eventTypes.update(user.id, id, input) };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.eventTypes.remove(user.id, id);
  }
}
