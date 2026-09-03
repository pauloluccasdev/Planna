import { UnprocessableEntityException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { CalendarService } from './calendar.service.js';

describe('CalendarService', () => {
  const prisma = {
    studyBlock: { findMany: vi.fn() },
    academicEvent: { findMany: vi.fn() },
  };
  let service: CalendarService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CalendarService(prisma as unknown as PrismaService);
  });

  it('rejects an inverted calendar range', async () => {
    await expect(
      service.list('student-id', {
        from: '2026-09-02T00:00:00-03:00',
        to: '2026-09-01T00:00:00-03:00',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('merges blocks and events in chronological order', async () => {
    prisma.studyBlock.findMany.mockResolvedValue([
      {
        id: 'block-id',
        startsAt: new Date('2026-09-10T22:00:00.000Z'),
      },
    ]);
    prisma.academicEvent.findMany.mockResolvedValue([
      {
        id: 'event-id',
        startsAt: new Date('2026-09-10T20:00:00.000Z'),
      },
    ]);
    const result = await service.list('student-id', {
      from: '2026-09-01T00:00:00-03:00',
      to: '2026-10-01T00:00:00-03:00',
    });
    expect(result.map(({ type, id }) => ({ type, id }))).toEqual([
      { type: 'academic_event', id: 'event-id' },
      { type: 'study_block', id: 'block-id' },
    ]);
  });

  it('scopes both queries to the authenticated student', async () => {
    prisma.studyBlock.findMany.mockResolvedValue([]);
    prisma.academicEvent.findMany.mockResolvedValue([]);
    await service.list('student-id', {
      from: '2026-09-01T00:00:00-03:00',
      to: '2026-10-01T00:00:00-03:00',
      courseId: 'e28e59f6-a1ca-4ad9-a006-aa3976455a21',
    });
    expect(prisma.studyBlock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ studentId: 'student-id' }),
      }),
    );
    expect(prisma.academicEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ studentId: 'student-id' }),
      }),
    );
  });
});
