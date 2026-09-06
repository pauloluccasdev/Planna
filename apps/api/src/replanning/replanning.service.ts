import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AvailabilityService } from '../availability/availability.service.js';
import {
  findIdempotentResult,
  prepareIdempotency,
  recordIdempotentResult,
  throwIdempotencyResultUnavailable,
  type IdempotencyContext,
} from '../common/idempotency.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  BlockSource,
  BlockStatus,
  SessionStatus,
  SuggestionGenerationKind,
  SuggestionStatus,
} from '../generated/prisma/enums.js';
import { OverdueService } from '../overdue/overdue.service.js';
import {
  PLANNING_ALGORITHM_VERSION,
  PLANNING_PARAMETERS,
} from '../planning/planning-engine.js';
import type { UpdateReplanningSuggestionDto } from './dto/update-replanning-suggestion.dto.js';

const activeBlockStatuses = [
  BlockStatus.CONFIRMED,
  BlockStatus.IN_PROGRESS,
  BlockStatus.PAUSED,
  BlockStatus.OVERDUE,
];
const openSuggestionStatuses = [
  SuggestionStatus.GENERATED,
  SuggestionStatus.EDITING,
];
const suggestionLeadSeconds = 300;
const localDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const weekdayNumbers: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};
const localPoint = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const suggestionSelection = {
  id: true,
  status: true,
  generationKind: true,
  suggestedStartsAt: true,
  suggestedEndsAt: true,
  suggestedDurationSeconds: true,
  explanationFactors: true,
  editedAt: true,
  decidedAt: true,
  createdBlockId: true,
  revision: true,
  createdAt: true,
  overdueBlock: {
    select: {
      id: true,
      status: true,
      startsAt: true,
      endsAt: true,
      plannedDurationSeconds: true,
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
  },
} as const;

type Range = { startsAt: Date; endsAt: Date };

function timeText(value: Date) {
  return value.toISOString().slice(11, 19);
}

function remainingSeconds(block: {
  plannedDurationSeconds: number;
  sessions: Array<{ realizedDurationSeconds: number | null }>;
}) {
  const realized = block.sessions.reduce(
    (total, session) => total + (session.realizedDurationSeconds ?? 0),
    0,
  );
  return Math.max(0, block.plannedDurationSeconds - realized);
}

function overlaps(left: Range, right: Range) {
  return left.startsAt < right.endsAt && left.endsAt > right.startsAt;
}

function pointInBrazil(value: Date) {
  const parts = Object.fromEntries(
    localPoint
      .formatToParts(value)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value: partValue }) => [type, partValue]),
  );
  return {
    weekday: weekdayNumbers[parts.weekday],
    seconds:
      Number(parts.hour) * 3600 +
      Number(parts.minute) * 60 +
      Number(parts.second),
  };
}

function databaseTimeSeconds(value: Date) {
  const [hour, minute, second] = timeText(value).split(':').map(Number);
  return hour * 3600 + minute * 60 + second;
}

function weeklyAvailabilityCovers(
  startsAt: Date,
  endsAt: Date,
  intervals: Array<{
    weekday: number;
    startLocalTime: Date;
    endLocalTime: Date;
  }>,
) {
  const start = pointInBrazil(startsAt);
  const end = pointInBrazil(endsAt);
  return (
    startsAt < endsAt &&
    start.weekday === end.weekday &&
    intervals.some(
      (interval) =>
        interval.weekday === start.weekday &&
        databaseTimeSeconds(interval.startLocalTime) <= start.seconds &&
        databaseTimeSeconds(interval.endLocalTime) >= end.seconds,
    )
  );
}

function urgencyScore(priority: number, deadline: Date | undefined, now: Date) {
  const priorityScore =
    ((priority - 1) / 4) * PLANNING_PARAMETERS.priorityWeight;
  const daysUntilDeadline = deadline
    ? Math.max(0, (deadline.getTime() - now.getTime()) / 86_400_000)
    : null;
  const proximity =
    daysUntilDeadline === null
      ? 0
      : 1 -
        Math.min(daysUntilDeadline, PLANNING_PARAMETERS.deadlineHorizonDays) /
          PLANNING_PARAMETERS.deadlineHorizonDays;
  return priorityScore + proximity * PLANNING_PARAMETERS.deadlineWeight;
}

