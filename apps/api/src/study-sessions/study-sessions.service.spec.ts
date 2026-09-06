import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { StudySessionsService } from './study-sessions.service.js';

describe('StudySessionsService', () => {
  const transaction = {
    $executeRaw: vi.fn(),
    studySession: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    studySessionSegment: {
      updateMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    studySessionCompletedPart: { deleteMany: vi.fn(), createMany: vi.fn() },
    studyBlock: { findFirst: vi.fn(), update: vi.fn() },
    content: { findFirst: vi.fn() },
    contentPart: { count: vi.fn() },
    auditEvent: { create: vi.fn() },
  };
  const prisma = {
    studySession: { findFirst: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(async (callback) => callback(transaction)),
  };
  let service: StudySessionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StudySessionsService(prisma as unknown as PrismaService);
  });

  it('prioritizes a running session over paused sessions', async () => {
    prisma.studySession.findFirst.mockResolvedValue({
      id: 'running-session',
      status: 'RUNNING',
    });

    await expect(service.active('student-id')).resolves.toEqual({
      id: 'running-session',
      status: 'RUNNING',
    });
    expect(prisma.studySession.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.studySession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: 'student-id', status: 'RUNNING' },
      }),
    );
  });

  it('returns the most recently updated paused session when none is running', async () => {
    prisma.studySession.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'paused-session', status: 'PAUSED' });

    await expect(service.active('student-id')).resolves.toEqual({
      id: 'paused-session',
      status: 'PAUSED',
    });
    expect(prisma.studySession.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { studentId: 'student-id', status: 'PAUSED' },
        orderBy: { updatedAt: 'desc' },
      }),
    );
  });

  it('lists every paused session owned by the student', async () => {
    prisma.studySession.findMany.mockResolvedValue([]);

    await service.listPaused('student-id');

    expect(prisma.studySession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: 'student-id', status: 'PAUSED' },
        orderBy: { updatedAt: 'desc' },
      }),
    );
  });

  it('does not expose another student session', async () => {
    prisma.studySession.findFirst.mockResolvedValue(null);
    await expect(
      service.get('student-id', 'session-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.studySession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'session-id', studentId: 'student-id' },
      }),
    );
  });

  it('rejects a second running timer for the same student', async () => {
    transaction.studySession.findFirst.mockResolvedValue({
      id: 'active-session',
    });
    await expect(
      service.startPlanned('student-id', 'block-id'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.studyBlock.findFirst).not.toHaveBeenCalled();
  });

  it('rejects an unplanned session for a foreign content', async () => {
    transaction.studySession.findFirst.mockResolvedValue(null);
    transaction.content.findFirst.mockResolvedValue(null);
    await expect(
      service.startUnplanned('student-id', { contentId: 'foreign-content' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('only pauses a running session owned by the student', async () => {
    transaction.studySession.findFirst.mockResolvedValue(null);
    await expect(
      service.pause('student-id', 'session-id'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.studySessionSegment.updateMany).not.toHaveBeenCalled();
  });

  it('pauses the current session and starts the selected block atomically', async () => {
    transaction.studySession.findFirst.mockResolvedValueOnce({
      id: 'current-session',
      studyBlockId: 'current-block',
    });
    transaction.studyBlock.findFirst.mockResolvedValue({
      id: 'next-block',
      contentId: 'next-content',
      status: 'CONFIRMED',
    });
    transaction.studySession.create.mockResolvedValue({ id: 'next-session' });
    transaction.studySession.findUniqueOrThrow.mockResolvedValue({
      id: 'next-session',
      status: 'RUNNING',
    });

    await expect(
      service.switchToBlock('student-id', 'current-session', 'next-block'),
    ).resolves.toEqual({ id: 'next-session', status: 'RUNNING' });
    expect(transaction.studySessionSegment.updateMany).toHaveBeenCalledWith({
      where: { studySessionId: 'current-session', endedAt: null },
      data: { endedAt: expect.any(Date) },
    });
    expect(transaction.studySession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'current-session' },
        data: expect.objectContaining({ status: 'PAUSED' }),
      }),
    );
    expect(transaction.studySession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contentId: 'next-content',
          studyBlockId: 'next-block',
          status: 'RUNNING',
        }),
      }),
    );
    expect(transaction.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: 'student-id',
        studentScopeId: 'student-id',
        action: 'STUDY_SESSION_STARTED_BY_SWITCH',
        entityType: 'STUDY_SESSION',
        entityId: 'next-session',
      }),
    });
  });

  it('does not pause the current session when the target block is invalid', async () => {
    transaction.studySession.findFirst.mockResolvedValue({
      id: 'current-session',
      studyBlockId: 'current-block',
    });
    transaction.studyBlock.findFirst.mockResolvedValue(null);

    await expect(
      service.switchToBlock('student-id', 'current-session', 'foreign-block'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.studySessionSegment.updateMany).not.toHaveBeenCalled();
    expect(transaction.studySession.update).not.toHaveBeenCalled();
  });

  it('pauses the current session and starts another content atomically', async () => {
    transaction.studySession.findFirst.mockResolvedValue({
      id: 'current-session',
      contentId: 'current-content',
      studyBlockId: 'current-block',
    });
    transaction.content.findFirst.mockResolvedValue({ id: 'other-content' });
    transaction.studySession.create.mockResolvedValue({
      id: 'unplanned-session',
      contentId: 'other-content',
      kind: 'UNPLANNED',
      status: 'RUNNING',
    });

    await expect(
      service.switchToContent('student-id', 'current-session', {
        contentId: 'other-content',
        note: 'Mudança necessária',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'unplanned-session',
        contentId: 'other-content',
      }),
    );
    expect(transaction.studySession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'current-session' },
        data: expect.objectContaining({ status: 'PAUSED' }),
      }),
    );
    expect(transaction.studyBlock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'current-block' },
        data: expect.objectContaining({ status: 'PAUSED' }),
      }),
    );
    expect(transaction.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'STUDY_SESSION_STARTED_BY_SWITCH',
        entityId: 'unplanned-session',
        metadata: { previousSessionId: 'current-session' },
      }),
    });
    expect(
      transaction.auditEvent.create.mock.calls.some(([entry]) =>
        Object.hasOwn(entry.data.metadata ?? {}, 'note'),
      ),
    ).toBe(false);
    expect(transaction.studySession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contentId: 'other-content',
          kind: 'UNPLANNED',
          status: 'RUNNING',
          note: 'Mudança necessária',
        }),
      }),
    );
  });

  it('keeps the current session running when the other content is invalid', async () => {
    transaction.studySession.findFirst.mockResolvedValue({
      id: 'current-session',
      contentId: 'current-content',
      studyBlockId: 'current-block',
    });
    transaction.content.findFirst.mockResolvedValue(null);

    await expect(
      service.switchToContent('student-id', 'current-session', {
        contentId: 'foreign-content',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(transaction.studySessionSegment.updateMany).not.toHaveBeenCalled();
    expect(transaction.studySession.update).not.toHaveBeenCalled();
    expect(transaction.studyBlock.update).not.toHaveBeenCalled();
  });

  it('resumes the existing session when the selected block is paused', async () => {
    transaction.studySession.findFirst
      .mockResolvedValueOnce({
        id: 'current-session',
        studyBlockId: 'current-block',
      })
      .mockResolvedValueOnce({
        id: 'paused-target-session',
        _count: { segments: 3 },
      });
    transaction.studyBlock.findFirst.mockResolvedValue({
      id: 'paused-block',
      contentId: 'next-content',
      status: 'PAUSED',
    });
    transaction.studySession.findUniqueOrThrow.mockResolvedValue({
      id: 'paused-target-session',
      status: 'RUNNING',
    });

    await service.switchToBlock(
      'student-id',
      'current-session',
      'paused-block',
    );

    expect(transaction.studySession.create).not.toHaveBeenCalled();
    expect(transaction.studySessionSegment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studySessionId: 'paused-target-session',
        kind: 'FOCUS',
        sequence: 4,
      }),
    });
    expect(transaction.studySession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'paused-target-session' },
        data: expect.objectContaining({ status: 'RUNNING' }),
      }),
    );
  });

  it('rejects a retroactive session in the future', async () => {
    expect(() =>
      service.createRetroactive('student-id', {
        contentId: 'content-id',
        startedAt: '2099-01-01T19:00:00-03:00',
        endedAt: '2099-01-01T20:00:00-03:00',
      }),
    ).toThrow(UnprocessableEntityException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a retroactive break longer than the session', async () => {
    expect(() =>
      service.createRetroactive('student-id', {
        contentId: 'content-id',
        startedAt: '2020-01-01T19:00:00-03:00',
        endedAt: '2020-01-01T20:00:00-03:00',
        pomodoroBreakDurationSeconds: 3601,
      }),
    ).toThrow(UnprocessableEntityException);
  });

  it('links a retroactive session to a valid block and completes it atomically', async () => {
    transaction.content.findFirst.mockResolvedValue({ id: 'content-id' });
    transaction.studyBlock.findFirst.mockResolvedValue({ id: 'block-id' });
    transaction.studySession.create.mockResolvedValue({
      id: 'retroactive-session',
      studyBlockId: 'block-id',
      status: 'COMPLETED',
    });

    await expect(
      service.createRetroactive('student-id', {
        contentId: 'content-id',
        studyBlockId: 'block-id',
        startedAt: '2020-01-01T19:00:00-03:00',
        endedAt: '2020-01-01T20:00:00-03:00',
        pomodoroBreakDurationSeconds: 600,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'retroactive-session',
        studyBlockId: 'block-id',
      }),
    );
    expect(transaction.studySession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studyBlockId: 'block-id',
          focusDurationSeconds: 3000,
          pomodoroBreakDurationSeconds: 600,
          realizedDurationSeconds: 3600,
        }),
      }),
    );
    expect(transaction.studyBlock.update).toHaveBeenCalledWith({
      where: { id: 'block-id' },
      data: {
        status: 'COMPLETED',
        completedAt: expect.any(Date),
        revision: { increment: 1 },
      },
    });
    expect(transaction.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'STUDY_SESSION_REGISTERED_RETROACTIVELY',
        entityId: 'retroactive-session',
        metadata: {
          linkedToBlock: true,
          realizedDurationSeconds: 3600,
          completedPartCount: 0,
        },
      }),
    });
  });

  it('rejects linking a retroactive session to an invalid block', async () => {
    transaction.content.findFirst.mockResolvedValue({ id: 'content-id' });
    transaction.studyBlock.findFirst.mockResolvedValue(null);

    await expect(
      service.createRetroactive('student-id', {
        contentId: 'content-id',
        studyBlockId: 'foreign-or-final-block',
        startedAt: '2020-01-01T19:00:00-03:00',
        endedAt: '2020-01-01T20:00:00-03:00',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.studyBlock.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'foreign-or-final-block',
          studentId: 'student-id',
          contentId: 'content-id',
          status: { in: ['CONFIRMED', 'OVERDUE'] },
          sessions: { none: {} },
        }),
      }),
    );
    expect(transaction.studySession.create).not.toHaveBeenCalled();
    expect(transaction.studyBlock.update).not.toHaveBeenCalled();
  });
});
