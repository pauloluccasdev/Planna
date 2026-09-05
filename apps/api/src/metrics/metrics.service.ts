import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import {
  BlockStatus,
  SessionKind,
  SessionStatus,
} from '../generated/prisma/enums.js';
import type { MetricsQueryDto } from './dto/metrics-query.dto.js';
import { OverdueService } from '../overdue/overdue.service.js';

@Injectable()
export class MetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly overdue: OverdueService,
  ) {}

  async summary(studentId: string, query: MetricsQueryDto) {
    await this.overdue.reconcileStudent(studentId);
    const [compliance, time, adaptation] = await Promise.all([
      this.compliance(studentId, query, false),
      this.time(studentId, query),
      this.adaptation(studentId, query, false),
    ]);
    return { compliance, time, adaptation };
  }

  async compliance(
    studentId: string,
    query: MetricsQueryDto,
    reconcile = true,
  ) {
    if (reconcile) await this.overdue.reconcileStudent(studentId);
    const range = this.parseRange(query);
    const blocks = await this.prisma.studyBlock.groupBy({
      by: ['status'],
      where: {
        studentId,
        startsAt: { gte: range.from },
        endsAt: { lte: range.to },
        status: { notIn: [BlockStatus.CANCELLED, BlockStatus.REPLANNED] },
        ...this.academicFilter(query),
      },
      _count: { _all: true },
    });
    const eligibleBlocks = blocks.reduce(
      (total, item) => total + item._count._all,
      0,
    );
    const completedBlocks =
      blocks.find(({ status }) => status === BlockStatus.COMPLETED)?._count
        ._all ?? 0;
    return {
      eligibleBlocks,
      completedBlocks,
      percentage:
        eligibleBlocks === 0 ? null : (completedBlocks * 100) / eligibleBlocks,
    };
  }

  async time(studentId: string, query: MetricsQueryDto) {
    const range = this.parseRange(query);
    const completedBlocks = await this.prisma.studyBlock.findMany({
      where: {
        studentId,
        startsAt: { gte: range.from },
        endsAt: { lte: range.to },
        status: BlockStatus.COMPLETED,
        ...this.academicFilter(query),
      },
      select: {
        id: true,
        plannedDurationSeconds: true,
        sessions: {
          where: { status: SessionStatus.COMPLETED },
          select: {
            focusDurationSeconds: true,
            pomodoroBreakDurationSeconds: true,
            realizedDurationSeconds: true,
          },
        },
      },
    });
    const plannedCompletedSeconds = completedBlocks.reduce(
      (total, block) => total + block.plannedDurationSeconds,
      0,
    );
    const completedSessions = completedBlocks.flatMap(
      ({ sessions }) => sessions,
    );
    const focusCompletedSeconds = this.sum(
      completedSessions.map(({ focusDurationSeconds }) => focusDurationSeconds),
    );
    const breakCompletedSeconds = this.sum(
      completedSessions.map(
        ({ pomodoroBreakDurationSeconds }) => pomodoroBreakDurationSeconds,
      ),
    );
    const realizedCompletedSeconds = this.sum(
      completedSessions.map(
        ({ realizedDurationSeconds }) => realizedDurationSeconds,
      ),
    );
    const additionalSessions = await this.prisma.studySession.aggregate({
      where: {
        studentId,
        studyBlockId: null,
        status: SessionStatus.COMPLETED,
        kind: { in: [SessionKind.UNPLANNED, SessionKind.RETROACTIVE] },
        startedAt: { gte: range.from, lte: range.to },
        ...this.sessionAcademicFilter(query),
      },
      _sum: {
        focusDurationSeconds: true,
        pomodoroBreakDurationSeconds: true,
        realizedDurationSeconds: true,
      },
    });
    return {
      plannedCompletedSeconds,
      realizedCompletedSeconds,
      focusCompletedSeconds,
      breakCompletedSeconds,
      percentage:
        plannedCompletedSeconds === 0
          ? null
          : (realizedCompletedSeconds * 100) / plannedCompletedSeconds,
      additionalUnplanned: {
        focusSeconds: additionalSessions._sum.focusDurationSeconds ?? 0,
        breakSeconds: additionalSessions._sum.pomodoroBreakDurationSeconds ?? 0,
        realizedSeconds: additionalSessions._sum.realizedDurationSeconds ?? 0,
      },
    };
  }

  async adaptation(
    studentId: string,
    query: MetricsQueryDto,
    reconcile = true,
  ) {
    if (reconcile) await this.overdue.reconcileStudent(studentId);
    const range = this.parseRange(query);
    const academicFilter = this.academicFilter(query);
    const [statuses, overdueNow] = await Promise.all([
      this.prisma.studyBlock.groupBy({
        by: ['status'],
        where: {
          studentId,
          startsAt: { gte: range.from },
          endsAt: { lte: range.to },
          status: { in: [BlockStatus.CANCELLED, BlockStatus.REPLANNED] },
          ...academicFilter,
        },
        _count: { _all: true },
      }),
      this.prisma.studyBlock.count({
        where: {
          studentId,
          startsAt: { gte: range.from },
          endsAt: { lte: new Date(Math.min(range.to.getTime(), Date.now())) },
          status: {
            in: [
              BlockStatus.CONFIRMED,
              BlockStatus.IN_PROGRESS,
              BlockStatus.PAUSED,
              BlockStatus.OVERDUE,
            ],
          },
          ...academicFilter,
        },
      }),
    ]);
    const count = (status: BlockStatus) =>
      statuses.find((item) => item.status === status)?._count._all ?? 0;
    return {
      currentOverdueBlocks: overdueNow,
      replannedBlocks: count(BlockStatus.REPLANNED),
      cancelledBlocks: count(BlockStatus.CANCELLED),
    };
  }

  private parseRange(query: MetricsQueryDto) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (from >= to) {
      throw new UnprocessableEntityException({
        error: {
          code: 'INVALID_METRICS_RANGE',
          message: 'O final do período deve ser posterior ao início.',
        },
      });
    }
    return { from, to };
  }

  private academicFilter(query: MetricsQueryDto) {
    return {
      ...(query.contentId ? { contentId: query.contentId } : {}),
      ...(query.subjectId || query.courseId
        ? {
            content: {
              ...(query.subjectId ? { subjectId: query.subjectId } : {}),
              ...(query.courseId
                ? { subject: { courseId: query.courseId } }
                : {}),
            },
          }
        : {}),
    };
  }

  private sessionAcademicFilter(query: MetricsQueryDto) {
    return {
      ...(query.contentId ? { contentId: query.contentId } : {}),
      ...(query.subjectId || query.courseId
        ? {
            content: {
              ...(query.subjectId ? { subjectId: query.subjectId } : {}),
              ...(query.courseId
                ? { subject: { courseId: query.courseId } }
                : {}),
            },
          }
        : {}),
    };
  }

  private sum(values: (number | null)[]) {
    return values.reduce<number>((total, value) => total + (value ?? 0), 0);
  }
}