@Injectable()
export class ReplanningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly overdue: OverdueService,
  ) {}

  async list(studentId: string, status?: SuggestionStatus) {
    await this.overdue.reconcileStudent(studentId);
    await this.generateAutomatic(studentId);
    return this.prisma.replanningSuggestion.findMany({
      where: { studentId, ...(status ? { status } : {}) },
      select: suggestionSelection,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
  }

  async get(studentId: string, id: string) {
    await this.overdue.reconcileStudent(studentId);
    const suggestion = await this.prisma.replanningSuggestion.findFirst({
      where: { id, studentId },
      select: suggestionSelection,
    });
    if (!suggestion) this.throwNotFound();
    return suggestion;
  }

  async request(studentId: string, overdueBlockId: string) {
    await this.overdue.reconcileStudent(studentId);
    const existing = await this.prisma.replanningSuggestion.findFirst({
      where: {
        studentId,
        overdueBlockId,
        status: { in: openSuggestionStatuses },
      },
      select: suggestionSelection,
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;
    return this.createSuggestion(
      studentId,
      overdueBlockId,
      SuggestionGenerationKind.STUDENT_REQUESTED,
    );
  }

  async update(
    studentId: string,
    id: string,
    input: UpdateReplanningSuggestionDto,
  ) {
    const suggestion = await this.requireOpen(studentId, id);
    if (suggestion.revision !== input.revision) this.throwVersionConflict();
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    this.validateRange(startsAt, endsAt, suggestion.suggestedDurationSeconds);
    const available = await this.availability.coversInterval(
      studentId,
      startsAt,
      endsAt,
    );
    if (!available) this.throwOutsideAvailability();
    await this.ensureNoConflict(studentId, startsAt, endsAt);
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${studentId}, 0))`;
      const updated = await transaction.replanningSuggestion.updateMany({
        where: {
          id,
          studentId,
          revision: input.revision,
          status: { in: openSuggestionStatuses },
        },
        data: {
          status: SuggestionStatus.EDITING,
          suggestedStartsAt: startsAt,
          suggestedEndsAt: endsAt,
          editedAt: new Date(),
          revision: { increment: 1 },
        },
      });
      if (updated.count !== 1) this.throwVersionConflict();
      return transaction.replanningSuggestion.findUniqueOrThrow({
        where: { id },
        select: suggestionSelection,
      });
    });
  }

  async reject(studentId: string, id: string) {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${studentId}, 0))`;
      const rejected = await transaction.replanningSuggestion.updateMany({
        where: { id, studentId, status: { in: openSuggestionStatuses } },
        data: {
          status: SuggestionStatus.REJECTED,
          decidedAt: new Date(),
          revision: { increment: 1 },
        },
      });
      if (rejected.count !== 1) this.throwNotFound();
      return transaction.replanningSuggestion.findUniqueOrThrow({
        where: { id },
        select: suggestionSelection,
      });
    });
  }

  async accept(studentId: string, id: string, idempotencyKey?: string) {
    const idempotency = prepareIdempotency(
      idempotencyKey,
      'ACCEPT_REPLANNING_SUGGESTION',
      { suggestionId: id },
    );
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${studentId}, 0))`;
      const replay = await this.findIdempotentAcceptance(
        transaction,
        studentId,
        idempotency,
      );
      if (replay) return replay;
      const suggestion = await transaction.replanningSuggestion.findFirst({
        where: { id, studentId, status: { in: openSuggestionStatuses } },
        include: {
          overdueBlock: {
            include: {
              parts: { select: { contentPartId: true } },
            },
          },
        },
      });
      if (!suggestion) {
        throw new ConflictException({
          error: {
            code: 'REPLANNING_SUGGESTION_NOT_ACCEPTABLE',
            message: 'A sugestão não está mais disponível para aceite.',
          },
        });
      }
      if (suggestion.overdueBlock.status !== BlockStatus.OVERDUE) {
        throw new ConflictException({
          error: {
            code: 'OVERDUE_BLOCK_CHANGED',
            message: 'O bloco original não está mais atrasado.',
          },
        });
      }
      const currentAvailability =
        await transaction.availabilityInterval.findMany({
          where: { studentId, active: true },
          select: {
            weekday: true,
            startLocalTime: true,
            endLocalTime: true,
          },
        });
      if (
        !weeklyAvailabilityCovers(
          suggestion.suggestedStartsAt,
          suggestion.suggestedEndsAt,
          currentAvailability,
        )
      )
        this.throwOutsideAvailability();
      const blockConflict = await transaction.studyBlock.findFirst({
        where: {
          studentId,
          status: { in: activeBlockStatuses },
          startsAt: { lt: suggestion.suggestedEndsAt },
          endsAt: { gt: suggestion.suggestedStartsAt },
        },
        select: { id: true },
      });
      const eventConflict = await transaction.academicEvent.findFirst({
        where: {
          studentId,
          deletedAt: null,
          endsAt: { not: null, gt: suggestion.suggestedStartsAt },
          startsAt: { lt: suggestion.suggestedEndsAt },
        },
        select: { id: true },
      });
      if (blockConflict || eventConflict) this.throwScheduleConflict();

      await transaction.studyBlockVersion.create({
        data: {
          studyBlockId: suggestion.overdueBlockId,
          versionNumber: suggestion.overdueBlock.revision,
          changedByUserId: studentId,
          changeReason: 'REPLANNING_ACCEPTED',
          snapshot: {
            status: suggestion.overdueBlock.status,
            startsAt: suggestion.overdueBlock.startsAt.toISOString(),
            endsAt: suggestion.overdueBlock.endsAt.toISOString(),
            plannedDurationSeconds:
              suggestion.overdueBlock.plannedDurationSeconds,
          },
        },
      });
      const replacement = await transaction.studyBlock.create({
        data: {
          studentId,
          contentId: suggestion.overdueBlock.contentId,
          source: BlockSource.REPLANNED,
          status: BlockStatus.CONFIRMED,
          startsAt: suggestion.suggestedStartsAt,
          endsAt: suggestion.suggestedEndsAt,
          plannedDurationSeconds: suggestion.suggestedDurationSeconds,
          focusSeconds: suggestion.overdueBlock.focusSeconds,
          breakSeconds: suggestion.overdueBlock.breakSeconds,
          replacesBlockId: suggestion.overdueBlockId,
          parts: {
            create: suggestion.overdueBlock.parts.map(({ contentPartId }) => ({
              contentPartId,
            })),
          },
        },
      });
      const original = await transaction.studyBlock.update({
        where: { id: suggestion.overdueBlockId },
        data: { status: BlockStatus.REPLANNED, revision: { increment: 1 } },
      });
      const accepted = await transaction.replanningSuggestion.update({
        where: { id },
        data: {
          status: SuggestionStatus.ACCEPTED,
          decidedAt: new Date(),
          createdBlockId: replacement.id,
          revision: { increment: 1 },
        },
        select: suggestionSelection,
      });
      await transaction.auditEvent.create({
        data: {
          actorUserId: studentId,
          studentScopeId: studentId,
          action: 'REPLANNING_SUGGESTION_ACCEPTED',
          entityType: 'REPLANNING_SUGGESTION',
          entityId: suggestion.id,
          metadata: {
            originalBlockId: original.id,
            replacementBlockId: replacement.id,
          },
        },
      });
      await recordIdempotentResult(transaction, studentId, idempotency, {
        suggestionId: suggestion.id,
        originalBlockId: original.id,
        replacementBlockId: replacement.id,
      });
      return { suggestion: accepted, originalBlock: original, replacement };
    });
  }

  private async findIdempotentAcceptance(
    transaction: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    studentId: string,
    context: IdempotencyContext | null,
  ) {
    const reference = await findIdempotentResult(
      transaction,
      studentId,
      context,
    );
    if (!reference) return null;
    const suggestionId =
      typeof reference.suggestionId === 'string'
        ? reference.suggestionId
        : null;
    const originalBlockId =
      typeof reference.originalBlockId === 'string'
        ? reference.originalBlockId
        : null;
    const replacementBlockId =
      typeof reference.replacementBlockId === 'string'
        ? reference.replacementBlockId
        : null;
    if (!suggestionId || !originalBlockId || !replacementBlockId) {
      throwIdempotencyResultUnavailable();
    }
    const [suggestion, originalBlock, replacement] = await Promise.all([
      transaction.replanningSuggestion.findFirst({
        where: {
          id: suggestionId,
          studentId,
          status: SuggestionStatus.ACCEPTED,
        },
        select: suggestionSelection,
      }),
      transaction.studyBlock.findFirst({
        where: { id: originalBlockId, studentId },
      }),
      transaction.studyBlock.findFirst({
        where: { id: replacementBlockId, studentId },
      }),
    ]);
    if (!suggestion || !originalBlock || !replacement) {
      throwIdempotencyResultUnavailable();
    }
    return { suggestion, originalBlock, replacement };
  }

  private async generateAutomatic(studentId: string) {
    const now = new Date();
    const blocks = await this.prisma.studyBlock.findMany({
      where: {
        studentId,
        status: BlockStatus.OVERDUE,
        replanningSuggestions: {
          none: { generationKind: SuggestionGenerationKind.AUTOMATIC_FIRST },
        },
      },
      select: {
        id: true,
        endsAt: true,
        content: {
          select: {
            priority: true,
            academicEventLinks: {
              where: {
                academicEvent: {
                  studentId,
                  deletedAt: null,
                  startsAt: { gt: now },
                },
              },
              select: {
                academicEvent: { select: { startsAt: true } },
              },
              orderBy: { academicEvent: { startsAt: 'asc' } },
              take: 1,
            },
          },
        },
      },
      orderBy: [{ endsAt: 'asc' }, { id: 'asc' }],
    });
    const prioritizedBlocks = blocks.toSorted((left, right) => {
      const leftDeadline =
        left.content.academicEventLinks[0]?.academicEvent.startsAt;
      const rightDeadline =
        right.content.academicEventLinks[0]?.academicEvent.startsAt;
      return (
        urgencyScore(right.content.priority, rightDeadline, now) -
          urgencyScore(left.content.priority, leftDeadline, now) ||
        left.endsAt.getTime() - right.endsAt.getTime() ||
        left.id.localeCompare(right.id)
      );
    });
    for (const block of prioritizedBlocks) {
      try {
        await this.createSuggestion(
          studentId,
          block.id,
          SuggestionGenerationKind.AUTOMATIC_FIRST,
        );
      } catch (error) {
        const code =
          error instanceof ConflictException
            ? (error.getResponse() as { error?: { code?: string } }).error?.code
            : undefined;
        if (
          ![
            'REPLANNING_CAPACITY_UNAVAILABLE',
            'OVERDUE_BLOCK_HAS_NO_REMAINING_TIME',
          ].includes(code ?? '')
        )
          throw error;
      }
    }
  }

  private async createSuggestion(
    studentId: string,
    overdueBlockId: string,
    generationKind: SuggestionGenerationKind,
  ) {
    const block = await this.prisma.studyBlock.findFirst({
      where: { id: overdueBlockId, studentId, status: BlockStatus.OVERDUE },
      select: {
        id: true,
        plannedDurationSeconds: true,
        content: {
          select: {
            priority: true,
            academicEventLinks: {
              where: {
                academicEvent: {
                  studentId,
                  deletedAt: null,
                  startsAt: { gt: new Date() },
                },
              },
              select: {
                academicEvent: { select: { id: true, startsAt: true } },
              },
              orderBy: { academicEvent: { startsAt: 'asc' } },
              take: 1,
            },
          },
        },
        sessions: {
          where: { status: SessionStatus.COMPLETED },
          select: { realizedDurationSeconds: true },
        },
      },
    });
    if (!block) {
      throw new NotFoundException({
        error: {
          code: 'OVERDUE_BLOCK_NOT_FOUND',
          message: 'Bloco atrasado não encontrado.',
        },
      });
    }
    const durationSeconds = remainingSeconds(block);
    if (durationSeconds <= 0) {
      throw new ConflictException({
        error: {
          code: 'OVERDUE_BLOCK_HAS_NO_REMAINING_TIME',
          message: 'O bloco atrasado não possui tempo restante.',
        },
      });
    }
    const slot = await this.findFirstSlot(studentId, durationSeconds);
    if (!slot) {
      throw new ConflictException({
        error: {
          code: 'REPLANNING_CAPACITY_UNAVAILABLE',
          message:
            'Não há um intervalo disponível que comporte o tempo restante.',
        },
      });
    }
    const event = block.content.academicEventLinks[0]?.academicEvent;
    try {
      return await this.prisma.replanningSuggestion.create({
        data: {
          studentId,
          overdueBlockId,
          generationKind,
          suggestedStartsAt: slot.startsAt,
          suggestedEndsAt: slot.endsAt,
          suggestedDurationSeconds: durationSeconds,
          explanationFactors: {
            algorithmVersion: PLANNING_ALGORITHM_VERSION,
            reason: 'OVERDUE_BLOCK',
            remainingDurationSeconds: durationSeconds,
            priority: block.content.priority,
            deadline: event?.startsAt.toISOString() ?? null,
            academicEventId: event?.id ?? null,
            suggestionLeadSeconds,
          },
        },
        select: suggestionSelection,
      });
    } catch (error) {
      if (
        generationKind === SuggestionGenerationKind.AUTOMATIC_FIRST &&
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.replanningSuggestion.findFirst({
          where: { studentId, overdueBlockId, generationKind },
          select: suggestionSelection,
        });
        if (existing) return existing;
      }
      throw error;
    }
  }

  private async findFirstSlot(
    studentId: string,
    durationSeconds: number,
  ): Promise<Range | null> {
    const now = new Date();
    const earliestStart = new Date(
      Math.ceil(now.getTime() / 60_000) * 60_000 + suggestionLeadSeconds * 1000,
    );
    const [availability, blocks, events, suggestions] = await Promise.all([
      this.prisma.availabilityInterval.findMany({
        where: { studentId, active: true },
        select: { weekday: true, startLocalTime: true, endLocalTime: true },
        orderBy: [{ weekday: 'asc' }, { startLocalTime: 'asc' }],
      }),
      this.prisma.studyBlock.findMany({
        where: {
          studentId,
          status: { in: activeBlockStatuses },
          endsAt: { gt: now },
        },
        select: { startsAt: true, endsAt: true },
      }),
      this.prisma.academicEvent.findMany({
        where: {
          studentId,
          deletedAt: null,
          endsAt: { not: null, gt: now },
        },
        select: { startsAt: true, endsAt: true },
      }),
      this.prisma.replanningSuggestion.findMany({
        where: { studentId, status: { in: openSuggestionStatuses } },
        select: { suggestedStartsAt: true, suggestedEndsAt: true },
      }),
    ]);
    const occupied: Range[] = [
      ...blocks,
      ...events.flatMap(({ startsAt, endsAt }) =>
        endsAt ? [{ startsAt, endsAt }] : [],
      ),
      ...suggestions.map(({ suggestedStartsAt, suggestedEndsAt }) => ({
        startsAt: suggestedStartsAt,
        endsAt: suggestedEndsAt,
      })),
    ];
    if (
      !availability.some(
        ({ startLocalTime, endLocalTime }) =>
          (endLocalTime.getTime() - startLocalTime.getTime()) / 1000 >=
          durationSeconds,
      )
    ) {
      return null;
    }
    const firstCivil = new Date(`${localDate.format(earliestStart)}T12:00:00Z`);
    const latestOccupiedEnd = occupied.reduce(
      (latest, range) => Math.max(latest, range.endsAt.getTime()),
      now.getTime(),
    );
    const lastCivil = new Date(
      `${localDate.format(new Date(latestOccupiedEnd))}T12:00:00Z`,
    );
    const searchDays =
      Math.ceil((lastCivil.getTime() - firstCivil.getTime()) / 86_400_000) + 7;
    for (let offset = 0; offset <= searchDays; offset += 1) {
      const day = new Date(firstCivil);
      day.setUTCDate(firstCivil.getUTCDate() + offset);
      const civil = day.toISOString().slice(0, 10);
      for (const interval of availability.filter(
        ({ weekday }) => weekday === day.getUTCDay(),
      )) {
        const intervalStart = new Date(
          `${civil}T${timeText(interval.startLocalTime)}-03:00`,
        );
        const intervalEnd = new Date(
          `${civil}T${timeText(interval.endLocalTime)}-03:00`,
        );
        let cursor = new Date(
          Math.max(earliestStart.getTime(), intervalStart.getTime()),
        );
        for (const busy of occupied
          .filter((range) =>
            overlaps(range, { startsAt: cursor, endsAt: intervalEnd }),
          )
          .toSorted(
            (left, right) => left.startsAt.getTime() - right.startsAt.getTime(),
          )) {
          if (
            busy.startsAt.getTime() - cursor.getTime() >=
            durationSeconds * 1000
          ) {
            return {
              startsAt: cursor,
              endsAt: new Date(cursor.getTime() + durationSeconds * 1000),
            };
          }
          if (busy.endsAt > cursor) cursor = new Date(busy.endsAt);
        }
        if (
          intervalEnd.getTime() - cursor.getTime() >=
          durationSeconds * 1000
        ) {
          return {
            startsAt: cursor,
            endsAt: new Date(cursor.getTime() + durationSeconds * 1000),
          };
        }
      }
    }
    return null;
  }

  private async requireOpen(studentId: string, id: string) {
    const suggestion = await this.prisma.replanningSuggestion.findFirst({
      where: { id, studentId, status: { in: openSuggestionStatuses } },
      select: suggestionSelection,
    });
    if (!suggestion) this.throwNotFound();
    return suggestion;
  }

  private validateRange(
    startsAt: Date,
    endsAt: Date,
    requiredDurationSeconds: number,
  ) {
    if (
      startsAt <= new Date() ||
      startsAt >= endsAt ||
      (endsAt.getTime() - startsAt.getTime()) / 1000 !== requiredDurationSeconds
    ) {
      throw new UnprocessableEntityException({
        error: {
          code: 'INVALID_REPLANNING_RANGE',
          message:
            'Escolha um horário futuro que preserve todo o tempo restante.',
        },
      });
    }
  }

  private async ensureNoConflict(
    studentId: string,
    startsAt: Date,
    endsAt: Date,
  ) {
    const [block, event] = await Promise.all([
      this.prisma.studyBlock.findFirst({
        where: {
          studentId,
          status: { in: activeBlockStatuses },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        select: { id: true },
      }),
      this.prisma.academicEvent.findFirst({
        where: {
          studentId,
          deletedAt: null,
          endsAt: { not: null, gt: startsAt },
          startsAt: { lt: endsAt },
        },
        select: { id: true },
      }),
    ]);
    if (block || event) this.throwScheduleConflict();
  }

  private throwNotFound(): never {
    throw new NotFoundException({
      error: {
        code: 'REPLANNING_SUGGESTION_NOT_FOUND',
        message: 'Sugestão de replanejamento não encontrada.',
      },
    });
  }

  private throwVersionConflict(): never {
    throw new ConflictException({
      error: {
        code: 'RESOURCE_VERSION_CONFLICT',
        message: 'A sugestão foi alterada. Recarregue antes de editar.',
      },
    });
  }

  private throwOutsideAvailability(): never {
    throw new ConflictException({
      error: {
        code: 'BLOCK_OUTSIDE_AVAILABILITY',
        message: 'O novo horário está fora da disponibilidade semanal.',
      },
    });
  }

  private throwScheduleConflict(): never {
    throw new ConflictException({
      error: {
        code: 'REPLANNING_SCHEDULE_CONFLICT',
        message: 'O novo horário conflita com a agenda atual.',
      },
    });
  }
}
