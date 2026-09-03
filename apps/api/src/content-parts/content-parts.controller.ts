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
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/auth-user.decorator.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { ContentPartsService } from './content-parts.service.js';
import { CreateContentPartDto } from './dto/create-content-part.dto.js';
import { ReorderContentPartsDto } from './dto/reorder-content-parts.dto.js';
import { UpdateContentPartDto } from './dto/update-content-part.dto.js';

@Controller()
@UseGuards(SupabaseAuthGuard)
export class ContentPartsController {
  constructor(private readonly parts: ContentPartsService) {}

  @Get('contents/:contentId/parts')
  async list(
    @CurrentUser() user: AuthUser,
    @Param('contentId', new ParseUUIDPipe()) contentId: string,
  ) {
    return { data: await this.parts.list(user.id, contentId) };
  }

  @Post('contents/:contentId/parts')
  async create(
    @CurrentUser() user: AuthUser,
    @Param('contentId', new ParseUUIDPipe()) contentId: string,
    @Body() input: CreateContentPartDto,
  ) {
    return { data: await this.parts.create(user.id, contentId, input) };
  }

  @Put('contents/:contentId/parts-order')
  async reorder(
    @CurrentUser() user: AuthUser,
    @Param('contentId', new ParseUUIDPipe()) contentId: string,
    @Body() input: ReorderContentPartsDto,
  ) {
    return { data: await this.parts.reorder(user.id, contentId, input) };
  }

  @Patch('content-parts/:id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateContentPartDto,
  ) {
    return { data: await this.parts.update(user.id, id, input) };
  }

  @Delete('content-parts/:id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.parts.remove(user.id, id);
  }
}
