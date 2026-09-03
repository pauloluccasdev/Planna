import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { AcademicEventTypesService } from './academic-event-types.service.js';

describe('AcademicEventTypesService', () => {
  it('lists only system types and custom types owned by the student', async () => {
    const prisma = {
      academicEventType: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const service = new AcademicEventTypesService(
      prisma as unknown as PrismaService,
    );
    await service.list('student-id');
    expect(prisma.academicEventType.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { isSystem: true, studentId: null },
            { isSystem: false, studentId: 'student-id' },
          ],
        }),
      }),
    );
  });

  it('prevents changes to a system type', async () => {
    const prisma = {
      academicEventType: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ studentId: null, isSystem: true }),
        update: vi.fn(),
      },
    };
    const service = new AcademicEventTypesService(
      prisma as unknown as PrismaService,
    );
    await expect(
      service.update('student-id', 'system-id', { name: 'Outro' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.academicEventType.update).not.toHaveBeenCalled();
  });
});
