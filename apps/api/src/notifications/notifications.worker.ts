import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { NotificationsService } from './notifications.service.js';

const application = await NestFactory.createApplicationContext(AppModule, {
  logger: ['error', 'warn', 'log'],
});

try {
  const notifications = application.get(NotificationsService);
  const scheduled = await notifications.synchronizeReminders();
  const delivered = await notifications.dispatchDue();
  console.log(
    JSON.stringify({ event: 'notifications.worker', scheduled, delivered }),
  );
} finally {
  await application.close();
}
