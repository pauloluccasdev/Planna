import { UnprocessableEntityException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { BlockStatus } from '../generated/prisma/enums.js';
import type { OverdueService } from '../overdue/overdue.service.js';
import { MetricsService } from './metrics.service.js';

describe('MetricsService', () => {
  const prisma = {
    studyBlock: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    studySession: { aggregate: vi.fn() },
  };
  const overdue = { reconcileStudent: vi.fn() };
  const range = {
    from: '2026-09-01T00:00:00-03:00',
    to: '2026-10-01T00:00:00-03:00',
  };
  let service: MetricsService;

  beforeEach(() => {
    vi.clearAllMocks();
    overdue.reconcileStudent.mockResolvedValue({ markedOverdue: 0 });
    service = new MetricsService(
      prisma as unknown as PrismaService,
      overdue as unknown as OverdueService,
    );
  });

  it('returns no percentage when there are no eligible blocks', async () => {
    prisma.studyBlock.groupBy.mockResolvedValue([]);
    await expect(service.compliance('student-id', range)).resolves.toEqual({
      eligibleBlocks: 0,
      completedBlocks: 0,
      percentage: null,
    });
  });

  it('calculates block compliance independently of duration', async () => {
    prisma.studyBlock.groupBy.mockResolvedValue([
      { status: BlockStatus.COMPLETED, _count: { _all: 3 } },
      { status: BlockStatus.CONFIRMED, _count: { _all: 1 } },
    ]);
    const result = await service.compliance('student-id', range);
    expect(result).toEqual({
      eligibleBlocks: 4,
      completedBlocks: 3,
      percentage: 75,
    });
  });

  it('keeps additional unplanned time outside planned comparison', async () => {
    prisma.studyBlock.findMany.mockResolvedValue([
      {
        id: 'block-id',
        plannedDurationSeconds: 3600,
        sessions: [
          {
            focusDurationSeconds: 2400,
            pomodoroBreakDurationSeconds: 600,
            realizedDurationSeconds: 3000,
          },
        ],
      },
    ]);
    prisma.studySession.aggregate.mockResolvedValue({
      _sum: {
        focusDurationSeconds: 1200,
        pomodoroBreakDurationSeconds: 300,
        realizedDurationSeconds: 1500,
      },
    });
    await expect(service.time('student-id', range)).resolves.toEqual({
      plannedCompletedSeconds: 3600,
      realizedCompletedSeconds: 3000,
      focusCompletedSeconds: 2400,
      breakCompletedSeconds: 600,
      percentage: 3000 / 36,
      additionalUnplanned: {
        focusSeconds: 1200,
        breakSeconds: 300,
        realizedSeconds: 1500,
      },
    });
  });

  it('rejects an inverted reporting period', async () => {
    await expect(
      service.compliance('student-id', {
        from: range.to,
        to: range.from,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
