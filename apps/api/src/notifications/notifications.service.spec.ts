import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { NotificationStatus } from '../generated/prisma/enums.js';
import { NotificationsService } from './notifications.service.js';

describe('NotificationsService', () => {
  const prisma = {
    pushSubscription: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    notification: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  let service: NotificationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationsService(prisma as unknown as PrismaService);
  });

  it('stores a new subscription without returning endpoint or key secrets', async () => {
    prisma.pushSubscription.findUnique.mockResolvedValue(null);
    prisma.pushSubscription.create.mockResolvedValue({
      id: 'subscription-id',
      expiresAt: null,
      revokedAt: null,
    });

    const result = await service.subscribe('student-id', {
      endpoint: 'https://push.example.test/subscription',
      expirationTime: null,
      keys: { p256dh: 'public-key', auth: 'auth-secret' },
    });

    expect(prisma.pushSubscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentId: 'student-id',
          endpoint: 'https://push.example.test/subscription',
          publicKey: 'public-key',
          authSecret: 'auth-secret',
        }),
        select: expect.not.objectContaining({ endpoint: true }),
      }),
    );
    expect(result).not.toHaveProperty('endpoint');
  });

  it('reactivates the same student subscription', async () => {
    prisma.pushSubscription.findUnique.mockResolvedValue({
      id: 'subscription-id',
      studentId: 'student-id',
    });
    prisma.pushSubscription.update.mockResolvedValue({
      id: 'subscription-id',
      revokedAt: null,
    });

    await service.subscribe('student-id', {
      endpoint: 'https://push.example.test/subscription',
      keys: { p256dh: 'new-key', auth: 'new-secret' },
    });

    expect(prisma.pushSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'subscription-id' },
        data: expect.objectContaining({ revokedAt: null }),
      }),
    );
  });

  it('does not transfer a browser subscription between students', async () => {
    prisma.pushSubscription.findUnique.mockResolvedValue({
      id: 'subscription-id',
      studentId: 'another-student',
    });

    await expect(
      service.subscribe('student-id', {
        endpoint: 'https://push.example.test/subscription',
        keys: { p256dh: 'public-key', auth: 'auth-secret' },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.pushSubscription.update).not.toHaveBeenCalled();
  });

  it('revokes only a subscription owned by the authenticated student', async () => {
    prisma.pushSubscription.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.unsubscribe('student-id', 'foreign-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.pushSubscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'foreign-id',
          studentId: 'student-id',
        }),
      }),
    );
  });

  it('paginates notifications without exposing another student cursor', async () => {
    prisma.notification.findFirst.mockResolvedValue(null);

    await expect(
      service.list('student-id', { cursor: 'foreign-cursor' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.notification.findMany).not.toHaveBeenCalled();
  });

  it('returns a bounded page and an opaque next cursor', async () => {
    prisma.notification.findMany.mockResolvedValue(
      Array.from({ length: 21 }, (_, index) => ({ id: `item-${index}` })),
    );

    const result = await service.list('student-id', {});

    expect(result.items).toHaveLength(20);
    expect(result.nextCursor).toBe('item-19');
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 21 }),
    );
  });

  it('marks a notification as read idempotently', async () => {
    prisma.notification.updateMany.mockResolvedValueOnce({ count: 0 });
    prisma.notification.findFirst.mockResolvedValue({
      id: 'notification-id',
      status: NotificationStatus.READ,
    });

    const result = await service.read('student-id', 'notification-id');

    expect(result).toEqual({
      id: 'notification-id',
      status: NotificationStatus.READ,
    });
  });
});
