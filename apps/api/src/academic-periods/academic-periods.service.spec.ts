import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { AcademicPeriodsService } from './academic-periods.service.js';

describe('AcademicPeriodsService', () => {
  const prisma = {
    course: { findFirst: vi.fn() },
    academicPeriod: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  let service: AcademicPeriodsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AcademicPeriodsService(prisma as unknown as PrismaService);
  });

  it('does not list periods from a foreign course', async () => {
    prisma.course.findFirst.mockResolvedValue(null);
    await expect(
      service.list('student-id', 'foreign-course'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.academicPeriod.findMany).not.toHaveBeenCalled();
  });

  it('rejects a period whose end precedes its start', async () => {
    prisma.course.findFirst.mockResolvedValue({ id: 'course-id' });
    await expect(
      service.create('student-id', 'course-id', {
        name: '2026.2',
        startsOn: '2026-12-01',
        endsOn: '2026-08-01',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.academicPeriod.create).not.toHaveBeenCalled();
  });

  it('stores date-only values at UTC midnight', async () => {
    prisma.course.findFirst.mockResolvedValue({ id: 'course-id' });
    prisma.academicPeriod.create.mockResolvedValue({ id: 'period-id' });
    await service.create('student-id', 'course-id', {
      name: '2026.2',
      startsOn: '2026-08-01',
      endsOn: '2026-12-20',
    });
    expect(prisma.academicPeriod.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          startsOn: new Date('2026-08-01T00:00:00.000Z'),
          endsOn: new Date('2026-12-20T00:00:00.000Z'),
        }),
      }),
    );
  });
});
