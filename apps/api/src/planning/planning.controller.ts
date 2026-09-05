import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/auth-user.decorator.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { CreatePlanningProposalDto } from './dto/create-planning-proposal.dto.js';
import { UpdateProposedBlockDto } from './dto/update-proposed-block.dto.js';
import { PlanningService } from './planning.service.js';

@Controller('planning-proposals')
@UseGuards(SupabaseAuthGuard)
export class PlanningController {
  constructor(private readonly planning: PlanningService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() input: CreatePlanningProposalDto,
  ) {
    return { data: await this.planning.create(user.id, input) };
  }

  @Get(':id')
  async get(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { data: await this.planning.get(user.id, id) };
  }

  @Patch(':id/blocks/:blockId')
  async updateBlock(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('blockId', new ParseUUIDPipe()) blockId: string,
    @Body() input: UpdateProposedBlockDto,
  ) {
    return {
      data: await this.planning.updateBlock(user.id, id, blockId, input),
    };
  }

  @Delete(':id/blocks/:blockId')
  async removeBlock(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('blockId', new ParseUUIDPipe()) blockId: string,
  ) {
    return { data: await this.planning.removeBlock(user.id, id, blockId) };
  }

  @Post(':id/confirm')
  async confirm(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { data: await this.planning.confirm(user.id, id) };
  }

  @Post(':id/discard')
  async discard(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { data: await this.planning.discard(user.id, id) };
  }
}
