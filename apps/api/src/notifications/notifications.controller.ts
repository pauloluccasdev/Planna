import {
  Body,
  Controller,
  Delete,
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
import { CreatePushSubscriptionDto } from './dto/create-push-subscription.dto.js';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto.js';
import { NotificationsService } from './notifications.service.js';

@Controller()
@UseGuards(SupabaseAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('push-subscriptions')
  async subscribe(
    @CurrentUser() user: AuthUser,
    @Body() input: CreatePushSubscriptionDto,
  ) {
    return { data: await this.notifications.subscribe(user.id, input) };
  }

  @Delete('push-subscriptions/:id')
  async unsubscribe(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { data: await this.notifications.unsubscribe(user.id, id) };
  }

  @Get('notifications')
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return { data: await this.notifications.list(user.id, query) };
  }

  @Post('notifications/:id/read')
  async read(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { data: await this.notifications.read(user.id, id) };
  }
}
