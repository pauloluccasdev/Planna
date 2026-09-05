import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { BlockStatus } from '../generated/prisma/enums.js';

@Injectable()
export class OverdueService {
  constructor(private readonly prisma: PrismaService) {}

  async reconcileStudent(studentId: string, now = new Date()) {
    const result = await this.prisma.studyBlock.updateMany({
      where: {
        studentId,
        endsAt: { lt: now },
        status: { in: [BlockStatus.CONFIRMED, BlockStatus.PAUSED] },
      },
      data: {
        status: BlockStatus.OVERDUE,
        revision: { increment: 1 },
      },
    });
    return { markedOverdue: result.count, checkedAt: now };
  }
}
