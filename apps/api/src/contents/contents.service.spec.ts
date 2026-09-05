import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { ContentsService } from './contents.service.js';

describe('ContentsService', () => {
  const prisma = {
    subject: { findFirst: vi.fn() },
    content: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    studySession: { count: vi.fn() },
    studySessionCompletedPart: { findMany: vi.fn() },
    studyBlock: { count: vi.fn() },
    $transaction: vi.fn(),
  };
  let service: ContentsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ContentsService(prisma as unknown as PrismaService);
  });

  it('lists only contents owned by the authenticated student', async () => {
    prisma.content.findMany.mockResolvedValue([]);
    await service.listAll('student-id', {});
    expect(prisma.content.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studentId: 'student-id',
          archivedAt: null,
        }),
      }),
    );
  });

  it('does not create content under a foreign subject', async () => {
    prisma.subject.findFirst.mockResolvedValue(null);
    await expect(
      service.create('student-id', 'foreign-subject', {
        name: 'Cardiovascular',
        priority: 5,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.content.create).not.toHaveBeenCalled();
  });

  it('persists the required priority and optional estimate', async () => {
    prisma.subject.findFirst.mockResolvedValue({ id: 'subject-id' });
    prisma.content.create.mockResolvedValue({ id: 'content-id' });
    await service.create('student-id', 'subject-id', {
      name: '  Sistema cardiovascular ',
      priority: 5,
      estimatedDurationSeconds: 10800,
    });
    expect(prisma.content.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentId: 'student-id',
          name: 'Sistema cardiovascular',
          priority: 5,
          estimatedDurationSeconds: 10800,
        }),
      }),
    );
  });

  it('updates content data without mutating confirmed study blocks', async () => {
    prisma.content.findFirst.mockResolvedValue({ id: 'content-id' });
    prisma.content.update.mockResolvedValue({ id: 'content-id' });
    await service.update('student-id', 'content-id', {
      priority: 4,
      estimatedDurationSeconds: 5400,
    });
    expect(prisma.content.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'content-id' },
        data: expect.objectContaining({
          priority: 4,
          estimatedDurationSeconds: 5400,
        }),
      }),
    );
  });

  it('derives completion from all active parts confirmed by sessions', async () => {
    prisma.content.findFirst.mockResolvedValue({
      id: 'content-id',
      manuallyCompletedAt: null,
      parts: [{ id: 'part-1' }, { id: 'part-2' }],
    });
    prisma.studySessionCompletedPart.findMany.mockResolvedValue([
      { contentPartId: 'part-1' },
      { contentPartId: 'part-2' },
    ]);
    prisma.studySession.count.mockResolvedValue(2);
    prisma.studyBlock.count.mockResolvedValue(0);
    await expect(service.progress('student-id', 'content-id')).resolves.toEqual(
      expect.objectContaining({
        status: 'COMPLETED',
        completedParts: 2,
        percentage: 100,
        needsFuturePlanning: false,
      }),
    );
  });

  it('signals content with remaining work and no future block', async () => {
    prisma.content.findFirst.mockResolvedValue({
      id: 'content-id',
      manuallyCompletedAt: null,
      parts: [{ id: 'part-1' }, { id: 'part-2' }],
    });
    prisma.studySessionCompletedPart.findMany.mockResolvedValue([
      { contentPartId: 'part-1' },
    ]);
    prisma.studySession.count.mockResolvedValue(1);
    prisma.studyBlock.count.mockResolvedValue(0);
    await expect(service.progress('student-id', 'content-id')).resolves.toEqual(
      expect.objectContaining({
        status: 'IN_PROGRESS',
        completedParts: 1,
        percentage: 50,
        needsFuturePlanning: true,
      }),
    );
  });

  it('keeps content without parts in progress until manual confirmation', async () => {
    prisma.content.findFirst.mockResolvedValue({
      id: 'content-id',
      manuallyCompletedAt: null,
      parts: [],
    });
    prisma.studySession.count.mockResolvedValue(1);
    prisma.studyBlock.count.mockResolvedValue(0);
    await expect(service.progress('student-id', 'content-id')).resolves.toEqual(
      expect.objectContaining({
        status: 'IN_PROGRESS',
        percentage: null,
        needsFuturePlanning: true,
      }),
    );
  });

  it('derives completion without parts from manual confirmation', async () => {
    prisma.content.findFirst.mockResolvedValue({
      id: 'content-id',
      manuallyCompletedAt: new Date(),
      parts: [],
    });
    prisma.studySession.count.mockResolvedValue(1);
    prisma.studyBlock.count.mockResolvedValue(0);
    await expect(service.progress('student-id', 'content-id')).resolves.toEqual(
      expect.objectContaining({
        status: 'COMPLETED',
        percentage: 100,
        needsFuturePlanning: false,
      }),
    );
  });

  it('records manual completion and its audit event atomically', async () => {
    prisma.content.findFirst.mockResolvedValue({
      id: 'content-id',
      archivedAt: null,
      manuallyCompletedAt: null,
      _count: { parts: 0 },
    });
    const transaction = {
      content: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({ id: 'content-id' }),
      },
      auditEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation((callback) => callback(transaction));

    await service.completeManually('student-id', 'content-id');

    expect(transaction.content.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'content-id',
          studentId: 'student-id',
          manuallyCompletedAt: null,
        },
        data: { manuallyCompletedAt: expect.any(Date) },
      }),
    );
    expect(transaction.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'CONTENT_MANUALLY_COMPLETED',
          entityId: 'content-id',
        }),
      }),
    );
  });

  it('rejects manual completion when the content has parts', async () => {
    prisma.content.findFirst.mockResolvedValue({
      id: 'content-id',
      archivedAt: null,
      manuallyCompletedAt: null,
      _count: { parts: 1 },
    });
    await expect(
      service.completeManually('student-id', 'content-id'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not duplicate the audit when a concurrent completion won', async () => {
    prisma.content.findFirst.mockResolvedValue({
      id: 'content-id',
      archivedAt: null,
      manuallyCompletedAt: null,
      _count: { parts: 0 },
    });
    const transaction = {
      content: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUnique: vi.fn().mockResolvedValue({
          id: 'content-id',
          manuallyCompletedAt: new Date(),
        }),
      },
      auditEvent: { create: vi.fn() },
    };
    prisma.$transaction.mockImplementation((callback) => callback(transaction));

    await service.completeManually('student-id', 'content-id');

    expect(transaction.auditEvent.create).not.toHaveBeenCalled();
  });

  it('blocks hard deletion when execution history exists', async () => {
    prisma.content.findFirst.mockResolvedValue({ id: 'content-id' });
    prisma.content.count.mockResolvedValue(1);
    await expect(
      service.remove('student-id', 'content-id'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.content.delete).not.toHaveBeenCalled();
  });
});
