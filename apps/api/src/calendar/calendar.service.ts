import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { BlockStatus } from '../generated/prisma/enums.js';
import { OverdueService } from '../overdue/overdue.service.js';
import type { CalendarQueryDto } from './dto/calendar-query.dto.js';

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly overdue: OverdueService,
  ) {}

  async list(studentId: string, query: CalendarQueryDto) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (from >= to) {
      throw new UnprocessableEntityException({
        error: {
          code: 'INVALID_CALENDAR_RANGE',
          message: 'O final do período deve ser posterior ao início.',
        },
      });
    }
    await this.overdue.reconcileStudent(studentId);
    const [blocks, events] = await Promise.all([
      this.prisma.studyBlock.findMany({
        where: {
          studentId,
          startsAt: { lt: to },
          endsAt: { gt: from },
          status: { notIn: [BlockStatus.CANCELLED, BlockStatus.REPLANNED] },
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
        },
        select: {
          id: true,
          recurrenceSeriesId: true,
          startsAt: true,
          endsAt: true,
          status: true,
          source: true,
          plannedDurationSeconds: true,
          focusSeconds: true,
          breakSeconds: true,
          content: {
            select: {
              id: true,
              name: true,
              priority: true,
              subject: {
                select: {
                  id: true,
                  name: true,
                  course: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.academicEvent.findMany({
        where: {
          studentId,
          deletedAt: null,
          OR: [
            { endsAt: null, startsAt: { gte: from, lt: to } },
            { startsAt: { lt: to }, endsAt: { gt: from } },
          ],
          ...(query.subjectId ? { subjectId: query.subjectId } : {}),
          ...(query.courseId ? { subject: { courseId: query.courseId } } : {}),
          ...(query.contentId
            ? { contentLinks: { some: { contentId: query.contentId } } }
            : {}),
        },
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          contentsStatus: true,
          eventType: { select: { id: true, name: true } },
          subject: {
            select: {
              id: true,
              name: true,
              course: { select: { id: true, name: true } },
            },
          },
          contentLinks: {
            select: { content: { select: { id: true, name: true } } },
          },
        },
      }),
    ]);

    return [
      ...blocks.map((block) => ({ type: 'study_block' as const, ...block })),
      ...events.map((event) => ({ type: 'academic_event' as const, ...event })),
    ].sort(
      (left, right) =>
        left.startsAt.getTime() - right.startsAt.getTime() ||
        left.type.localeCompare(right.type) ||
        left.id.localeCompare(right.id),
    );
  }
}
