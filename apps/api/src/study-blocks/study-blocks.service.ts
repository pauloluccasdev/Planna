import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AvailabilityService } from '../availability/availability.service.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import {
  BlockSource,
  BlockStatus,
  SessionStatus,
} from '../generated/prisma/enums.js';
import { OverdueService } from '../overdue/overdue.service.js';
import type { CreateStudyBlockDto } from './dto/create-study-block.dto.js';
import type { CreateRecurringStudyBlockDto } from './dto/create-recurring-study-block.dto.js';
import type { ListStudyBlocksQueryDto } from './dto/list-study-blocks-query.dto.js';
import type { UpdateStudyBlockDto } from './dto/update-study-block.dto.js';

const activeBlockStatuses = [
  BlockStatus.CONFIRMED,
  BlockStatus.IN_PROGRESS,
  BlockStatus.PAUSED,
  BlockStatus.OVERDUE,
];
const retroactiveEligibleBlockStatuses = [
  BlockStatus.CONFIRMED,
  BlockStatus.OVERDUE,
];
const finalBlockStatuses = new Set<BlockStatus>([
  BlockStatus.COMPLETED,
  BlockStatus.CANCELLED,
  BlockStatus.REPLANNED,
]);

const blockSelection = {
  id: true,
  contentId: true,
  recurrenceSeriesId: true,
  source: true,
  status: true,
  startsAt: true,
  endsAt: true,
  plannedDurationSeconds: true,
  focusSeconds: true,
  breakSeconds: true,
  revision: true,
  cancelledAt: true,
  completedAt: true,
  content: {
    select: {
      id: true,
      name: true,
      priority: true,
      subject: {
        select: {
          id: true,
          name: true,
          courseId: true,
          course: { select: { id: true, name: true } },
        },
      },
    },
  },
  parts: {
    select: {
      contentPart: { select: { id: true, name: true, position: true } },
    },
  },
  createdAt: true,
  updatedAt: true,
} as const;

const brazilDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

