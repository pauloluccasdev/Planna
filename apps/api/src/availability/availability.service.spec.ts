import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { AvailabilityService } from './availability.service.js';

describe('AvailabilityService', () => {
  const transaction = {
    availabilityInterval: { deleteMany: vi.fn(), createMany: vi.fn() },
  };
  const prisma = {
    availabilityInterval: { findMany: vi.fn() },
    studyBlock: { findMany: vi.fn() },
    $transaction: vi.fn(async (callback) => callback(transaction)),
  };
  let service: AvailabilityService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.studyBlock.findMany.mockResolvedValue([]);
    prisma.availabilityInterval.findMany.mockResolvedValue([]);
    service = new AvailabilityService(prisma as unknown as PrismaService);
  });

  it('rejects overlapping intervals on the same weekday', async () => {
    await expect(
      service.validate('student-id', [
        { weekday: 1, startLocalTime: '19:00', endLocalTime: '21:00' },
        { weekday: 1, startLocalTime: '20:30', endLocalTime: '22:00' },
      ]),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.studyBlock.findMany).not.toHaveBeenCalled();
  });

  it('allows adjacent intervals', async () => {
    await expect(
      service.validate('student-id', [
        { weekday: 1, startLocalTime: '19:00', endLocalTime: '20:00' },
        { weekday: 1, startLocalTime: '20:00', endLocalTime: '21:00' },
      ]),
    ).resolves.toEqual({ valid: true, conflicts: [] });
  });

  it('does not replace the grade when a future block would fall outside it', async () => {
    prisma.studyBlock.findMany.mockResolvedValue([
      {
        id: 'block-id',
        startsAt: new Date('2099-08-03T22:00:00.000Z'),
        endsAt: new Date('2099-08-03T23:00:00.000Z'),
      },
    ]);
    await expect(
      service.replace('student-id', [
        { weekday: 1, startLocalTime: '17:00', endLocalTime: '18:00' },
      ]),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('replaces all intervals atomically when valid', async () => {
    await service.replace('student-id', [
      { weekday: 1, startLocalTime: '19:00', endLocalTime: '21:00' },
    ]);
    expect(transaction.availabilityInterval.deleteMany).toHaveBeenCalledWith({
      where: { studentId: 'student-id' },
    });
    expect(transaction.availabilityInterval.createMany).toHaveBeenCalledOnce();
  });
});
