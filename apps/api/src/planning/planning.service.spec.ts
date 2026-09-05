import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { ProposalStatus } from '../generated/prisma/enums.js';
import { PlanningService } from './planning.service.js';

describe('PlanningService', () => {
  const prisma = {
    planningProposal: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  let service: PlanningService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PlanningService(prisma as unknown as PrismaService);
  });

  it('requires at least one course or subject', async () => {
    await expect(
      service.create('student-id', {
        periodStart: '2099-09-07T00:00:00-03:00',
        periodEnd: '2099-09-08T00:00:00-03:00',
        courseIds: [],
        subjectIds: [],
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects a planning period that has already ended', async () => {
    await expect(
      service.create('student-id', {
        periodStart: '2020-09-07T00:00:00-03:00',
        periodEnd: '2020-09-08T00:00:00-03:00',
        courseIds: ['9ecb881f-e831-43e8-8212-2d28545cbf45'],
        subjectIds: [],
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('does not expose another student proposal', async () => {
    prisma.planningProposal.findFirst.mockResolvedValue(null);
    await expect(
      service.get('student-id', 'proposal-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not discard a confirmed proposal', async () => {
    prisma.planningProposal.findFirst.mockResolvedValue({
      id: 'proposal-id',
      status: ProposalStatus.CONFIRMED,
      revision: 2,
    });
    await expect(
      service.discard('student-id', 'proposal-id'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.planningProposal.updateMany).not.toHaveBeenCalled();
  });

  it('does not expose another student proposal during confirmation', async () => {
    const transaction = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      planningProposal: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    prisma.$transaction.mockImplementation((callback) => callback(transaction));

    await expect(
      service.confirm('student-id', 'proposal-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
