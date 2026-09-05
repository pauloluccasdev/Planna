import { UnprocessableEntityException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AvailabilityService } from '../availability/availability.service.js';
import type { PrismaService } from '../database/prisma.service.js';
import {
  BlockStatus,
  SuggestionGenerationKind,
  SuggestionStatus,
} from '../generated/prisma/enums.js';
import type { OverdueService } from '../overdue/overdue.service.js';
import { ReplanningService } from './replanning.service.js';

describe('ReplanningService', () => {
  const prisma = {
    availabilityInterval: { findMany: vi.fn() },
    academicEvent: { findMany: vi.fn(), findFirst: vi.fn() },
    studyBlock: { findMany: vi.fn(), findFirst: vi.fn() },
    replanningSuggestion: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  const availability = { coversInterval: vi.fn() };
  const overdue = { reconcileStudent: vi.fn() };
  let service: ReplanningService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-07T15:00:00.000Z'));
    vi.clearAllMocks();
    overdue.reconcileStudent.mockResolvedValue({ markedOverdue: 0 });
    availability.coversInterval.mockResolvedValue(true);
    prisma.studyBlock.findMany.mockResolvedValue([]);
    prisma.academicEvent.findMany.mockResolvedValue([]);
    prisma.replanningSuggestion.findMany.mockResolvedValue([]);
    service = new ReplanningService(
      prisma as unknown as PrismaService,
      availability as unknown as AvailabilityService,
      overdue as unknown as OverdueService,
    );
  });

  afterEach(() => vi.useRealTimers());

  it('suggests only the unrealized duration in the first available slot', async () => {
    prisma.replanningSuggestion.findFirst.mockResolvedValue(null);
    prisma.studyBlock.findFirst.mockResolvedValue({
      id: 'block-id',
      plannedDurationSeconds: 7200,
      content: { priority: 4, academicEventLinks: [] },
      sessions: [{ realizedDurationSeconds: 3600 }],
    });
    prisma.availabilityInterval.findMany.mockResolvedValue([
      {
        weekday: 1,
        startLocalTime: new Date('1970-01-01T19:00:00.000Z'),
        endLocalTime: new Date('1970-01-01T21:00:00.000Z'),
      },
    ]);
    prisma.replanningSuggestion.create.mockResolvedValue({ id: 'suggestion' });

    await service.request('student-id', 'block-id');

    expect(prisma.replanningSuggestion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          overdueBlockId: 'block-id',
          generationKind: SuggestionGenerationKind.STUDENT_REQUESTED,
          suggestedStartsAt: new Date('2026-09-07T22:00:00.000Z'),
          suggestedEndsAt: new Date('2026-09-07T23:00:00.000Z'),
          suggestedDurationSeconds: 3600,
        }),
      }),
    );
  });

  it('keeps a rejected suggestion unchanged until the student requests another', async () => {
    prisma.replanningSuggestion.findMany.mockResolvedValue([
      { id: 'rejected', status: SuggestionStatus.REJECTED },
    ]);

    const result = await service.list('student-id');

    expect(result).toEqual([
      { id: 'rejected', status: SuggestionStatus.REJECTED },
    ]);
    expect(prisma.replanningSuggestion.create).not.toHaveBeenCalled();
  });

  it('does not fail the list when an overdue block has no remaining time', async () => {
    prisma.studyBlock.findMany.mockResolvedValue([
      {
        id: 'block-id',
        endsAt: new Date('2026-09-06T23:00:00.000Z'),
        content: { priority: 3, academicEventLinks: [] },
      },
    ]);
    prisma.studyBlock.findFirst.mockResolvedValue({
      id: 'block-id',
      plannedDurationSeconds: 3600,
      content: { priority: 3, academicEventLinks: [] },
      sessions: [{ realizedDurationSeconds: 3600 }],
    });
    prisma.replanningSuggestion.findMany.mockResolvedValue([]);

    await expect(service.list('student-id')).resolves.toEqual([]);
    expect(prisma.replanningSuggestion.create).not.toHaveBeenCalled();
  });

  it('allocates automatic suggestions by priority and event proximity', async () => {
    prisma.studyBlock.findMany.mockResolvedValue([
      {
        id: 'high-priority',
        endsAt: new Date('2026-09-06T20:00:00.000Z'),
        content: { priority: 5, academicEventLinks: [] },
      },
      {
        id: 'urgent-event',
        endsAt: new Date('2026-09-06T21:00:00.000Z'),
        content: {
          priority: 1,
          academicEventLinks: [
            { academicEvent: { startsAt: new Date('2026-09-08T15:00:00Z') } },
          ],
        },
      },
    ]);
    prisma.studyBlock.findFirst.mockImplementation(({ where }) =>
      Promise.resolve({
        id: where.id,
        plannedDurationSeconds: 3600,
        content: { priority: 3, academicEventLinks: [] },
        sessions: [],
      }),
    );
    prisma.availabilityInterval.findMany.mockResolvedValue([
      {
        weekday: 1,
        startLocalTime: new Date('1970-01-01T19:00:00.000Z'),
        endLocalTime: new Date('1970-01-01T21:00:00.000Z'),
      },
    ]);
    prisma.replanningSuggestion.create.mockResolvedValue({ id: 'suggestion' });

    await service.list('student-id');

    expect(
      prisma.replanningSuggestion.create.mock.calls.map(
        ([call]) => call.data.overdueBlockId,
      ),
    ).toEqual(['urgent-event', 'high-priority']);
  });

  it('rejects an edit that changes the remaining duration', async () => {
    prisma.replanningSuggestion.findFirst.mockResolvedValue({
      id: 'suggestion-id',
      revision: 2,
      suggestedDurationSeconds: 3600,
    });

    await expect(
      service.update('student-id', 'suggestion-id', {
        revision: 2,
        startsAt: '2026-09-07T19:00:00-03:00',
        endsAt: '2026-09-07T20:30:00-03:00',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects a suggestion under the student concurrency lock', async () => {
    const transaction = {
      $executeRaw: vi.fn(),
      replanningSuggestion: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: 'suggestion-id',
          status: SuggestionStatus.REJECTED,
        }),
      },
    };
    prisma.$transaction.mockImplementation((callback) => callback(transaction));

    const result = await service.reject('student-id', 'suggestion-id');

    expect(transaction.$executeRaw).toHaveBeenCalledTimes(1);
    expect(transaction.replanningSuggestion.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'suggestion-id',
          studentId: 'student-id',
        }),
        data: expect.objectContaining({ status: SuggestionStatus.REJECTED }),
      }),
    );
    expect(result.status).toBe(SuggestionStatus.REJECTED);
  });

  it('accepts atomically and links the replacement to the overdue block', async () => {
    const suggestion = {
      id: 'suggestion-id',
      studentId: 'student-id',
      status: SuggestionStatus.GENERATED,
      suggestedStartsAt: new Date('2026-09-07T22:00:00.000Z'),
      suggestedEndsAt: new Date('2026-09-07T23:00:00.000Z'),
      suggestedDurationSeconds: 3600,
      overdueBlockId: 'block-id',
      overdueBlock: {
        id: 'block-id',
        contentId: 'content-id',
        status: BlockStatus.OVERDUE,
        startsAt: new Date('2026-09-06T22:00:00.000Z'),
        endsAt: new Date('2026-09-06T23:00:00.000Z'),
        plannedDurationSeconds: 7200,
        focusSeconds: 1500,
        breakSeconds: 300,
        revision: 3,
        parts: [{ contentPartId: 'part-id' }],
      },
    };
    const transaction = {
      $executeRaw: vi.fn(),
      replanningSuggestion: {
        findFirst: vi.fn().mockResolvedValue(suggestion),
        update: vi.fn().mockResolvedValue({
          id: 'suggestion-id',
          status: SuggestionStatus.ACCEPTED,
        }),
      },
      studyBlock: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'replacement-id' }),
        update: vi.fn().mockResolvedValue({
          id: 'block-id',
          status: BlockStatus.REPLANNED,
        }),
      },
      academicEvent: { findFirst: vi.fn().mockResolvedValue(null) },
      availabilityInterval: {
        findMany: vi.fn().mockResolvedValue([
          {
            weekday: 1,
            startLocalTime: new Date('1970-01-01T19:00:00.000Z'),
            endLocalTime: new Date('1970-01-01T21:00:00.000Z'),
          },
        ]),
      },
      studyBlockVersion: { create: vi.fn() },
    };
    prisma.$transaction.mockImplementation((callback) => callback(transaction));

    const result = await service.accept('student-id', 'suggestion-id');

    expect(transaction.studyBlock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contentId: 'content-id',
          replacesBlockId: 'block-id',
          plannedDurationSeconds: 3600,
          source: 'REPLANNED',
        }),
      }),
    );
    expect(transaction.studyBlock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'block-id' },
        data: expect.objectContaining({ status: BlockStatus.REPLANNED }),
      }),
    );
    expect(result.replacement).toEqual({ id: 'replacement-id' });
  });
});
