import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { NotificationsService } from './notifications.service.js';

const application = await NestFactory.createApplicationContext(AppModule, {
  logger: ['error', 'warn', 'log'],
});

try {
  const result = await application.get(NotificationsService).dispatchDue();
  console.log(JSON.stringify({ event: 'notifications.dispatch', ...result }));
} finally {
  await application.close();
}
