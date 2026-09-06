import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './database/prisma.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('returns the API health status', () => {
      expect(appController.getHealth()).toEqual({
        data: { service: 'planna-api', status: 'ok' },
      });
    });
  });

  describe('readiness', () => {
    it('checks database connectivity without exposing details', async () => {
      await expect(appController.getReadiness()).resolves.toEqual({
        data: {
          service: 'planna-api',
          status: 'ready',
          database: 'available',
        },
      });
    });
  });
});
