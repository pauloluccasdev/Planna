import { Injectable } from '@nestjs/common';
import { PrismaService } from './database/prisma.service.js';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getLiveness() {
    return {
      data: { service: 'planna-api', status: 'ok' },
    } as const;
  }

  async getReadiness() {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      data: { service: 'planna-api', status: 'ready', database: 'available' },
    } as const;
  }
}
