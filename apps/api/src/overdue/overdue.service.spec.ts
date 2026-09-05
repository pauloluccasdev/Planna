import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { BlockStatus } from '../generated/prisma/enums.js';
import { OverdueService } from './overdue.service.js';

describe('OverdueService', () => {
  const prisma = { studyBlock: { updateMany: vi.fn() } };
  let service: OverdueService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.studyBlock.updateMany.mockResolvedValue({ count: 2 });
    service = new OverdueService(prisma as unknown as PrismaService);
  });

  it('marks only ended confirmed or paused blocks as overdue', async () => {
    const now = new Date('2026-09-05T03:00:00.000Z');
    const result = await service.reconcileStudent('student-id', now);

    expect(prisma.studyBlock.updateMany).toHaveBeenCalledWith({
      where: {
        studentId: 'student-id',
        endsAt: { lt: now },
        status: { in: [BlockStatus.CONFIRMED, BlockStatus.PAUSED] },
      },
      data: {
        status: BlockStatus.OVERDUE,
        revision: { increment: 1 },
      },
    });
    expect(result).toEqual({ markedOverdue: 2, checkedAt: now });
  });
});
