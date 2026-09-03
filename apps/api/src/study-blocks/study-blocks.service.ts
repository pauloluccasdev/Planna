import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AvailabilityService } from '../availability/availability.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { BlockSource, BlockStatus } from '../generated/prisma/enums.js';
import type { CreateStudyBlockDto } from './dto/create-study-block.dto.js';
import type { ListStudyBlocksQueryDto } from './dto/list-study-blocks-query.dto.js';

const activeBlockStatuses = [
  BlockStatus.CONFIRMED,
  BlockStatus.IN_PROGRESS,
  BlockStatus.PAUSED,
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
  source: true,
  status: true,
  startsAt: true,
  endsAt: true,
  plannedDurationSeconds: true,
  focusSeconds: true,
  breakSeconds: true,
  revision: true,
  content: {
    select: {
      id: true,
      name: true,
      priority: true,
      subject: { select: { id: true, name: true, courseId: true } },
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

@Injectable()
export class StudyBlocksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
  ) {}

  list(studentId: string, query: ListStudyBlocksQueryDto) {
    return this.prisma.studyBlock.findMany({
      where: {
        studentId,
        ...(query.from ? { endsAt: { gte: new Date(query.from) } } : {}),
        ...(query.to ? { startsAt: { lte: new Date(query.to) } } : {}),
      },
      select: blockSelection,
      orderBy: { startsAt: 'asc' },
    });
  }

  async get(studentId: string, id: string) {
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
    return this.prisma.studyBlock.update({
      where: { id },
      data: {
        status: BlockStatus.CANCELLED,
        cancelledAt: new Date(),
        revision: { increment: 1 },
      },
      select: blockSelection,
    });
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
