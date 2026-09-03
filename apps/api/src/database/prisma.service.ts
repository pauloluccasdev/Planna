import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import {
  getDatabasePoolMax,
  getDatabaseTransactionTimeout,
  getRequiredEnvironment,
} from '../config/environment.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: getRequiredEnvironment('DATABASE_URL'),
      max: getDatabasePoolMax(),
    });
    super({
      adapter,
      transactionOptions: {
        maxWait: getDatabaseTransactionTimeout(),
        timeout: getDatabaseTransactionTimeout(),
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
