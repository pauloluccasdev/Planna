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
});
