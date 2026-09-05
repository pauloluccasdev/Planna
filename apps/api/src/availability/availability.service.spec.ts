import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import {
  AvailabilityService,
  mergeAvailabilityIntervals,
} from './availability.service.js';

describe('AvailabilityService', () => {
  const transaction = {
    availabilityInterval: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    studyBlock: { findMany: vi.fn() },
    $executeRaw: vi.fn(),
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
    transaction.studyBlock.findMany.mockResolvedValue([]);
    transaction.availabilityInterval.findMany.mockResolvedValue([]);
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
    transaction.studyBlock.findMany.mockResolvedValue([
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
    expect(transaction.availabilityInterval.deleteMany).not.toHaveBeenCalled();
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

  it('merges overlapping and adjacent intervals by weekday', () => {
    expect(
      mergeAvailabilityIntervals([
        { weekday: 1, startLocalTime: '19:00', endLocalTime: '20:00' },
        { weekday: 1, startLocalTime: '19:30', endLocalTime: '21:00' },
        { weekday: 1, startLocalTime: '21:00', endLocalTime: '22:00' },
        { weekday: 2, startLocalTime: '19:00', endLocalTime: '20:00' },
      ]),
    ).toEqual([
      { weekday: 1, startLocalTime: '19:00:00', endLocalTime: '22:00:00' },
      { weekday: 2, startLocalTime: '19:00:00', endLocalTime: '20:00:00' },
    ]);
  });

  it('expands the grade without replacing uncovered intervals', async () => {
    transaction.availabilityInterval.findMany.mockResolvedValue([
      {
        weekday: 1,
        startLocalTime: new Date('1970-01-01T19:00:00.000Z'),
        endLocalTime: new Date('1970-01-01T20:00:00.000Z'),
      },
    ]);

    await service.expand('student-id', [
      { weekday: 1, startLocalTime: '20:00', endLocalTime: '21:00' },
    ]);

    expect(transaction.availabilityInterval.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          studentId: 'student-id',
          weekday: 1,
          startLocalTime: new Date('1970-01-01T19:00:00.000Z'),
          endLocalTime: new Date('1970-01-01T21:00:00.000Z'),
        }),
      ],
    });
  });
});
