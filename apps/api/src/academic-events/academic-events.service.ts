import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { EventContentsStatus } from '../generated/prisma/enums.js';
import type { CreateAcademicEventDto } from './dto/create-academic-event.dto.js';
import type { ListAcademicEventsQueryDto } from './dto/list-academic-events-query.dto.js';
import type { SetAcademicEventContentsDto } from './dto/set-academic-event-contents.dto.js';
import type { UpdateAcademicEventDto } from './dto/update-academic-event.dto.js';

const eventSelection = {
  id: true,
  subjectId: true,
  eventTypeId: true,
  title: true,
  description: true,
  startsAt: true,
  endsAt: true,
  contentsStatus: true,
  eventType: { select: { id: true, name: true, isSystem: true } },
  subject: { select: { id: true, name: true, courseId: true } },
  contentLinks: {
    select: { content: { select: { id: true, name: true, priority: true } } },
  },
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AcademicEventsService {
  constructor(private readonly prisma: PrismaService) {}

  list(studentId: string, query: ListAcademicEventsQueryDto) {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    return this.prisma.academicEvent.findMany({
      where: {
        studentId,
        deletedAt: null,
        ...(query.subjectId ? { subjectId: query.subjectId } : {}),
        ...(from && to
          ? {
              startsAt: { lte: to },
              OR: [
                { endsAt: { gte: from } },
                { endsAt: null, startsAt: { gte: from } },
              ],
            }
          : from
            ? { OR: [{ startsAt: { gte: from } }, { endsAt: { gte: from } }] }
            : to
              ? { startsAt: { lte: to } }
              : {}),
      },
      select: eventSelection,
      orderBy: { startsAt: 'asc' },
    });
  }

  async get(studentId: string, id: string) {
    const event = await this.prisma.academicEvent.findFirst({
      where: { id, studentId, deletedAt: null },
      select: eventSelection,
    });
    if (!event) this.throwNotFound();
    return event;
  }

  async create(studentId: string, input: CreateAcademicEventDto) {
    const startsAt = new Date(input.startsAt);
    const endsAt = input.endsAt ? new Date(input.endsAt) : null;
    this.validateRange(startsAt, endsAt);
    await Promise.all([
      this.requireSubject(studentId, input.subjectId),
      this.requireEventType(studentId, input.eventTypeId),
      this.validateContents(
        studentId,
        input.subjectId,
        input.contentsStatus,
        input.contentIds ?? [],
      ),
    ]);

    const event = await this.prisma.academicEvent.create({
      data: {
        studentId,
        subjectId: input.subjectId,
        eventTypeId: input.eventTypeId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        startsAt,
        endsAt,
        contentsStatus: input.contentsStatus,
        contentLinks: {
          create: (input.contentIds ?? []).map((contentId) => ({ contentId })),
        },
      },
      select: eventSelection,
    });
    return {
      event,
      warnings: await this.overlapWarnings(
        studentId,
        startsAt,
        endsAt,
        event.id,
      ),
    };
  }

  async update(studentId: string, id: string, input: UpdateAcademicEventDto) {
    const current = await this.get(studentId, id);
    const startsAt = input.startsAt
      ? new Date(input.startsAt)
      : current.startsAt;
    const endsAt =
      input.endsAt === undefined
        ? current.endsAt
        : input.endsAt
          ? new Date(input.endsAt)
          : null;
    this.validateRange(startsAt, endsAt);
    if (
      (input.contentsStatus === undefined) !==
      (input.contentIds === undefined)
    ) {
      this.throwInvalidContents(
        'Informe juntos o estado e os conteúdos cobrados.',
      );
    }
    await Promise.all([
      input.eventTypeId
        ? this.requireEventType(studentId, input.eventTypeId)
        : Promise.resolve(),
      input.contentsStatus && input.contentIds
        ? this.validateContents(
            studentId,
            current.subjectId,
            input.contentsStatus,
            input.contentIds,
          )
        : Promise.resolve(),
    ]);

    const event = await this.prisma.$transaction(async (transaction) => {
      if (input.contentsStatus !== undefined && input.contentIds) {
        await transaction.academicEventContent.deleteMany({
          where: { academicEventId: id },
        });
        if (input.contentIds.length > 0) {
          await transaction.academicEventContent.createMany({
            data: input.contentIds.map((contentId) => ({
              academicEventId: id,
              contentId,
            })),
          });
        }
      }
      return transaction.academicEvent.update({
        where: { id },
        data: {
          ...(input.eventTypeId === undefined
            ? {}
            : { eventTypeId: input.eventTypeId }),
          ...(input.title === undefined ? {} : { title: input.title.trim() }),
          ...(input.description === undefined
            ? {}
            : { description: input.description.trim() || null }),
          ...(input.startsAt === undefined ? {} : { startsAt }),
          ...(input.endsAt === undefined ? {} : { endsAt }),
          ...(input.contentsStatus === undefined
            ? {}
            : { contentsStatus: input.contentsStatus }),
        },
        select: eventSelection,
      });
    });
    return {
      event,
      warnings: await this.overlapWarnings(studentId, startsAt, endsAt, id),
    };
  }

  async setContents(
    studentId: string,
    id: string,
    input: SetAcademicEventContentsDto,
  ) {
    const event = await this.get(studentId, id);
    await this.validateContents(
      studentId,
      event.subjectId,
      input.contentsStatus,
      input.contentIds,
    );
    return this.prisma.$transaction(async (transaction) => {
      await transaction.academicEventContent.deleteMany({
        where: { academicEventId: id },
      });
      if (input.contentIds.length > 0) {
        await transaction.academicEventContent.createMany({
          data: input.contentIds.map((contentId) => ({
            academicEventId: id,
            contentId,
          })),
        });
      }
      return transaction.academicEvent.update({
        where: { id },
        data: { contentsStatus: input.contentsStatus },
        select: eventSelection,
      });
    });
  }

  async remove(studentId: string, id: string): Promise<void> {
    await this.get(studentId, id);
    await this.prisma.academicEvent.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private validateRange(startsAt: Date, endsAt: Date | null) {
    if (endsAt && startsAt >= endsAt) {
      throw new UnprocessableEntityException({
        error: {
          code: 'INVALID_ACADEMIC_EVENT_RANGE',
          message: 'O término do evento deve ser posterior ao início.',
        },
      });
    }
  }

  private async validateContents(
    studentId: string,
    subjectId: string,
    status: EventContentsStatus,
    contentIds: string[],
  ) {
    if (
      status === EventContentsStatus.NOT_INFORMED_YET &&
      contentIds.length > 0
    ) {
      this.throwInvalidContents(
        'Remova os conteúdos ou marque-os como informados.',
      );
    }
    if (status === EventContentsStatus.INFORMED && contentIds.length === 0) {
      this.throwInvalidContents(
        'Selecione ao menos um conteúdo informado para o evento.',
      );
    }
    if (contentIds.length === 0) return;
    const count = await this.prisma.content.count({
      where: { id: { in: contentIds }, studentId, subjectId, archivedAt: null },
    });
    if (count !== contentIds.length) {
      this.throwInvalidContents(
        'Todos os conteúdos devem pertencer à disciplina do evento.',
      );
    }
  }

  private async requireSubject(studentId: string, subjectId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, studentId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!subject) {
      throw new NotFoundException({
        error: {
          code: 'SUBJECT_NOT_FOUND',
          message: 'Disciplina não encontrada.',
        },
      });
    }
  }

  private async requireEventType(studentId: string, eventTypeId: string) {
    const type = await this.prisma.academicEventType.findFirst({
      where: {
        id: eventTypeId,
        archivedAt: null,
        OR: [
          { isSystem: true, studentId: null },
          { isSystem: false, studentId },
        ],
      },
      select: { id: true },
    });
    if (!type) {
      throw new NotFoundException({
        error: {
          code: 'ACADEMIC_EVENT_TYPE_NOT_FOUND',
          message: 'Tipo de evento não encontrado.',
        },
      });
    }
  }

  private async overlapWarnings(
    studentId: string,
    startsAt: Date,
    endsAt: Date | null,
    excludeId: string,
  ) {
    if (!endsAt) return [];
    const overlaps = await this.prisma.academicEvent.findMany({
      where: {
        studentId,
        id: { not: excludeId },
        deletedAt: null,
        endsAt: { not: null, gt: startsAt },
        startsAt: { lt: endsAt },
      },
      select: { id: true, title: true, startsAt: true, endsAt: true },
      orderBy: { startsAt: 'asc' },
    });
    return overlaps.map((event) => ({ code: 'ACADEMIC_EVENT_OVERLAP', event }));
  }

  private throwInvalidContents(message: string): never {
    throw new UnprocessableEntityException({
      error: { code: 'INVALID_ACADEMIC_EVENT_CONTENTS', message },
    });
  }

  private throwNotFound(): never {
    throw new NotFoundException({
      error: {
        code: 'ACADEMIC_EVENT_NOT_FOUND',
        message: 'Evento acadêmico não encontrado.',
      },
    });
  }
}
