import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AvailabilityService } from '../availability/availability.service.js';
import { prepareIdempotency } from '../common/idempotency.js';
import type { PrismaService } from '../database/prisma.service.js';
import type { OverdueService } from '../overdue/overdue.service.js';
import { StudyBlocksService } from './study-blocks.service.js';

describe('StudyBlocksService', () => {
  const cancellableBlock = {
    id: 'block-id',
    contentId: 'content-id',
    status: 'CONFIRMED',
    revision: 1,
    startsAt: new Date('2099-09-20T22:00:00.000Z'),
    endsAt: new Date('2099-09-20T23:00:00.000Z'),
    plannedDurationSeconds: 3600,
    focusSeconds: 1500,
    breakSeconds: 300,
    parts: [],
  } as const;
  const prisma = {
    content: { findFirst: vi.fn(), findMany: vi.fn() },
    contentPart: { count: vi.fn() },
    pomodoroPreference: { findUnique: vi.fn() },
    recurrenceSeries: { findFirst: vi.fn() },
    studyBlock: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      groupBy: vi.fn(),
    },
    studySessionCompletedPart: { findMany: vi.fn() },
    $transaction: vi.fn(),
  };
  const availability = { coversInterval: vi.fn(), coversIntervals: vi.fn() };
  const overdue = { reconcileStudent: vi.fn() };
  let service: StudyBlocksService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.content.findFirst.mockResolvedValue({ id: 'content-id' });
    availability.coversInterval.mockResolvedValue(true);
    availability.coversIntervals.mockResolvedValue([true]);
    overdue.reconcileStudent.mockResolvedValue({ markedOverdue: 0 });
    prisma.content.findMany.mockResolvedValue([]);
    prisma.studyBlock.groupBy.mockResolvedValue([]);
    prisma.studySessionCompletedPart.findMany.mockResolvedValue([]);
    service = new StudyBlocksService(
      prisma as unknown as PrismaService,
      availability as unknown as AvailabilityService,
      overdue as unknown as OverdueService,
    );
  });

  it('rejects blocks whose end is not after the start', async () => {
    await expect(
      service.create('student-id', {
        contentId: 'content-id',
        startsAt: '2026-09-20T20:00:00-03:00',
        endsAt: '2026-09-20T20:00:00-03:00',
        focusSeconds: 1500,
        breakSeconds: 300,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('lists only blocks eligible for a retroactive session when requested', async () => {
    prisma.studyBlock.findMany.mockResolvedValue([]);

    await service.list('student-id', { retroactiveEligible: 'true' });

    expect(prisma.studyBlock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studentId: 'student-id',
          status: { in: ['CONFIRMED', 'OVERDUE'] },
          sessions: { none: {} },
        }),
      }),
    );
  });

  it('rejects blocks outside weekly availability', async () => {
    availability.coversInterval.mockResolvedValue(false);
    await expect(
      service.create('student-id', {
        contentId: 'content-id',
        startsAt: '2026-09-20T20:00:00-03:00',
        endsAt: '2026-09-20T21:00:00-03:00',
        focusSeconds: 1500,
        breakSeconds: 300,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('replays manual block creation without duplicating the block', async () => {
    const input = {
      contentId: 'content-id',
      startsAt: '2026-09-20T20:00:00-03:00',
      endsAt: '2026-09-20T21:00:00-03:00',
      focusSeconds: 1500,
      breakSeconds: 300,
    };
    const created = { id: 'block-id', status: 'CONFIRMED' };
    const transaction = {
      $executeRaw: vi.fn(),
      idempotencyRecord: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
      studyBlock: {
        findFirst: vi.fn().mockResolvedValueOnce(null),
        create: vi.fn().mockResolvedValue(created),
      },
      academicEvent: { findFirst: vi.fn().mockResolvedValue(null) },
      auditEvent: { create: vi.fn() },
    };
    prisma.$transaction.mockImplementation((callback) => callback(transaction));

    await service.create('student-id', input, 'manual-block-key');
    const requestHash = prepareIdempotency(
      'manual-block-key',
      'CREATE_MANUAL_STUDY_BLOCK',
      input,
    )!.requestHash;
    transaction.idempotencyRecord.findUnique.mockResolvedValue({
      requestHash,
      resultReference: { blockId: 'block-id' },
    });
    transaction.studyBlock.findFirst.mockResolvedValue(created);

    await expect(
      service.create('student-id', input, 'manual-block-key'),
    ).resolves.toBe(created);
    expect(transaction.studyBlock.create).toHaveBeenCalledTimes(1);
    expect(transaction.auditEvent.create).toHaveBeenCalledTimes(1);
    expect(transaction.idempotencyRecord.create).toHaveBeenCalledTimes(1);
  });

  it('does not expose foreign contents', async () => {
    prisma.content.findFirst.mockResolvedValue(null);
    await expect(
      service.create('student-id', {
        contentId: 'foreign-content',
        startsAt: '2026-09-20T20:00:00-03:00',
        endsAt: '2026-09-20T21:00:00-03:00',
        focusSeconds: 1500,
        breakSeconds: 300,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires both per-block Pomodoro values', async () => {
    await expect(
      service.create('student-id', {
        contentId: 'content-id',
        startsAt: '2026-09-20T20:00:00-03:00',
        endsAt: '2026-09-20T21:00:00-03:00',
        focusSeconds: 1500,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('does not edit a block that is no longer confirmed', async () => {
    prisma.studyBlock.findFirst.mockResolvedValue({
      id: 'block-id',
      contentId: 'content-id',
      status: 'OVERDUE',
      startsAt: new Date('2099-09-20T23:00:00.000Z'),
      endsAt: new Date('2099-09-21T00:00:00.000Z'),
      focusSeconds: 1500,
      breakSeconds: 300,
      revision: 1,
      parts: [],
    });
    await expect(
      service.update('student-id', 'block-id', { revision: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a daily recurrence ending before its first occurrence', async () => {
    await expect(
      service.createDailyRecurrence('student-id', {
        contentId: 'content-id',
        startsAt: '2026-09-20T20:00:00-03:00',
        endsAt: '2026-09-20T21:00:00-03:00',
        repeatUntil: '2026-09-19',
        focusSeconds: 1500,
        breakSeconds: 300,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects the whole recurrence when one day is unavailable', async () => {
    availability.coversIntervals.mockResolvedValue([true, false]);
    await expect(
      service.createDailyRecurrence('student-id', {
        contentId: 'content-id',
        startsAt: '2026-09-20T20:00:00-03:00',
        endsAt: '2026-09-20T21:00:00-03:00',
        repeatUntil: '2026-09-21',
        focusSeconds: 1500,
        breakSeconds: 300,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('replays daily recurrence creation without duplicating the series', async () => {
    const input = {
      contentId: 'content-id',
      startsAt: '2026-09-20T20:00:00-03:00',
      endsAt: '2026-09-20T21:00:00-03:00',
      repeatUntil: '2026-09-21',
      focusSeconds: 1500,
      breakSeconds: 300,
    };
    const created = [
      { id: 'first-block', recurrenceSeriesId: 'series-id' },
      { id: 'second-block', recurrenceSeriesId: 'series-id' },
    ];
    const transaction = {
      $executeRaw: vi.fn(),
      idempotencyRecord: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
      recurrenceSeries: {
        create: vi.fn().mockResolvedValue({ id: 'series-id' }),
        findFirst: vi.fn().mockResolvedValue({ id: 'series-id' }),
      },
      studyBlock: {
        findFirst: vi.fn().mockResolvedValue(null),
        createMany: vi.fn(),
        findMany: vi.fn().mockResolvedValue(created),
      },
      studyBlockPart: { createMany: vi.fn() },
      academicEvent: { findFirst: vi.fn().mockResolvedValue(null) },
      auditEvent: { create: vi.fn() },
    };
    prisma.$transaction.mockImplementation((callback) => callback(transaction));

    await service.createDailyRecurrence(
      'student-id',
      input,
      'daily-recurrence-key',
    );
    const requestHash = prepareIdempotency(
      'daily-recurrence-key',
      'CREATE_DAILY_STUDY_BLOCK_RECURRENCE',
      input,
    )!.requestHash;
    transaction.idempotencyRecord.findUnique.mockResolvedValue({
      requestHash,
      resultReference: { recurrenceSeriesId: 'series-id' },
    });

    await expect(
      service.createDailyRecurrence(
        'student-id',
        input,
        'daily-recurrence-key',
      ),
    ).resolves.toEqual(created);
    expect(transaction.recurrenceSeries.create).toHaveBeenCalledTimes(1);
    expect(transaction.studyBlock.createMany).toHaveBeenCalledTimes(1);
    expect(transaction.auditEvent.create).toHaveBeenCalledTimes(1);
    expect(transaction.idempotencyRecord.create).toHaveBeenCalledTimes(1);
  });

  it('does not expose a recurrence owned by another student', async () => {
    prisma.recurrenceSeries.findFirst.mockResolvedValue(null);
    await expect(
      service.cancelSeries('student-id', 'series-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('cancels only active blocks from the selected recurrence', async () => {
    prisma.recurrenceSeries.findFirst.mockResolvedValue({ id: 'series-id' });
    const transaction = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      content: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'content-id',
            name: 'Bioquímica',
            manuallyCompletedAt: null,
            parts: [],
          },
        ]),
      },
      studyBlock: {
        findMany: vi.fn().mockResolvedValue([cancellableBlock]),
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      studyBlockVersion: { createMany: vi.fn() },
      studySessionCompletedPart: { findMany: vi.fn().mockResolvedValue([]) },
      auditEvent: { create: vi.fn() },
    };
    prisma.$transaction.mockImplementation((callback) => callback(transaction));

    const result = await service.cancelSeries('student-id', 'series-id');

    expect(transaction.studyBlock.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studentId: 'student-id',
          recurrenceSeriesId: 'series-id',
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        seriesId: 'series-id',
        cancelledBlocks: 2,
        warnings: {
          uncoveredContents: [{ contentId: 'content-id', name: 'Bioquímica' }],
        },
      }),
    );
    expect(transaction.studyBlockVersion.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          studyBlockId: 'block-id',
          changeReason: 'SERIES_CANCELLATION',
        }),
      ],
    });
    expect(transaction.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'STUDY_BLOCK_SERIES_CANCELLED',
        entityId: 'series-id',
      }),
    });
  });

  it('does not warn when another future block still covers the content', async () => {
    prisma.recurrenceSeries.findFirst.mockResolvedValue({ id: 'series-id' });
    const transaction = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      content: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'content-id',
            name: 'Bioquímica',
            manuallyCompletedAt: null,
            parts: [],
          },
        ]),
      },
      studyBlock: {
        findMany: vi.fn().mockResolvedValue([cancellableBlock]),
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        groupBy: vi
          .fn()
          .mockResolvedValue([
            { contentId: 'content-id', _count: { _all: 1 } },
          ]),
      },
      studyBlockVersion: { createMany: vi.fn() },
      studySessionCompletedPart: { findMany: vi.fn().mockResolvedValue([]) },
      auditEvent: { create: vi.fn() },
    };
    prisma.$transaction.mockImplementation((callback) => callback(transaction));

    const result = await service.cancelSeries('student-id', 'series-id');

    expect(result.warnings.uncoveredContents).toEqual([]);
  });
});
