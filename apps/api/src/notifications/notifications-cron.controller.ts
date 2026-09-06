import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { getRequiredEnvironment } from '../config/environment.js';
import { NotificationsService } from './notifications.service.js';

@Controller('internal/notifications')
export class NotificationsCronController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('dispatch')
  async dispatch(@Headers('authorization') authorization?: string) {
    const secret = getRequiredEnvironment('CRON_SECRET');

    if (authorization !== `Bearer ${secret}`) {
      throw new UnauthorizedException();
    }

    const scheduled = await this.notifications.synchronizeReminders();
    const delivered = await this.notifications.dispatchDue();

    return { data: { scheduled, delivered } };
  }
}
