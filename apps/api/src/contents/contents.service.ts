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
  manuallyCompletedAt: true,
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

type ProgressSource = {
  id: string;
  manuallyCompletedAt: Date | null;
  parts: Array<{ id: string }>;
};

function summarizeProgress(
  content: ProgressSource,
  completedPartIds: string[],
  executionCount: number,
  futureBlockCount: number,
) {
  const totalParts = content.parts.length;
  const completed =
    totalParts > 0
      ? completedPartIds.length === totalParts
      : content.manuallyCompletedAt !== null;
  const status = completed
    ? ('COMPLETED' as const)
    : executionCount > 0
      ? ('IN_PROGRESS' as const)
      : ('PENDING' as const);
  return {
    status,
    totalParts,
    completedParts: completedPartIds.length,
    completedPartIds,
    percentage:
      totalParts > 0
        ? (completedPartIds.length * 100) / totalParts
        : completed
          ? 100
          : null,
    futureBlockCount,
    needsFuturePlanning: !completed && futureBlockCount === 0,
  };
}

@Injectable()
export class ContentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll(studentId: string, query: ListContentsQueryDto) {
    const contents = await this.prisma.content.findMany({
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
    return this.withProgress(studentId, contents);
  }

  async list(
    studentId: string,
    subjectId: string,
    query: ListContentsQueryDto,
  ) {
    await this.requireSubject(studentId, subjectId);
    const contents = await this.prisma.content.findMany({
      where: {
        studentId,
        subjectId,
        archivedAt:
          query.status === RecordStatus.ARCHIVED ? { not: null } : null,
      },
      select: contentSelection,
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
    });
    return this.withProgress(studentId, contents);
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
        manuallyCompletedAt: true,
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
    return summarizeProgress(
      content,
      completedPartIds,
      executionCount,
      futureBlockCount,
    );
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

  async completeManually(studentId: string, id: string) {
    const content = await this.get(studentId, id);
    if (content.archivedAt) {
      throw new ConflictException({
        error: {
          code: 'CONTENT_ARCHIVED',
          message: 'Restaure o conteúdo antes de concluí-lo.',
        },
      });
    }
    if (content._count.parts > 0) {
      throw new ConflictException({
        error: {
          code: 'CONTENT_HAS_PARTS',
          message: 'Conclua as partes deste conteúdo individualmente.',
        },
      });
    }
    if (content.manuallyCompletedAt) return content;

    return this.prisma.$transaction(async (transaction) => {
      const completedAt = new Date();
      const update = await transaction.content.updateMany({
        where: { id, studentId, manuallyCompletedAt: null },
        data: { manuallyCompletedAt: completedAt },
      });
      const completed = await transaction.content.findUnique({
        where: { id },
        select: contentSelection,
      });
      if (!completed) this.throwNotFound();
      if (update.count === 0) return completed;
      await transaction.auditEvent.create({
        data: {
          actorUserId: studentId,
          studentScopeId: studentId,
          action: 'CONTENT_MANUALLY_COMPLETED',
          entityType: 'CONTENT',
          entityId: id,
          metadata: { completedAt: completedAt.toISOString() },
        },
      });
      return completed;
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

  private async withProgress<T extends ProgressSource>(
    studentId: string,
    contents: T[],
  ) {
    if (contents.length === 0) return [];
    const contentIds = contents.map(({ id }) => id);
    const [completedPartRows, executionGroups, futureBlockGroups] =
      await Promise.all([
        this.prisma.studySessionCompletedPart.findMany({
          where: {
            contentPart: {
              contentId: { in: contentIds },
              archivedAt: null,
            },
            studySession: {
              studentId,
              status: SessionStatus.COMPLETED,
            },
          },
          select: {
            contentPartId: true,
            contentPart: { select: { contentId: true } },
          },
          distinct: ['contentPartId'],
        }),
        this.prisma.studySession.groupBy({
          by: ['contentId'],
          where: { studentId, contentId: { in: contentIds } },
          _count: { _all: true },
        }),
        this.prisma.studyBlock.groupBy({
          by: ['contentId'],
          where: {
            studentId,
            contentId: { in: contentIds },
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
          _count: { _all: true },
        }),
      ]);
    const completedByContent = new Map<string, string[]>();
    for (const row of completedPartRows) {
      const ids = completedByContent.get(row.contentPart.contentId) ?? [];
      ids.push(row.contentPartId);
      completedByContent.set(row.contentPart.contentId, ids);
    }
    const executionsByContent = new Map(
      executionGroups.map((row) => [row.contentId, row._count._all]),
    );
    const futureBlocksByContent = new Map(
      futureBlockGroups.map((row) => [row.contentId, row._count._all]),
    );
    return contents.map((content) => ({
      ...content,
      progress: summarizeProgress(
        content,
        completedByContent.get(content.id) ?? [],
        executionsByContent.get(content.id) ?? 0,
        futureBlocksByContent.get(content.id) ?? 0,
      ),
    }));
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
