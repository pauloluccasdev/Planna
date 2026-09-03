import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { RecordStatus } from '../generated/prisma/enums.js';
import { SubjectsService } from './subjects.service.js';

describe('SubjectsService', () => {
  const prisma = {
    course: { findFirst: vi.fn() },
    academicPeriod: { findFirst: vi.fn() },
    subject: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
  };
  let service: SubjectsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SubjectsService(prisma as unknown as PrismaService);
  });

  it('checks course ownership before listing subjects', async () => {
    prisma.course.findFirst.mockResolvedValue(null);
    await expect(
      service.list('student-id', 'foreign-course', {}),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.subject.findMany).not.toHaveBeenCalled();
  });

  it('rejects a period that belongs to another course', async () => {
    prisma.course.findFirst.mockResolvedValue({ id: 'course-id' });
    prisma.academicPeriod.findFirst.mockResolvedValue(null);
    await expect(
      service.create('student-id', 'course-id', {
        name: 'Fisiologia',
        academicPeriodId: 'foreign-period',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.subject.create).not.toHaveBeenCalled();
  });

  it('creates a subject using the authenticated student id', async () => {
    prisma.course.findFirst.mockResolvedValue({ id: 'course-id' });
    prisma.subject.create.mockResolvedValue({ id: 'subject-id' });
    await service.create('student-id', 'course-id', { name: '  Fisiologia  ' });
    expect(prisma.subject.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentId: 'student-id',
          courseId: 'course-id',
          name: 'Fisiologia',
        }),
      }),
    );
  });

  it('defaults subject listings to active records', async () => {
    prisma.course.findFirst.mockResolvedValue({ id: 'course-id' });
    prisma.subject.findMany.mockResolvedValue([]);
    await service.list('student-id', 'course-id', {});
    expect(prisma.subject.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: RecordStatus.ACTIVE }),
      }),
    );
  });
});
