import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import {
  BlockStatus,
  RecordStatus,
  SessionStatus,
} from '../generated/prisma/enums.js';
import type { CreateContentDto } from './dto/create-content.dto.js';
import type { ListContentsQueryDto } from './dto/list-contents-query.dto.js';
import type { UpdateContentDto } from './dto/update-content.dto.js';

const contentSelection = {
  id: true,
  subjectId: true,
  name: true,
  description: true,
  priority: true,
  estimatedDurationSeconds: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  subject: {
    select: {
      id: true,
      name: true,
      course: { select: { id: true, name: true } },
    },
  },
  parts: {
    where: { archivedAt: null },
    select: { id: true, name: true, position: true },
    orderBy: { position: 'asc' as const },
  },
  _count: { select: { parts: { where: { archivedAt: null } } } },
} as const;

@Injectable()
export class ContentsService {
  constructor(private readonly prisma: PrismaService) {}

  listAll(studentId: string, query: ListContentsQueryDto) {
    return this.prisma.content.findMany({
      where: {
        studentId,
        archivedAt:
          query.status === RecordStatus.ARCHIVED ? { not: null } : null,
        ...(query.subjectId ? { subjectId: query.subjectId } : {}),
        ...(query.courseId ? { subject: { courseId: query.courseId } } : {}),
      },
      select: contentSelection,
      orderBy: [
        { subject: { course: { name: 'asc' } } },
        { subject: { name: 'asc' } },
        { priority: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  async list(
    studentId: string,
    subjectId: string,
    query: ListContentsQueryDto,
  ) {
    await this.requireSubject(studentId, subjectId);
    return this.prisma.content.findMany({
      where: {
        studentId,
        subjectId,
        archivedAt:
          query.status === RecordStatus.ARCHIVED ? { not: null } : null,
      },
      select: contentSelection,
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
    });
  }

  async get(studentId: string, id: string) {
    const content = await this.prisma.content.findFirst({
      where: { id, studentId },
      select: contentSelection,
    });
    if (!content) this.throwNotFound();
    return content;
  }

  async progress(studentId: string, id: string) {
    const content = await this.prisma.content.findFirst({
      where: { id, studentId },
      select: {
        id: true,
        parts: {
          where: { archivedAt: null },
          select: { id: true },
        },
      },
    });
    if (!content) this.throwNotFound();
    const partIds = content.parts.map(({ id: partId }) => partId);
    const [completedPartRows, executionCount, futureBlockCount] =
      await Promise.all([
        partIds.length
          ? this.prisma.studySessionCompletedPart.findMany({
              where: {
                contentPartId: { in: partIds },
                studySession: {
                  studentId,
                  contentId: id,
                  status: SessionStatus.COMPLETED,
                },
              },
              select: { contentPartId: true },
              distinct: ['contentPartId'],
            })
          : Promise.resolve([]),
        this.prisma.studySession.count({ where: { studentId, contentId: id } }),
        this.prisma.studyBlock.count({
          where: {
            studentId,
            contentId: id,
            endsAt: { gt: new Date() },
            status: {
              in: [
                BlockStatus.CONFIRMED,
                BlockStatus.IN_PROGRESS,
                BlockStatus.PAUSED,
                BlockStatus.OVERDUE,
              ],
            },
          },
        }),
      ]);
    const completedPartIds = completedPartRows.map(
      ({ contentPartId }) => contentPartId,
    );
    const completed =
      partIds.length > 0 && completedPartIds.length === partIds.length;
    const status = completed
      ? 'COMPLETED'
      : executionCount > 0
        ? 'IN_PROGRESS'
        : 'PENDING';
    return {
      status,
      totalParts: partIds.length,
      completedParts: completedPartIds.length,
      completedPartIds,
      percentage:
        partIds.length > 0
          ? (completedPartIds.length * 100) / partIds.length
          : null,
      futureBlockCount,
      needsFuturePlanning: !completed && futureBlockCount === 0,
    };
  }

  async create(studentId: string, subjectId: string, input: CreateContentDto) {
    await this.requireSubject(studentId, subjectId, true);
    return this.prisma.content.create({
      data: {
        studentId,
        subjectId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        priority: input.priority,
        estimatedDurationSeconds: input.estimatedDurationSeconds,
      },
      select: contentSelection,
    });
  }

  async update(studentId: string, id: string, input: UpdateContentDto) {
    await this.get(studentId, id);
    return this.prisma.content.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name.trim() }),
        ...(input.description === undefined
          ? {}
          : { description: input.description.trim() || null }),
        ...(input.priority === undefined ? {} : { priority: input.priority }),
        ...(input.estimatedDurationSeconds === undefined
          ? {}
          : { estimatedDurationSeconds: input.estimatedDurationSeconds }),
      },
      select: contentSelection,
    });
  }

  async setArchived(studentId: string, id: string, archived: boolean) {
    await this.get(studentId, id);
    return this.prisma.content.update({
      where: { id },
      data: { archivedAt: archived ? new Date() : null },
      select: contentSelection,
    });
  }

  async remove(studentId: string, id: string): Promise<void> {
    await this.get(studentId, id);
    const historyCount = await this.prisma.content.count({
      where: {
        id,
        studentId,
        OR: [
          { academicEventLinks: { some: {} } },
          { proposedStudyBlocks: { some: {} } },
          { studyBlocks: { some: {} } },
          { studySessions: { some: {} } },
        ],
      },
    });
    if (historyCount > 0) {
      throw new ConflictException({
        error: {
          code: 'ENTITY_HAS_HISTORY',
          message: 'O conteúdo possui histórico e deve ser arquivado.',
        },
      });
    }
    await this.prisma.content.delete({ where: { id } });
  }

  private async requireSubject(
    studentId: string,
    subjectId: string,
    active = false,
  ) {
    const subject = await this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        studentId,
        ...(active ? { status: RecordStatus.ACTIVE } : {}),
      },
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

  private throwNotFound(): never {
    throw new NotFoundException({
      error: { code: 'CONTENT_NOT_FOUND', message: 'Conteúdo não encontrado.' },
    });
  }
}
