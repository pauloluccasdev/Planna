import { UnprocessableEntityException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { EventContentsStatus } from '../generated/prisma/enums.js';
import { AcademicEventsService } from './academic-events.service.js';

describe('AcademicEventsService', () => {
  const prisma = {
    subject: { findFirst: vi.fn() },
    content: { count: vi.fn() },
    academicEventType: { findFirst: vi.fn() },
    academicEvent: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  };
  let service: AcademicEventsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AcademicEventsService(prisma as unknown as PrismaService);
  });

  it('rejects an end time before the start time', async () => {
    await expect(
      service.create('student-id', {
        subjectId: 'subject-id',
        eventTypeId: 'type-id',
        title: 'Prova',
        startsAt: '2026-09-20T20:00:00-03:00',
        endsAt: '2026-09-20T19:00:00-03:00',
        contentsStatus: EventContentsStatus.NOT_INFORMED_YET,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.academicEvent.create).not.toHaveBeenCalled();
  });

  it('requires at least one content when contents are marked informed', async () => {
    prisma.subject.findFirst.mockResolvedValue({ id: 'subject-id' });
    prisma.academicEventType.findFirst.mockResolvedValue({ id: 'type-id' });
    await expect(
      service.create('student-id', {
        subjectId: 'subject-id',
        eventTypeId: 'type-id',
        title: 'Prova',
        startsAt: '2026-09-20T20:00:00-03:00',
        contentsStatus: EventContentsStatus.INFORMED,
        contentIds: [],
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('returns warnings instead of blocking overlapping events', async () => {
    prisma.subject.findFirst.mockResolvedValue({ id: 'subject-id' });
    prisma.academicEventType.findFirst.mockResolvedValue({ id: 'type-id' });
    prisma.academicEvent.create.mockResolvedValue({ id: 'event-id' });
    prisma.academicEvent.findMany.mockResolvedValue([
      { id: 'overlap-id', title: 'Outro evento' },
    ]);
    const result = await service.create('student-id', {
      subjectId: 'subject-id',
      eventTypeId: 'type-id',
      title: 'Prova',
      startsAt: '2026-09-20T20:00:00-03:00',
      endsAt: '2026-09-20T21:00:00-03:00',
      contentsStatus: EventContentsStatus.NOT_INFORMED_YET,
    });
    expect(result.event).toEqual({ id: 'event-id' });
    expect(result.warnings).toHaveLength(1);
  });

  it('requires content status and identifiers together when updating', async () => {
    prisma.academicEvent.findFirst.mockResolvedValue({
      id: 'event-id',
      subjectId: 'subject-id',
      startsAt: new Date('2026-09-20T23:00:00.000Z'),
      endsAt: null,
    });
    await expect(
      service.update('student-id', 'event-id', {
        contentsStatus: EventContentsStatus.NOT_INFORMED_YET,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
