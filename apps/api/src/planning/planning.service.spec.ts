import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { ProposalStatus } from '../generated/prisma/enums.js';
import {
  inspectProposalPartAssignments,
  PlanningService,
  planningEventLookupEnd,
} from './planning.service.js';

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
    const transaction = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      planningProposal: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'proposal-id',
          status: ProposalStatus.CONFIRMED,
          revision: 2,
        }),
        updateMany: vi.fn(),
      },
    };
    prisma.$transaction.mockImplementation((callback) => callback(transaction));
    await expect(
      service.discard('student-id', 'proposal-id'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.planningProposal.updateMany).not.toHaveBeenCalled();
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

  it('audits a discarded proposal in the same transaction', async () => {
    const discarded = {
      id: 'proposal-id',
      status: ProposalStatus.DISCARDED,
      revision: 2,
    };
    const transaction = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      planningProposal: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'proposal-id',
          status: ProposalStatus.READY,
          revision: 1,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue(discarded),
      },
      auditEvent: { create: vi.fn().mockResolvedValue({ id: 'audit-id' }) },
    };
    prisma.$transaction.mockImplementation((callback) => callback(transaction));

    await expect(service.discard('student-id', 'proposal-id')).resolves.toBe(
      discarded,
    );
    expect(transaction.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'PLANNING_PROPOSAL_DISCARDED',
        entityId: 'proposal-id',
      }),
    });
  });

  it('rejects an invalid proposed block range before writing', async () => {
    await expect(
      service.updateBlock('student-id', 'proposal-id', 'block-id', {
        revision: 1,
        contentId: '9ecb881f-e831-43e8-8212-2d28545cbf45',
        startsAt: '2099-09-07T20:00:00-03:00',
        endsAt: '2099-09-07T19:00:00-03:00',
        focusSeconds: 1500,
        breakSeconds: 300,
        partIds: [],
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('looks beyond a short plan for events inside the urgency horizon', () => {
    expect(
      planningEventLookupEnd(
        new Date('2026-09-07T03:00:00.000Z'),
        new Date('2026-09-14T03:00:00.000Z'),
      ),
    ).toEqual(new Date('2027-03-06T03:00:00.000Z'));
  });

  it('keeps the full selected period when it exceeds the urgency horizon', () => {
    expect(
      planningEventLookupEnd(
        new Date('2026-01-01T03:00:00.000Z'),
        new Date('2027-01-01T03:00:00.000Z'),
      ),
    ).toEqual(new Date('2027-01-01T03:00:00.000Z'));
  });

  it('requires a saved part assignment when the content has active parts', () => {
    expect(
      inspectProposalPartAssignments([
        {
          id: 'missing-block',
          content: { archivedAt: null, parts: [{ id: 'part-id' }] },
          parts: [],
        },
        {
          id: 'valid-block',
          content: { archivedAt: null, parts: [{ id: 'part-id' }] },
          parts: [{ contentPartId: 'part-id' }],
        },
        {
          id: 'whole-content-block',
          content: { archivedAt: null, parts: [] },
          parts: [],
        },
      ]),
    ).toEqual({ missingBlockIds: ['missing-block'], invalidBlockIds: [] });
  });

  it('invalidates archived content or inactive part assignments', () => {
    expect(
      inspectProposalPartAssignments([
        {
          id: 'archived-content-block',
          content: { archivedAt: new Date(), parts: [] },
          parts: [],
        },
        {
          id: 'archived-part-block',
          content: { archivedAt: null, parts: [{ id: 'active-part' }] },
          parts: [{ contentPartId: 'archived-part' }],
        },
      ]),
    ).toEqual({
      missingBlockIds: [],
      invalidBlockIds: ['archived-content-block', 'archived-part-block'],
    });
  });

  it('does not expose another student proposed block', async () => {
    const transaction = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      proposedStudyBlock: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    prisma.$transaction.mockImplementation((callback) => callback(transaction));

    await expect(
      service.removeBlock('student-id', 'proposal-id', 'block-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