@Injectable()
export class StudyBlocksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly overdue: OverdueService,
  ) {}

  async list(studentId: string, query: ListStudyBlocksQueryDto) {
    await this.overdue.reconcileStudent(studentId);
    return this.prisma.studyBlock.findMany({
      where: {
        studentId,
        ...(query.from ? { endsAt: { gte: new Date(query.from) } } : {}),
        ...(query.to ? { startsAt: { lte: new Date(query.to) } } : {}),
        ...(query.retroactiveEligible === 'true'
          ? {
              status: { in: retroactiveEligibleBlockStatuses },
              sessions: { none: {} },
            }
          : {}),
      },
      select: blockSelection,
      orderBy: { startsAt: 'asc' },
    });
  }

  async get(studentId: string, id: string) {
    await this.overdue.reconcileStudent(studentId);
    const block = await this.prisma.studyBlock.findFirst({
      where: { id, studentId },
      select: blockSelection,
    });
    if (!block) this.throwNotFound();
    return block;
  }

  async create(studentId: string, input: CreateStudyBlockDto) {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (startsAt >= endsAt) {
      throw new UnprocessableEntityException({
        error: {
          code: 'INVALID_STUDY_BLOCK_RANGE',
          message: 'O término deve ser posterior ao início.',
        },
      });
    }
    const durationSeconds = (endsAt.getTime() - startsAt.getTime()) / 1000;
    if (!Number.isSafeInteger(durationSeconds)) {
      throw new UnprocessableEntityException({
        error: {
          code: 'INVALID_STUDY_BLOCK_DURATION',
          message: 'A duração deve usar segundos inteiros.',
        },
      });
    }

    const [content, isAvailable, pomodoro] = await Promise.all([
      this.prisma.content.findFirst({
        where: { id: input.contentId, studentId, archivedAt: null },
        select: { id: true },
      }),
      this.availability.coversInterval(studentId, startsAt, endsAt),
      this.resolvePomodoro(studentId, input),
    ]);
    if (!content) {
      throw new NotFoundException({
        error: {
          code: 'CONTENT_NOT_FOUND',
          message: 'Conteúdo não encontrado.',
        },
      });
    }
    if (!isAvailable) {
      throw new ConflictException({
        error: {
          code: 'BLOCK_OUTSIDE_AVAILABILITY',
          message: 'O bloco está fora da disponibilidade semanal.',
          details: { canExpandAvailability: true },
        },
      });
    }
    await this.validateParts(studentId, input.contentId, input.partIds ?? []);

    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${studentId}, 0))`;
      const [blockConflict, eventConflict] = await Promise.all([
        transaction.studyBlock.findFirst({
          where: {
            studentId,
            status: { in: activeBlockStatuses },
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
          select: { id: true },
        }),
        transaction.academicEvent.findFirst({
          where: {
            studentId,
            deletedAt: null,
            endsAt: { not: null, gt: startsAt },
            startsAt: { lt: endsAt },
          },
          select: { id: true, title: true },
        }),
      ]);
      if (blockConflict) {
        throw new ConflictException({
          error: {
            code: 'STUDY_BLOCK_CONFLICT',
            message: 'Já existe um bloco de estudo nesse horário.',
            details: { blockId: blockConflict.id },
          },
        });
      }
      if (eventConflict) {
        throw new ConflictException({
          error: {
            code: 'ACADEMIC_EVENT_CONFLICT',
            message: 'Existe um evento acadêmico que reserva esse horário.',
            details: { eventId: eventConflict.id },
          },
        });
      }

      return transaction.studyBlock.create({
        data: {
          studentId,
          contentId: input.contentId,
          source: BlockSource.MANUAL,
          status: BlockStatus.CONFIRMED,
          startsAt,
          endsAt,
          plannedDurationSeconds: durationSeconds,
          focusSeconds: pomodoro.focusSeconds,
          breakSeconds: pomodoro.breakSeconds,
          parts: {
            create: (input.partIds ?? []).map((contentPartId) => ({
              contentPartId,
            })),
          },
        },
        select: blockSelection,
      });
    });
  }

  async createDailyRecurrence(
    studentId: string,
    input: CreateRecurringStudyBlockDto,
  ) {
    const firstStart = new Date(input.startsAt);
    const firstEnd = new Date(input.endsAt);
    if (firstStart >= firstEnd) {
      throw new UnprocessableEntityException({
        error: {
          code: 'INVALID_STUDY_BLOCK_RANGE',
          message: 'O término deve ser posterior ao início.',
        },
      });
    }
    const firstCivilDate = brazilDate.format(firstStart);
    if (input.repeatUntil < firstCivilDate) {
      throw new UnprocessableEntityException({
        error: {
          code: 'INVALID_RECURRENCE_RANGE',
          message: 'A repetição deve terminar na data inicial ou depois dela.',
        },
      });
    }
    const durationMilliseconds = firstEnd.getTime() - firstStart.getTime();
    const durationSeconds = durationMilliseconds / 1000;
    if (!Number.isSafeInteger(durationSeconds)) {
      throw new UnprocessableEntityException({
        error: {
          code: 'INVALID_STUDY_BLOCK_DURATION',
          message: 'A duração deve usar segundos inteiros.',
        },
      });
    }
    const occurrences: Array<{ startsAt: Date; endsAt: Date }> = [];
    for (
      let startsAt = firstStart;
      brazilDate.format(startsAt) <= input.repeatUntil;
      startsAt = new Date(startsAt.getTime() + 24 * 60 * 60 * 1000)
    ) {
      occurrences.push({
        startsAt,
        endsAt: new Date(startsAt.getTime() + durationMilliseconds),
      });
      if (occurrences.length > 366) {
        throw new UnprocessableEntityException({
          error: {
            code: 'RECURRENCE_TOO_LONG',
            message: 'Uma série diária pode conter no máximo 366 blocos.',
          },
        });
      }
    }

    const [content, pomodoro, coverage] = await Promise.all([
      this.prisma.content.findFirst({
        where: { id: input.contentId, studentId, archivedAt: null },
        select: { id: true },
      }),
      this.resolvePomodoro(studentId, input),
      this.availability.coversIntervals(studentId, occurrences),
    ]);
    if (!content) {
      throw new NotFoundException({
        error: {
          code: 'CONTENT_NOT_FOUND',
          message: 'Conteúdo não encontrado.',
        },
      });
    }
    const unavailableIndex = coverage.findIndex((covered) => !covered);
    if (unavailableIndex >= 0) {
      throw new ConflictException({
        error: {
          code: 'RECURRENCE_OUTSIDE_AVAILABILITY',
          message: 'Ao menos uma ocorrência está fora da disponibilidade.',
          details: {
            startsAt: occurrences[unavailableIndex].startsAt.toISOString(),
            canExpandAvailability: true,
          },
        },
      });
    }
    await this.validateParts(studentId, input.contentId, input.partIds ?? []);

    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${studentId}, 0))`;
      const overlapConditions = occurrences.map(({ startsAt, endsAt }) => ({
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      }));
      const [blockConflict, eventConflict] = await Promise.all([
        transaction.studyBlock.findFirst({
          where: {
            studentId,
            status: { in: activeBlockStatuses },
            OR: overlapConditions,
          },
          select: { id: true, startsAt: true },
        }),
        transaction.academicEvent.findFirst({
          where: {
            studentId,
            deletedAt: null,
            endsAt: { not: null },
            OR: overlapConditions,
          },
          select: { id: true, title: true, startsAt: true },
        }),
      ]);
      if (blockConflict) {
        throw new ConflictException({
          error: {
            code: 'STUDY_BLOCK_CONFLICT',
            message: 'Uma ocorrência conflita com outro bloco de estudo.',
            details: { blockId: blockConflict.id },
          },
        });
      }
      if (eventConflict) {
        throw new ConflictException({
          error: {
            code: 'ACADEMIC_EVENT_CONFLICT',
            message: 'Uma ocorrência conflita com um evento acadêmico.',
            details: { eventId: eventConflict.id },
          },
        });
      }
      const series = await transaction.recurrenceSeries.create({
        data: {
          studentId,
          startsOn: new Date(`${firstCivilDate}T00:00:00.000Z`),
          endsOn: new Date(`${input.repeatUntil}T00:00:00.000Z`),
        },
        select: { id: true },
      });
      const blocks = occurrences.map(({ startsAt, endsAt }) => ({
        id: randomUUID(),
        studentId,
        contentId: input.contentId,
        recurrenceSeriesId: series.id,
        source: BlockSource.MANUAL,
        status: BlockStatus.CONFIRMED,
        startsAt,
        endsAt,
        plannedDurationSeconds: durationSeconds,
        focusSeconds: pomodoro.focusSeconds,
        breakSeconds: pomodoro.breakSeconds,
      }));
      await transaction.studyBlock.createMany({ data: blocks });
      const partIds = input.partIds ?? [];
      if (partIds.length > 0) {
        await transaction.studyBlockPart.createMany({
          data: blocks.flatMap((block) =>
            partIds.map((contentPartId) => ({
              studyBlockId: block.id,
              contentPartId,
            })),
          ),
        });
      }
      return transaction.studyBlock.findMany({
        where: { id: { in: blocks.map(({ id }) => id) } },
        select: blockSelection,
        orderBy: { startsAt: 'asc' },
      });
    });
  }

  async update(studentId: string, id: string, input: UpdateStudyBlockDto) {
    const current = await this.get(studentId, id);
    if (
      current.status !== BlockStatus.CONFIRMED ||
      current.startsAt <= new Date()
    ) {
      throw new ConflictException({
        error: {
          code: 'STUDY_BLOCK_NOT_EDITABLE',
          message: 'Somente blocos futuros confirmados podem ser editados.',
        },
      });
    }

    const contentId = input.contentId ?? current.contentId;
    const startsAt = input.startsAt
      ? new Date(input.startsAt)
      : current.startsAt;
    const endsAt = input.endsAt ? new Date(input.endsAt) : current.endsAt;
    if (startsAt >= endsAt) {
      throw new UnprocessableEntityException({
        error: {
          code: 'INVALID_STUDY_BLOCK_RANGE',
          message: 'O término deve ser posterior ao início.',
        },
      });
    }
    if (startsAt <= new Date()) {
      throw new UnprocessableEntityException({
        error: {
          code: 'STUDY_BLOCK_MUST_BE_FUTURE',
          message: 'O bloco editado deve continuar no futuro.',
        },
      });
    }
    if (
      (input.focusSeconds === undefined) !==
      (input.breakSeconds === undefined)
    ) {
      throw new UnprocessableEntityException({
        error: {
          code: 'INCOMPLETE_POMODORO_CONFIGURATION',
          message: 'Informe os tempos de foco e pausa juntos.',
        },
      });
    }
    const focusSeconds = input.focusSeconds ?? current.focusSeconds;
    const breakSeconds = input.breakSeconds ?? current.breakSeconds;
    const partIds =
      input.partIds ?? current.parts.map(({ contentPart }) => contentPart.id);
    const durationSeconds = (endsAt.getTime() - startsAt.getTime()) / 1000;
    if (!Number.isSafeInteger(durationSeconds)) {
      throw new UnprocessableEntityException({
        error: {
          code: 'INVALID_STUDY_BLOCK_DURATION',
          message: 'A duração deve usar segundos inteiros.',
        },
      });
    }

    const [content, isAvailable] = await Promise.all([
      this.prisma.content.findFirst({
        where: { id: contentId, studentId, archivedAt: null },
        select: { id: true },
      }),
      this.availability.coversInterval(studentId, startsAt, endsAt),
    ]);
    if (!content) {
      throw new NotFoundException({
        error: {
          code: 'CONTENT_NOT_FOUND',
          message: 'Conteúdo não encontrado.',
        },
      });
    }
    if (!isAvailable) {
      throw new ConflictException({
        error: {
          code: 'BLOCK_OUTSIDE_AVAILABILITY',
          message: 'O bloco está fora da disponibilidade semanal.',
          details: { canExpandAvailability: true },
        },
      });
    }
    await this.validateParts(studentId, contentId, partIds);

    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${studentId}, 0))`;
      const locked = await transaction.studyBlock.findFirst({
        where: { id, studentId },
        select: blockSelection,
      });
      if (!locked) this.throwNotFound();
      if (locked.revision !== input.revision) {
        throw new ConflictException({
          error: {
            code: 'RESOURCE_VERSION_CONFLICT',
            message: 'Este bloco foi alterado. Recarregue antes de editar.',
            details: { currentRevision: locked.revision },
          },
        });
      }
      if (
        locked.status !== BlockStatus.CONFIRMED ||
        locked.startsAt <= new Date()
      ) {
        throw new ConflictException({
          error: {
            code: 'STUDY_BLOCK_NOT_EDITABLE',
            message: 'Somente blocos futuros confirmados podem ser editados.',
          },
        });
      }
      const [blockConflict, eventConflict] = await Promise.all([
        transaction.studyBlock.findFirst({
          where: {
            id: { not: id },
            studentId,
            status: { in: activeBlockStatuses },
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
          select: { id: true },
        }),
        transaction.academicEvent.findFirst({
          where: {
            studentId,
            deletedAt: null,
            endsAt: { not: null, gt: startsAt },
            startsAt: { lt: endsAt },
          },
          select: { id: true },
        }),
      ]);
      if (blockConflict) {
        throw new ConflictException({
          error: {
            code: 'STUDY_BLOCK_CONFLICT',
            message: 'Já existe um bloco de estudo nesse horário.',
            details: { blockId: blockConflict.id },
          },
        });
      }
      if (eventConflict) {
        throw new ConflictException({
          error: {
            code: 'ACADEMIC_EVENT_CONFLICT',
            message: 'Existe um evento acadêmico que reserva esse horário.',
            details: { eventId: eventConflict.id },
          },
        });
      }

      await transaction.studyBlockVersion.create({
        data: {
          studyBlockId: id,
          versionNumber: locked.revision,
          changedByUserId: studentId,
          changeReason: 'MANUAL_EDIT',
          snapshot: {
            contentId: locked.contentId,
            startsAt: locked.startsAt.toISOString(),
            endsAt: locked.endsAt.toISOString(),
            plannedDurationSeconds: locked.plannedDurationSeconds,
            focusSeconds: locked.focusSeconds,
            breakSeconds: locked.breakSeconds,
            partIds: locked.parts.map(({ contentPart }) => contentPart.id),
            status: locked.status,
          },
        },
      });
      if (input.partIds !== undefined || input.contentId !== undefined) {
        await transaction.studyBlockPart.deleteMany({
          where: { studyBlockId: id },
        });
        if (partIds.length > 0) {
          await transaction.studyBlockPart.createMany({
            data: partIds.map((contentPartId) => ({
              studyBlockId: id,
              contentPartId,
            })),
          });
        }
      }
      return transaction.studyBlock.update({
        where: { id },
        data: {
          contentId,
          startsAt,
          endsAt,
          plannedDurationSeconds: durationSeconds,
          focusSeconds,
          breakSeconds,
          revision: { increment: 1 },
        },
        select: blockSelection,
      });
    });
  }

  async history(studentId: string, id: string) {
    await this.get(studentId, id);
    return this.prisma.studyBlockVersion.findMany({
      where: { studyBlockId: id },
      select: {
        id: true,
        versionNumber: true,
        changedAt: true,
        changeReason: true,
        snapshot: true,
      },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async cancel(studentId: string, id: string) {
    const block = await this.get(studentId, id);
    if (finalBlockStatuses.has(block.status)) {
      throw new ConflictException({
        error: {
          code: 'STUDY_BLOCK_NOT_CANCELLABLE',
          message: 'Este bloco não pode ser cancelado.',
        },
      });
    }
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${studentId}, 0))`;
      const current = await transaction.studyBlock.findFirst({
        where: { id, studentId },
        select: { id: true, contentId: true, status: true },
      });
      if (!current) this.throwNotFound();
      if (finalBlockStatuses.has(current.status)) {
        throw new ConflictException({
          error: {
            code: 'STUDY_BLOCK_NOT_CANCELLABLE',
            message: 'Este bloco não pode ser cancelado.',
          },
        });
      }
      const cancelledAt = new Date();
      const cancelled = await transaction.studyBlock.update({
        where: { id },
        data: {
          status: BlockStatus.CANCELLED,
          cancelledAt,
          revision: { increment: 1 },
        },
        select: blockSelection,
      });
      const uncoveredContents = await this.findUncoveredContents(
        transaction,
        studentId,
        [current.contentId],
        cancelledAt,
      );
      return { ...cancelled, warnings: { uncoveredContents } };
    });
  }

  async cancelSeries(studentId: string, seriesId: string) {
    const series = await this.prisma.recurrenceSeries.findFirst({
      where: { id: seriesId, studentId },
      select: { id: true },
    });
    if (!series) {
      throw new NotFoundException({
        error: {
          code: 'RECURRENCE_SERIES_NOT_FOUND',
          message: 'Série recorrente não encontrada.',
        },
      });
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${studentId}, 0))`;
      const cancelledAt = new Date();
      const affectedContents = await transaction.studyBlock.findMany({
        where: {
          studentId,
          recurrenceSeriesId: seriesId,
          status: { in: activeBlockStatuses },
        },
        select: { contentId: true },
        distinct: ['contentId'],
      });
      const result = await transaction.studyBlock.updateMany({
        where: {
          studentId,
          recurrenceSeriesId: seriesId,
          status: { in: activeBlockStatuses },
        },
        data: {
          status: BlockStatus.CANCELLED,
          cancelledAt,
          revision: { increment: 1 },
        },
      });
      const uncoveredContents = await this.findUncoveredContents(
        transaction,
        studentId,
        affectedContents.map(({ contentId }) => contentId),
        cancelledAt,
      );
      return {
        seriesId,
        cancelledBlocks: result.count,
        cancelledAt,
        warnings: { uncoveredContents },
      };
    });
  }

  private async findUncoveredContents(
    client: PrismaService | Prisma.TransactionClient,
    studentId: string,
    contentIds: string[],
    now: Date,
  ) {
    const uniqueContentIds = [...new Set(contentIds)];
    if (uniqueContentIds.length === 0) return [];
    const [contents, completedParts, futureBlockGroups] = await Promise.all([
      client.content.findMany({
        where: {
          id: { in: uniqueContentIds },
          studentId,
          archivedAt: null,
        },
        select: {
          id: true,
          name: true,
          manuallyCompletedAt: true,
          parts: {
            where: { archivedAt: null },
            select: { id: true },
          },
        },
      }),
      client.studySessionCompletedPart.findMany({
        where: {
          contentPart: {
            contentId: { in: uniqueContentIds },
            archivedAt: null,
          },
          studySession: { studentId, status: SessionStatus.COMPLETED },
        },
        select: {
          contentPartId: true,
          contentPart: { select: { contentId: true } },
        },
        distinct: ['contentPartId'],
      }),
      client.studyBlock.groupBy({
        by: ['contentId'],
        where: {
          studentId,
          contentId: { in: uniqueContentIds },
          endsAt: { gt: now },
          status: { in: activeBlockStatuses },
        },
        _count: { _all: true },
      }),
    ]);
    const completedPartIds = new Set(
      completedParts.map(({ contentPartId }) => contentPartId),
    );
    const coveredContentIds = new Set(
      futureBlockGroups.map(({ contentId }) => contentId),
    );
    return contents
      .filter((content) => {
        const completed =
          content.parts.length > 0
            ? content.parts.every(({ id: partId }) =>
                completedPartIds.has(partId),
              )
            : content.manuallyCompletedAt !== null;
        return !completed && !coveredContentIds.has(content.id);
      })
      .map(({ id: contentId, name }) => ({ contentId, name }));
  }

  private async resolvePomodoro(studentId: string, input: CreateStudyBlockDto) {
    if (
      (input.focusSeconds === undefined) !==
      (input.breakSeconds === undefined)
    ) {
      throw new UnprocessableEntityException({
        error: {
          code: 'INCOMPLETE_POMODORO_CONFIGURATION',
          message: 'Informe os tempos de foco e pausa juntos.',
        },
      });
    }
    if (input.focusSeconds !== undefined && input.breakSeconds !== undefined) {
      return {
        focusSeconds: input.focusSeconds,
        breakSeconds: input.breakSeconds,
      };
    }
    const preference = await this.prisma.pomodoroPreference.findUnique({
      where: { studentId },
      select: { focusSeconds: true, breakSeconds: true },
    });
    if (!preference) {
      throw new UnprocessableEntityException({
        error: {
          code: 'POMODORO_PREFERENCE_REQUIRED',
          message:
            'Configure o Pomodoro padrão ou informe os tempos deste bloco.',
        },
      });
    }
    return preference;
  }

  private async validateParts(
    studentId: string,
    contentId: string,
    partIds: string[],
  ) {
    if (partIds.length === 0) return;
    const count = await this.prisma.contentPart.count({
      where: { id: { in: partIds }, studentId, contentId, archivedAt: null },
    });
    if (count !== partIds.length) {
      throw new UnprocessableEntityException({
        error: {
          code: 'INVALID_STUDY_BLOCK_PARTS',
          message: 'Todas as partes devem pertencer ao conteúdo do bloco.',
        },
      });
    }
  }

  private throwNotFound(): never {
    throw new NotFoundException({
      error: {
        code: 'STUDY_BLOCK_NOT_FOUND',
        message: 'Bloco de estudo não encontrado.',
      },
    });
  }
}
