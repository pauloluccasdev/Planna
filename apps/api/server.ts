import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Request, type Response } from 'express';
import { AppModule } from './src/app.module.js';
import { configureApplication } from './src/bootstrap.js';

const serverPromise = createServer();

async function createServer() {
  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['error', 'warn', 'log'],
  });

  configureApplication(app);
  await app.init();

  return server;
}

export default async function handler(request: Request, response: Response) {
  const server = await serverPromise;
  return server(request, response);
}
