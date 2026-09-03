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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/auth-user.decorator.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { AcademicEventsService } from './academic-events.service.js';
import { CreateAcademicEventDto } from './dto/create-academic-event.dto.js';
import { ListAcademicEventsQueryDto } from './dto/list-academic-events-query.dto.js';
import { SetAcademicEventContentsDto } from './dto/set-academic-event-contents.dto.js';
import { UpdateAcademicEventDto } from './dto/update-academic-event.dto.js';

@Controller('academic-events')
@UseGuards(SupabaseAuthGuard)
export class AcademicEventsController {
  constructor(private readonly events: AcademicEventsService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListAcademicEventsQueryDto,
  ) {
    return { data: await this.events.list(user.id, query) };
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() input: CreateAcademicEventDto,
  ) {
    const result = await this.events.create(user.id, input);
    return { data: result.event, warnings: result.warnings };
  }

  @Get(':id')
  async get(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { data: await this.events.get(user.id, id) };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateAcademicEventDto,
  ) {
    const result = await this.events.update(user.id, id, input);
    return { data: result.event, warnings: result.warnings };
  }

  @Put(':id/contents')
  async setContents(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: SetAcademicEventContentsDto,
  ) {
    return { data: await this.events.setContents(user.id, id, input) };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.events.remove(user.id, id);
  }
}
