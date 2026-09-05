import {
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
import { AdminGuard } from './admin.guard.js';
import { AdminService } from './admin.service.js';
import { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto.js';

@Controller('admin/users')
@UseGuards(SupabaseAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  async list(@Query() query: ListAdminUsersQueryDto) {
    const result = await this.admin.listUsers(query);
    return { data: result.data, meta: { nextCursor: result.nextCursor } };
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.admin.getUser(id) };
  }

  @Post(':id/block')
  async block(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return { data: await this.admin.blockUser(actor.id, id) };
  }

  @Post(':id/unblock')
  async unblock(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return { data: await this.admin.unblockUser(actor.id, id) };
  }

  @Post(':id/password-recovery')
  async recover(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return { data: await this.admin.requestPasswordRecovery(actor.id, id) };
  }
}
