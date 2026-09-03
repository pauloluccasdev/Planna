import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { RecordStatus } from '../generated/prisma/enums.js';
import { CoursesService } from './courses.service.js';

const course = {
  id: 'course-id',
  name: 'Nutrição',
  description: null,
  status: RecordStatus.ACTIVE,
  archivedAt: null,
  createdAt: new Date('2026-09-01T00:00:00Z'),
  updatedAt: new Date('2026-09-01T00:00:00Z'),
};

describe('CoursesService', () => {
  const prisma = {
    course: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
  };
  let service: CoursesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CoursesService(prisma as unknown as PrismaService);
  });

  it('limits list queries to the authenticated student', async () => {
    prisma.course.findMany.mockResolvedValue([course]);
    await expect(service.list('student-id')).resolves.toEqual([course]);
    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: 'student-id', status: RecordStatus.ACTIVE },
      }),
    );
  });

  it('does not reveal a course owned by another student', async () => {
    prisma.course.findFirst.mockResolvedValue(null);
    await expect(
      service.get('student-id', 'foreign-course'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('normalizes text when creating a course', async () => {
    prisma.course.create.mockResolvedValue(course);
    await service.create('student-id', {
      name: '  Nutrição  ',
      description: '   ',
    });
    expect(prisma.course.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { studentId: 'student-id', name: 'Nutrição', description: null },
      }),
    );
  });

  it('blocks hard deletion when the course has history', async () => {
    prisma.course.findFirst.mockResolvedValue(course);
    prisma.course.count.mockResolvedValue(1);
    await expect(
      service.remove('student-id', course.id),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.course.delete).not.toHaveBeenCalled();
  });
});
