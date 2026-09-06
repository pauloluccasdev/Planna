import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { NotificationStatus } from '../generated/prisma/enums.js';
import { NotificationsService } from './notifications.service.js';
import type { WebPushTransport } from './web-push.transport.js';

describe('NotificationsService', () => {
  const prisma = {
    studyBlock: { findMany: vi.fn() },
    academicEvent: { findMany: vi.fn() },
    pushSubscription: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    notification: {
      createMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  const push = { send: vi.fn() };
  let service: NotificationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationsService(
      prisma as unknown as PrismaService,
      push as unknown as WebPushTransport,
    );
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

  it('schedules block and academic event reminders idempotently', async () => {
    const now = new Date('2026-09-06T12:00:00.000Z');
    prisma.studyBlock.findMany.mockResolvedValue([
      {
        id: 'block-id',
        studentId: 'student-id',
        startsAt: new Date('2026-09-06T15:00:00.000Z'),
      },
    ]);
    prisma.academicEvent.findMany.mockResolvedValue([
      {
        id: 'event-id',
        studentId: 'student-id',
        startsAt: new Date('2026-09-20T15:00:00.000Z'),
      },
    ]);
    prisma.notification.createMany.mockResolvedValue({ count: 3 });
    prisma.notification.findMany.mockResolvedValue([]);

    const result = await service.synchronizeReminders(now);

    expect(result).toEqual({
      studyBlockReminders: 1,
      academicEventReminders: 2,
      cancelled: 0,
    });
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          kind: 'STUDY_BLOCK_REMINDER',
          relatedId: 'block-id',
          scheduledFor: new Date('2026-09-06T14:45:00.000Z'),
        }),
        expect.objectContaining({
          kind: 'ACADEMIC_EVENT_REMINDER',
          relatedId: 'event-id',
          scheduledFor: new Date('2026-09-13T15:00:00.000Z'),
        }),
        expect.objectContaining({
          kind: 'ACADEMIC_EVENT_REMINDER',
          relatedId: 'event-id',
          scheduledFor: new Date('2026-09-19T15:00:00.000Z'),
        }),
      ],
      skipDuplicates: true,
    });
  });

  it('cancels a pending reminder after its related schedule changes', async () => {
    prisma.studyBlock.findMany.mockResolvedValue([]);
    prisma.academicEvent.findMany.mockResolvedValue([]);
    prisma.notification.findMany.mockResolvedValue([
      {
        id: 'obsolete-id',
        kind: 'STUDY_BLOCK_REMINDER',
        relatedId: 'block-id',
        scheduledFor: new Date('2026-09-06T14:45:00.000Z'),
      },
    ]);
    prisma.notification.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.synchronizeReminders(new Date());

    expect(result.cancelled).toBe(1);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['obsolete-id'] },
        status: NotificationStatus.SCHEDULED,
      },
      data: {
        status: NotificationStatus.CANCELLED,
        failureCode: 'RELATED_SCHEDULE_CHANGED',
      },
    });
  });

  it('does not create reminders whose standard lead time already passed', async () => {
    const now = new Date('2026-09-06T12:00:00.000Z');
    prisma.studyBlock.findMany.mockResolvedValue([
      {
        id: 'soon-block-id',
        studentId: 'student-id',
        startsAt: new Date('2026-09-06T12:10:00.000Z'),
      },
    ]);
    prisma.academicEvent.findMany.mockResolvedValue([]);
    prisma.notification.findMany.mockResolvedValue([]);

    await service.synchronizeReminders(now);

    expect(prisma.notification.createMany).not.toHaveBeenCalled();
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

  it('claims and sends each due notification once', async () => {
    const now = new Date('2026-09-06T18:00:00.000Z');
    prisma.notification.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    prisma.notification.findMany.mockResolvedValue([
      {
        id: 'notification-id',
        studentId: 'student-id',
        kind: 'STUDY_BLOCK_REMINDER',
        relatedType: 'study_block',
        relatedId: 'block-id',
        attemptCount: 0,
      },
    ]);
    prisma.pushSubscription.findMany.mockResolvedValue([
      {
        id: 'subscription-id',
        endpoint: 'https://push.example.test/subscription',
        publicKey: 'public-key',
        authSecret: 'auth-secret',
      },
    ]);
    push.send.mockResolvedValue({ delivered: true });
    prisma.pushSubscription.update.mockResolvedValue({});
    prisma.notification.update.mockResolvedValue({});

    const result = await service.dispatchDue(now);

    expect(result).toEqual({
      selected: 1,
      sent: 1,
      retried: 0,
      failed: 0,
      cancelled: 0,
    });
    expect(push.send).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'subscription-id' }),
      {
        title: 'Planna',
        body: 'Você tem um bloco de estudo se aproximando.',
        url: '/app/blocks/block-id',
      },
    );
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'notification-id' },
      data: expect.objectContaining({
        status: NotificationStatus.SENT,
        sentAt: now,
      }),
    });
  });

  it('revokes an invalid subscription and retries a transiently failed notification', async () => {
    const now = new Date('2026-09-06T18:00:00.000Z');
    prisma.notification.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    prisma.notification.findMany.mockResolvedValue([
      {
        id: 'notification-id',
        studentId: 'student-id',
        kind: 'RISK_ALERT',
        relatedType: null,
        relatedId: null,
        attemptCount: 0,
      },
    ]);
    prisma.pushSubscription.findMany.mockResolvedValue([
      {
        id: 'expired-subscription-id',
        endpoint: 'https://push.example.test/expired',
        publicKey: 'public-key',
        authSecret: 'auth-secret',
      },
      {
        id: 'transient-subscription-id',
        endpoint: 'https://push.example.test/unavailable',
        publicKey: 'public-key',
        authSecret: 'auth-secret',
      },
    ]);
    push.send
      .mockResolvedValueOnce({
        delivered: false,
        permanent: true,
        code: 'WEB_PUSH_410',
      })
      .mockResolvedValueOnce({
        delivered: false,
        permanent: false,
        code: 'WEB_PUSH_503',
      });
    prisma.pushSubscription.update.mockResolvedValue({});
    prisma.notification.update.mockResolvedValue({});

    const result = await service.dispatchDue(now);

    expect(result.retried).toBe(1);
    expect(prisma.pushSubscription.update).toHaveBeenCalledWith({
      where: { id: 'expired-subscription-id' },
      data: { revokedAt: now },
    });
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'notification-id' },
      data: expect.objectContaining({
        status: NotificationStatus.SCHEDULED,
        failureCode: 'WEB_PUSH_503',
        nextAttemptAt: new Date('2026-09-06T18:05:00.000Z'),
      }),
    });
  });

  it('cancels due notifications when the student has no active device', async () => {
    prisma.notification.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    prisma.notification.findMany.mockResolvedValue([
      {
        id: 'notification-id',
        studentId: 'student-id',
        kind: 'OVERDUE_BLOCK',
        relatedType: null,
        relatedId: null,
        attemptCount: 0,
      },
    ]);
    prisma.pushSubscription.findMany.mockResolvedValue([]);
    prisma.notification.update.mockResolvedValue({});

    const result = await service.dispatchDue(new Date());

    expect(result.cancelled).toBe(1);
    expect(push.send).not.toHaveBeenCalled();
  });
});
