import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AvailabilityService } from '../availability/availability.service.js';
import type { PrismaService } from '../database/prisma.service.js';
import { StudyBlocksService } from './study-blocks.service.js';

describe('StudyBlocksService', () => {
  const prisma = {
    content: { findFirst: vi.fn() },
    contentPart: { count: vi.fn() },
    pomodoroPreference: { findUnique: vi.fn() },
    studyBlock: { findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  };
  const availability = { coversInterval: vi.fn(), coversIntervals: vi.fn() };
  let service: StudyBlocksService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.content.findFirst.mockResolvedValue({ id: 'content-id' });
    availability.coversInterval.mockResolvedValue(true);
    availability.coversIntervals.mockResolvedValue([true]);
    service = new StudyBlocksService(
      prisma as unknown as PrismaService,
      availability as unknown as AvailabilityService,
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
});
