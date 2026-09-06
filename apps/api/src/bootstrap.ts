import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import type { RequestHandler } from 'express';
import helmet from 'helmet';
import { getWebOrigins } from './config/environment.js';

export function configureApplication(app: INestApplication): void {
  const createHelmet = helmet as unknown as () => RequestHandler;
  app.use(createHelmet());
  app.enableCors({
    origin: getWebOrigins(),
    credentials: true,
    exposedHeaders: ['x-request-id'],
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
}
