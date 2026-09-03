import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import {
  BlockStatus,
  SessionKind,
  SessionSegmentKind,
  SessionStatus,
} from '../generated/prisma/enums.js';
import type { CompleteStudySessionDto } from './dto/complete-study-session.dto.js';
import type { ListStudySessionsQueryDto } from './dto/list-study-sessions-query.dto.js';
import type { StartUnplannedSessionDto } from './dto/start-unplanned-session.dto.js';

const sessionSelection = {
  id: true,
  contentId: true,
  studyBlockId: true,
  kind: true,
  status: true,
  startedAt: true,
  endedAt: true,
  focusDurationSeconds: true,
  pomodoroBreakDurationSeconds: true,
  realizedDurationSeconds: true,
  note: true,
  revision: true,
  content: { select: { id: true, name: true } },
  segments: {
    select: {
      id: true,
      kind: true,
      startedAt: true,
      endedAt: true,
      sequence: true,
    },
    orderBy: { sequence: 'asc' as const },
  },
  completedParts: {
    select: {
      contentPart: { select: { id: true, name: true, position: true } },
    },
  },
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class StudySessionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(studentId: string, query: ListStudySessionsQueryDto) {
    return this.prisma.studySession.findMany({
      where: {
        studentId,
        ...(query.from ? { startedAt: { gte: new Date(query.from) } } : {}),
        ...(query.to ? { startedAt: { lte: new Date(query.to) } } : {}),
        ...(query.contentId ? { contentId: query.contentId } : {}),
        ...(query.kind ? { kind: query.kind } : {}),
      },
      select: sessionSelection,
      orderBy: { startedAt: 'desc' },
    });
  }

  async get(studentId: string, id: string) {
    const session = await this.prisma.studySession.findFirst({
      where: { id, studentId },
      select: sessionSelection,
    });
    if (!session) this.throwNotFound();
    return session;
  }

  active(studentId: string) {
    return this.prisma.studySession.findFirst({
      where: { studentId, status: SessionStatus.RUNNING },
      select: sessionSelection,
    });
  }

  startPlanned(studentId: string, blockId: string) {
    return this.prisma.$transaction(async (transaction) => {
      await this.lockStudent(transaction, studentId);
      await this.ensureNoRunningSession(transaction, studentId);
      const block = await transaction.studyBlock.findFirst({
        where: {
          id: blockId,
          studentId,
          status: { in: [BlockStatus.CONFIRMED, BlockStatus.OVERDUE] },
        },
        select: { id: true, contentId: true },
      });
      if (!block) {
        throw new ConflictException({
          error: {
            code: 'STUDY_BLOCK_NOT_STARTABLE',
            message: 'O bloco não existe ou não pode ser iniciado.',
          },
        });
      }
      const now = new Date();
      const session = await transaction.studySession.create({
        data: {
          studentId,
          contentId: block.contentId,
          studyBlockId: block.id,
          kind: SessionKind.PLANNED,
          status: SessionStatus.RUNNING,
          startedAt: now,
          segments: {
            create: {
              kind: SessionSegmentKind.FOCUS,
              startedAt: now,
              sequence: 1,
            },
          },
        },
        select: sessionSelection,
      });
      await transaction.studyBlock.update({
        where: { id: block.id },
        data: { status: BlockStatus.IN_PROGRESS, revision: { increment: 1 } },
      });
      return session;
    });
  }

  startUnplanned(studentId: string, input: StartUnplannedSessionDto) {
    return this.prisma.$transaction(async (transaction) => {
      await this.lockStudent(transaction, studentId);
      await this.ensureNoRunningSession(transaction, studentId);
      const content = await transaction.content.findFirst({
        where: { id: input.contentId, studentId, archivedAt: null },
        select: { id: true },
      });
      if (!content) {
        throw new NotFoundException({
          error: {
            code: 'CONTENT_NOT_FOUND',
            message: 'Conteúdo não encontrado.',
          },
        });
      }
      const now = new Date();
      return transaction.studySession.create({
        data: {
          studentId,
          contentId: content.id,
          kind: SessionKind.UNPLANNED,
          status: SessionStatus.RUNNING,
          startedAt: now,
          ...(input.note !== undefined
            ? { note: input.note.trim() || null }
            : {}),
          segments: {
            create: {
              kind: SessionSegmentKind.FOCUS,
              startedAt: now,
              sequence: 1,
            },
          },
        },
        select: sessionSelection,
      });
    });
  }

  pause(studentId: string, id: string) {
    return this.prisma.$transaction(async (transaction) => {
      await this.lockStudent(transaction, studentId);
      const session = await transaction.studySession.findFirst({
        where: { id, studentId, status: SessionStatus.RUNNING },
        select: { id: true, studyBlockId: true },
      });
      if (!session)
        this.throwInvalidTransition('A sessão não está em execução.');
      const now = new Date();
      await transaction.studySessionSegment.updateMany({
        where: { studySessionId: id, endedAt: null },
        data: { endedAt: now },
      });
      await transaction.studySession.update({
        where: { id },
        data: { status: SessionStatus.PAUSED, revision: { increment: 1 } },
      });
      if (session.studyBlockId) {
        await transaction.studyBlock.update({
          where: { id: session.studyBlockId },
          data: { status: BlockStatus.PAUSED, revision: { increment: 1 } },
        });
      }
      return transaction.studySession.findUniqueOrThrow({
        where: { id },
        select: sessionSelection,
      });
    });
  }

  resume(studentId: string, id: string) {
    return this.prisma.$transaction(async (transaction) => {
      await this.lockStudent(transaction, studentId);
      await this.ensureNoRunningSession(transaction, studentId);
      const session = await transaction.studySession.findFirst({
        where: { id, studentId, status: SessionStatus.PAUSED },
        select: {
          id: true,
          studyBlockId: true,
          _count: { select: { segments: true } },
        },
      });
      if (!session) this.throwInvalidTransition('A sessão não está pausada.');
      const now = new Date();
      await transaction.studySessionSegment.create({
        data: {
          studySessionId: id,
          kind: SessionSegmentKind.FOCUS,
          startedAt: now,
          sequence: session._count.segments + 1,
        },
      });
      await transaction.studySession.update({
        where: { id },
        data: { status: SessionStatus.RUNNING, revision: { increment: 1 } },
      });
      if (session.studyBlockId) {
        await transaction.studyBlock.update({
          where: { id: session.studyBlockId },
          data: { status: BlockStatus.IN_PROGRESS, revision: { increment: 1 } },
        });
      }
      return transaction.studySession.findUniqueOrThrow({
        where: { id },
        select: sessionSelection,
      });
    });
  }

  complete(studentId: string, id: string, input: CompleteStudySessionDto) {
    return this.prisma.$transaction(async (transaction) => {
      await this.lockStudent(transaction, studentId);
      const session = await transaction.studySession.findFirst({
        where: {
          id,
          studentId,
          status: { in: [SessionStatus.RUNNING, SessionStatus.PAUSED] },
        },
        select: { id: true, contentId: true, studyBlockId: true, status: true },
      });
      if (!session)
        this.throwInvalidTransition('A sessão não pode ser concluída.');
      const partIds = input.completedPartIds ?? [];
      if (partIds.length > 0) {
        const count = await transaction.contentPart.count({
          where: {
            id: { in: partIds },
            studentId,
            contentId: session.contentId,
            archivedAt: null,
          },
        });
        if (count !== partIds.length) {
          throw new UnprocessableEntityException({
            error: {
              code: 'INVALID_COMPLETED_PARTS',
              message: 'Todas as partes devem pertencer ao conteúdo estudado.',
            },
          });
        }
      }
      const now = new Date();
      if (session.status === SessionStatus.RUNNING) {
        await transaction.studySessionSegment.updateMany({
          where: { studySessionId: id, endedAt: null },
          data: { endedAt: now },
        });
      }
      const segments = await transaction.studySessionSegment.findMany({
        where: { studySessionId: id, endedAt: { not: null } },
        select: { kind: true, startedAt: true, endedAt: true },
      });
      const durationByKind = (kind: SessionSegmentKind) =>
        segments
          .filter((segment) => segment.kind === kind && segment.endedAt)
          .reduce(
            (total, segment) =>
              total +
              Math.max(
                0,
                Math.floor(
                  (segment.endedAt!.getTime() - segment.startedAt.getTime()) /
                    1000,
                ),
              ),
            0,
          );
      const focusSeconds = durationByKind(SessionSegmentKind.FOCUS);
      const breakSeconds = durationByKind(SessionSegmentKind.POMODORO_BREAK);
      await transaction.studySessionCompletedPart.deleteMany({
        where: { studySessionId: id },
      });
      if (partIds.length > 0) {
        await transaction.studySessionCompletedPart.createMany({
          data: partIds.map((contentPartId) => ({
            studySessionId: id,
            contentPartId,
          })),
        });
      }
      await transaction.studySession.update({
        where: { id },
        data: {
          status: SessionStatus.COMPLETED,
          endedAt: now,
          focusDurationSeconds: focusSeconds,
          pomodoroBreakDurationSeconds: breakSeconds,
          realizedDurationSeconds: focusSeconds + breakSeconds,
          ...(input.note !== undefined
            ? { note: input.note.trim() || null }
            : {}),
          revision: { increment: 1 },
        },
      });
      if (session.studyBlockId) {
        await transaction.studyBlock.update({
          where: { id: session.studyBlockId },
          data: {
            status: BlockStatus.COMPLETED,
            completedAt: now,
            revision: { increment: 1 },
          },
        });
      }
      return transaction.studySession.findUniqueOrThrow({
        where: { id },
        select: sessionSelection,
      });
    });
  }

  private lockStudent(
    transaction: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    studentId: string,
  ) {
    return transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${studentId}, 0))`;
  }

  private async ensureNoRunningSession(
    transaction: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    studentId: string,
  ) {
    const active = await transaction.studySession.findFirst({
      where: { studentId, status: SessionStatus.RUNNING },
      select: { id: true },
    });
    if (active) {
      throw new ConflictException({
        error: {
          code: 'ACTIVE_STUDY_SESSION_EXISTS',
          message: 'Já existe uma sessão de estudo em execução.',
          details: { sessionId: active.id },
        },
      });
    }
  }

  private throwInvalidTransition(message: string): never {
    throw new ConflictException({
      error: { code: 'INVALID_SESSION_TRANSITION', message },
    });
  }

  private throwNotFound(): never {
    throw new NotFoundException({
      error: {
        code: 'STUDY_SESSION_NOT_FOUND',
        message: 'Sessão não encontrada.',
      },
    });
  }
}
