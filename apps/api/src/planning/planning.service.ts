import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../database/prisma.service.js';
import {
  BlockStatus,
  BlockSource,
  DiagnosticKind,
  EventContentsStatus,
  ProposalStatus,
  RecordStatus,
  SessionStatus,
} from '../generated/prisma/enums.js';
import type { CreatePlanningProposalDto } from './dto/create-planning-proposal.dto.js';
import type { UpdateProposedBlockDto } from './dto/update-proposed-block.dto.js';
import {
  generatePlanningProposal,
  PLANNING_ALGORITHM_VERSION,
  PLANNING_PARAMETERS,
  subtractOccupiedIntervals,
  type PlanningCandidate,
  type TimeInterval,
} from './planning-engine.js';

const timeZone = 'America/Sao_Paulo';
const localDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const activeBlockStatuses = [
  BlockStatus.CONFIRMED,
  BlockStatus.IN_PROGRESS,
  BlockStatus.PAUSED,
  BlockStatus.OVERDUE,
];

function unique(values: string[]) {
  return [...new Set(values)];
}

type ProposalPartAssignment = {
  id: string;
  content: {
    archivedAt: Date | null;
    parts: Array<{ id: string }>;
  };
  parts: Array<{ contentPartId: string }>;
};

export function inspectProposalPartAssignments(
  blocks: ProposalPartAssignment[],
) {
  const missingBlockIds: string[] = [];
  const invalidBlockIds: string[] = [];
  for (const block of blocks) {
    if (block.content.archivedAt) {
      invalidBlockIds.push(block.id);
      continue;
    }
    const activePartIds = new Set(block.content.parts.map(({ id }) => id));
    const selectedPartIds = block.parts.map(
      ({ contentPartId }) => contentPartId,
    );
    if (selectedPartIds.some((id) => !activePartIds.has(id))) {
      invalidBlockIds.push(block.id);
      continue;
    }
    if (activePartIds.size > 0 && selectedPartIds.length === 0) {
      missingBlockIds.push(block.id);
    }
  }
  return { missingBlockIds, invalidBlockIds };
}

function timeText(value: Date) {
  return value.toISOString().slice(11, 19);
}

export function planningEventLookupEnd(
  periodStart: Date,
  periodEnd: Date,
): Date {
  return new Date(
    Math.max(
      periodEnd.getTime(),
      periodStart.getTime() +
        PLANNING_PARAMETERS.deadlineHorizonDays * 86_400_000,
    ),
  );
}

function materializeAvailability(
  periodStart: Date,
  periodEnd: Date,
  weekly: Array<{ weekday: number; startLocalTime: Date; endLocalTime: Date }>,
): TimeInterval[] {
  const firstDate = localDate.format(periodStart);
  const lastDate = localDate.format(new Date(periodEnd.getTime() - 1));
  const cursor = new Date(`${firstDate}T12:00:00Z`);
  const last = new Date(`${lastDate}T12:00:00Z`);
  const result: TimeInterval[] = [];
  while (cursor <= last) {
    const civilDate = cursor.toISOString().slice(0, 10);
    const weekday = cursor.getUTCDay();
    for (const interval of weekly) {
      if (interval.weekday !== weekday) continue;
      result.push({
        startsAt: new Date(
          `${civilDate}T${timeText(interval.startLocalTime)}-03:00`,
        ),
        endsAt: new Date(
          `${civilDate}T${timeText(interval.endLocalTime)}-03:00`,
        ),
      });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

@Injectable()
export class PlanningService {
  constructor(private readonly prisma: PrismaService) {}

  async create(studentId: string, input: CreatePlanningProposalDto) {
    const periodStart = new Date(input.periodStart);
    const periodEnd = new Date(input.periodEnd);
    const now = new Date();
    if (periodStart >= periodEnd || periodEnd <= now) this.throwInvalidRange();
    const courseIds = unique(input.courseIds);
    const subjectIds = unique(input.subjectIds);
    if (courseIds.length === 0 && subjectIds.length === 0) {
      throw new UnprocessableEntityException({
        error: {
          code: 'PLANNING_SCOPE_REQUIRED',
          message: 'Selecione ao menos um curso ou uma disciplina.',
        },
      });
    }

    const [courses, subjects] = await Promise.all([
      this.prisma.course.findMany({
        where: {
          id: { in: courseIds },
          studentId,
          status: RecordStatus.ACTIVE,
        },
        select: { id: true },
      }),
      this.prisma.subject.findMany({
        where: {
          id: { in: subjectIds },
          studentId,
          status: RecordStatus.ACTIVE,
        },
        select: { id: true },
      }),
    ]);
    if (
      courses.length !== courseIds.length ||
      subjects.length !== subjectIds.length
    )
      this.throwScopeNotFound();

    const contents = await this.prisma.content.findMany({
      where: {
        studentId,
        archivedAt: null,
        subject: {
          status: RecordStatus.ACTIVE,
          course: { status: RecordStatus.ACTIVE },
        },
        OR: [
          ...(courseIds.length
            ? [{ subject: { courseId: { in: courseIds } } }]
            : []),
          ...(subjectIds.length ? [{ subjectId: { in: subjectIds } }] : []),
          { studyBlocks: { some: { status: BlockStatus.OVERDUE } } },
        ],
      },
      select: {
        id: true,
        subjectId: true,
        priority: true,
        estimatedDurationSeconds: true,
        manuallyCompletedAt: true,
        updatedAt: true,
        subject: { select: { courseId: true } },
        parts: {
          where: { archivedAt: null },
          select: {
            id: true,
            sessionCompletions: {
              where: {
                studySession: { studentId, status: SessionStatus.COMPLETED },
              },
              select: { contentPartId: true },
              take: 1,
            },
          },
        },
        studyBlocks: {
          where: { status: BlockStatus.OVERDUE },
          select: { id: true, startsAt: true },
          orderBy: { startsAt: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });
    const contentIds = contents.map(({ id }) => id);
    const contentSubjectIds = unique(
      contents.map(({ subjectId }) => subjectId),
    );
    const eventLookupEnd = planningEventLookupEnd(periodStart, periodEnd);
    const [blocks, events, availability, pomodoro] = await Promise.all([
      this.prisma.studyBlock.findMany({
        where: {
          studentId,
          contentId: { in: contentIds },
          OR: [
            { status: BlockStatus.COMPLETED },
            {
              status: { in: activeBlockStatuses },
            },
          ],
        },
        select: {
          id: true,
          contentId: true,
          status: true,
          startsAt: true,
          endsAt: true,
          plannedDurationSeconds: true,
          revision: true,
          sessions: {
            where: { status: SessionStatus.COMPLETED },
            select: { realizedDurationSeconds: true },
          },
        },
      }),
      this.prisma.academicEvent.findMany({
        where: {
          studentId,
          deletedAt: null,
          subjectId: { in: contentSubjectIds },
          OR: [
            { startsAt: { gte: periodStart, lte: eventLookupEnd } },
            {
              startsAt: { lt: periodEnd },
              endsAt: { not: null, gt: periodStart },
            },
          ],
        },
        select: {
          id: true,
          subjectId: true,
          startsAt: true,
          endsAt: true,
          contentsStatus: true,
          contentLinks: { select: { contentId: true } },
          updatedAt: true,
        },
        orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.availabilityInterval.findMany({
        where: { studentId, active: true },
        select: { weekday: true, startLocalTime: true, endLocalTime: true },
        orderBy: [{ weekday: 'asc' }, { startLocalTime: 'asc' }],
      }),
      this.prisma.pomodoroPreference.findUnique({ where: { studentId } }),
    ]);

    const occupiedBlocks = await this.prisma.studyBlock.findMany({
      where: {
        studentId,
        status: { in: activeBlockStatuses },
        startsAt: { lt: periodEnd },
        endsAt: { gt: periodStart },
      },
      select: { id: true, startsAt: true, endsAt: true, revision: true },
    });
    const available = materializeAvailability(
      periodStart,
      periodEnd,
      availability,
    );
    const freeIntervals = subtractOccupiedIntervals(available, [
      ...occupiedBlocks.map(({ startsAt, endsAt }) => ({ startsAt, endsAt })),
      ...events.flatMap(({ startsAt, endsAt }) =>
        endsAt ? [{ startsAt, endsAt }] : [],
      ),
    ]);

    const nearestEventByContent = new Map<
      string,
      { id: string; startsAt: Date }
    >();
    const priorityEvents = events.filter(
      (event) =>
        event.startsAt >= periodStart && event.startsAt <= eventLookupEnd,
    );
    for (const event of priorityEvents) {
      for (const { contentId } of event.contentLinks) {
        if (!nearestEventByContent.has(contentId))
          nearestEventByContent.set(contentId, {
            id: event.id,
            startsAt: event.startsAt,
          });
      }
    }
    const completedSeconds = new Map<string, number>();
    const partiallyRealizedSeconds = new Map<string, number>();
    const futureSeconds = new Map<string, number>();
    for (const block of blocks) {
      if (block.status === BlockStatus.COMPLETED) {
        completedSeconds.set(
          block.contentId,
          (completedSeconds.get(block.contentId) ?? 0) +
            block.plannedDurationSeconds,
        );
        continue;
      }
      const realizedSeconds = block.sessions.reduce(
        (total, session) => total + (session.realizedDurationSeconds ?? 0),
        0,
      );
      if (realizedSeconds > 0) {
        partiallyRealizedSeconds.set(
          block.contentId,
          (partiallyRealizedSeconds.get(block.contentId) ?? 0) +
            realizedSeconds,
        );
      }
      if (block.endsAt > now && block.status !== BlockStatus.OVERDUE) {
        futureSeconds.set(
          block.contentId,
          (futureSeconds.get(block.contentId) ?? 0) +
            block.plannedDurationSeconds,
        );
      }
    }

    const completedContentIds = new Set(
      contents
        .filter((content) =>
          content.parts.length > 0
            ? content.parts.every((part) => part.sessionCompletions.length > 0)
            : content.manuallyCompletedAt !== null,
        )
        .map(({ id }) => id),
    );
    const ignoredWithoutEstimate = contents.filter(
      (content) =>
        !completedContentIds.has(content.id) &&
        content.estimatedDurationSeconds === null,
    );
    const candidates: PlanningCandidate[] = contents.flatMap((content) => {
      if (
        completedContentIds.has(content.id) ||
        content.estimatedDurationSeconds === null
      )
        return [];
      const requiredSeconds = Math.max(
        0,
        content.estimatedDurationSeconds -
          (completedSeconds.get(content.id) ?? 0) -
          (partiallyRealizedSeconds.get(content.id) ?? 0) -
          (futureSeconds.get(content.id) ?? 0),
      );
      if (requiredSeconds === 0) return [];
      const event = nearestEventByContent.get(content.id);
      const overdueBlock = content.studyBlocks[0];
      return [
        {
          contentId: content.id,
          courseId: content.subject.courseId,
          subjectId: content.subjectId,
          priority: content.priority,
          requiredSeconds,
          ...(event
            ? { deadline: event.startsAt, academicEventId: event.id }
            : {}),
          ...(overdueBlock ? { sourceOverdueBlockId: overdueBlock.id } : {}),
        },
      ];
    });
    const result = generatePlanningProposal({
      periodStart: new Date(Math.max(periodStart.getTime(), now.getTime())),
      periodEnd,
      freeIntervals,
      candidates,
    });
    const focusSeconds = pomodoro?.focusSeconds ?? 1500;
    const breakSeconds = pomodoro?.breakSeconds ?? 300;
    const inputVersion = createHash('sha256')
      .update(
        JSON.stringify({
          courseIds,
          subjectIds,
          contents: contents.map(({ id, updatedAt }) => [id, updatedAt]),
          events: events.map(({ id, updatedAt }) => [id, updatedAt]),
          occupiedBlocks: occupiedBlocks.map(({ id, revision }) => [
            id,
            revision,
          ]),
          availability,
          pomodoro: pomodoro
            ? [pomodoro.focusSeconds, pomodoro.breakSeconds, pomodoro.updatedAt]
            : null,
        }),
      )
      .digest('hex');

    return this.prisma.$transaction((transaction) =>
      transaction.planningProposal.create({
        data: {
          studentId,
          periodStart,
          periodEnd,
          status: ProposalStatus.READY,
          algorithmVersion: PLANNING_ALGORITHM_VERSION,
          parametersSnapshot: {
            ...PLANNING_PARAMETERS,
            focusSeconds,
            breakSeconds,
            requestedSeconds: result.requestedSeconds,
            allocatedSeconds: result.allocatedSeconds,
            unallocatedSeconds: result.unallocatedSeconds,
          },
          inputVersion,
          completedAt: new Date(),
          courseScopes: {
            create: courseIds.map((courseId) => ({ courseId })),
          },
          subjectScopes: {
            create: subjectIds.map((subjectId) => ({ subjectId })),
          },
          blocks: {
            create: result.blocks.map((block) => ({
              studentId,
              contentId: block.contentId,
              startsAt: block.startsAt,
              endsAt: block.endsAt,
              plannedDurationSeconds: block.plannedDurationSeconds,
              focusSeconds,
              breakSeconds,
              explanationFactors: block.explanationFactors,
              sourceOverdueBlockId: block.sourceOverdueBlockId,
            })),
          },
          diagnostics: {
            create: [
              ...ignoredWithoutEstimate.map((content) => ({
                kind: DiagnosticKind.MISSING_ESTIMATE,
                courseId: content.subject.courseId,
                subjectId: content.subjectId,
                contentId: content.id,
                details: { reason: 'MISSING_ESTIMATE' },
              })),
              ...priorityEvents.flatMap((event) =>
                event.contentsStatus === EventContentsStatus.NOT_INFORMED_YET
                  ? [
                      {
                        kind: DiagnosticKind.UNKNOWN_EVENT_CONTENTS,
                        subjectId: event.subjectId,
                        academicEventId: event.id,
                        details: { reason: 'UNKNOWN_EVENT_CONTENTS' },
                      },
                    ]
                  : [],
              ),
              ...result.diagnostics.map((diagnostic) => ({
                kind: DiagnosticKind.CAPACITY_DEFICIT,
                courseId: diagnostic.courseId,
                subjectId: diagnostic.subjectId,
                contentId: diagnostic.contentId,
                academicEventId: diagnostic.academicEventId,
                requiredSeconds: diagnostic.requiredSeconds,
                availableSeconds: diagnostic.allocatedSeconds,
                deficitSeconds: diagnostic.deficitSeconds,
                details: { reason: 'CAPACITY_DEFICIT' },
              })),
            ],
          },
        },
        include: {
          courseScopes: { select: { courseId: true } },
          subjectScopes: { select: { subjectId: true } },
          blocks: {
            where: { removedAt: null },
            include: {
              content: {
                select: {
                  id: true,
                  name: true,
                  subject: {
                    select: {
                      id: true,
                      name: true,
                      course: { select: { id: true, name: true } },
                    },
                  },
                },
              },
              parts: { include: { contentPart: true } },
            },
            orderBy: { startsAt: 'asc' },
          },
          diagnostics: true,
        },
      }),
    );
  }

  async get(studentId: string, id: string) {
    const proposal = await this.prisma.planningProposal.findFirst({
      where: { id, studentId },
      include: {
        courseScopes: {
          include: { course: { select: { id: true, name: true } } },
        },
        subjectScopes: {
          include: { subject: { select: { id: true, name: true } } },
        },
        blocks: {
          where: { removedAt: null },
          include: {
            content: {
              select: {
                id: true,
                name: true,
                parts: {
                  where: { archivedAt: null },
                  select: { id: true, name: true },
                  orderBy: { position: 'asc' },
                },
                subject: {
                  select: {
                    id: true,
                    name: true,
                    course: { select: { id: true, name: true } },
                  },
                },
              },
            },
            parts: { include: { contentPart: true } },
          },
          orderBy: { startsAt: 'asc' },
        },
        diagnostics: true,
      },
    });
    if (!proposal) {
      throw new NotFoundException({
        error: {
          code: 'PLANNING_PROPOSAL_NOT_FOUND',
          message: 'Proposta de planejamento não encontrada.',
        },
      });
    }
    return proposal;
  }

  async updateBlock(
    studentId: string,
    proposalId: string,
    blockId: string,
    input: UpdateProposedBlockDto,
  ) {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    const durationSeconds = (endsAt.getTime() - startsAt.getTime()) / 1000;
    if (startsAt >= endsAt || !Number.isSafeInteger(durationSeconds)) {
      throw new UnprocessableEntityException({
        error: {
          code: 'INVALID_PROPOSED_BLOCK_RANGE',
          message: 'O término do bloco deve ser posterior ao início.',
        },
      });
    }
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${studentId}, 0))`;
      const block = await transaction.proposedStudyBlock.findFirst({
        where: { id: blockId, proposalId, studentId, removedAt: null },
        include: {
          proposal: {
            select: { status: true, periodStart: true, periodEnd: true },
          },
        },
      });
      if (!block) this.throwProposedBlockNotFound();
      this.ensureProposalReviewable(block.proposal.status);
      if (
        startsAt < block.proposal.periodStart ||
        endsAt > block.proposal.periodEnd
      ) {
        throw new ConflictException({
          error: {
            code: 'PROPOSED_BLOCK_OUTSIDE_PERIOD',
            message: 'O bloco deve permanecer dentro do período da proposta.',
          },
        });
      }

      const content = await transaction.content.findFirst({
        where: { id: input.contentId, studentId, archivedAt: null },
        select: { id: true },
      });
      const partCount = await transaction.contentPart.count({
        where: {
          id: { in: input.partIds },
          contentId: input.contentId,
          studentId,
          archivedAt: null,
        },
      });
      const availability = await transaction.availabilityInterval.findMany({
        where: { studentId, active: true },
        select: {
          weekday: true,
          startLocalTime: true,
          endLocalTime: true,
        },
      });
      const blockConflict = await transaction.studyBlock.findFirst({
        where: {
          studentId,
          status: { in: activeBlockStatuses },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        select: { id: true },
      });
      const eventConflict = await transaction.academicEvent.findFirst({
        where: {
          studentId,
          deletedAt: null,
          endsAt: { not: null, gt: startsAt },
          startsAt: { lt: endsAt },
        },
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
      if (partCount !== input.partIds.length) {
        throw new UnprocessableEntityException({
          error: {
            code: 'INVALID_CONTENT_PARTS',
            message: 'Uma parte selecionada não pertence ao conteúdo.',
          },
        });
      }
      const available = materializeAvailability(startsAt, endsAt, availability);
      if (
        !available.some(
          (interval) =>
            interval.startsAt <= startsAt && interval.endsAt >= endsAt,
        )
      ) {
        throw new ConflictException({
          error: {
            code: 'PROPOSED_BLOCK_OUTSIDE_AVAILABILITY',
            message: 'O bloco está fora da disponibilidade semanal.',
          },
        });
      }
      const proposalConflict = await transaction.proposedStudyBlock.findFirst({
        where: {
          proposalId,
          id: { not: blockId },
          removedAt: null,
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        select: { id: true },
      });
      if (blockConflict || eventConflict || proposalConflict) {
        throw new ConflictException({
          error: {
            code: 'PROPOSED_BLOCK_CONFLICT',
            message: 'O horário escolhido possui outro compromisso.',
          },
        });
      }

      const changed = await transaction.proposedStudyBlock.updateMany({
        where: {
          id: blockId,
          proposalId,
          studentId,
          removedAt: null,
          revision: input.revision,
        },
        data: {
          contentId: input.contentId,
          startsAt,
          endsAt,
          plannedDurationSeconds: durationSeconds,
          focusSeconds: input.focusSeconds,
          breakSeconds: input.breakSeconds,
          explanationFactors: { reason: 'STUDENT_EDITED' },
          ...(input.contentId !== block.contentId
            ? { sourceOverdueBlockId: null }
            : {}),
          revision: { increment: 1 },
        },
      });
      if (changed.count !== 1) this.throwProposalStale();
      await transaction.proposedBlockPart.deleteMany({
        where: { proposedBlockId: blockId },
      });
      if (input.partIds.length > 0) {
        await transaction.proposedBlockPart.createMany({
          data: input.partIds.map((contentPartId) => ({
            proposedBlockId: blockId,
            contentPartId,
          })),
        });
      }
      await transaction.planningProposal.update({
        where: { id: proposalId },
        data: { status: ProposalStatus.REVIEWING, revision: { increment: 1 } },
      });
      await transaction.auditEvent.create({
        data: {
          actorUserId: studentId,
          studentScopeId: studentId,
          action: 'PROPOSED_STUDY_BLOCK_UPDATED',
          entityType: 'PROPOSED_STUDY_BLOCK',
          entityId: blockId,
          metadata: { previousRevision: block.revision },
        },
      });
      return transaction.proposedStudyBlock.findUniqueOrThrow({
        where: { id: blockId },
        include: {
          content: {
            select: {
              id: true,
              name: true,
              subject: { select: { id: true, name: true } },
            },
          },
          parts: { include: { contentPart: true } },
        },
      });
    });
  }

  async removeBlock(studentId: string, proposalId: string, blockId: string) {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${studentId}, 0))`;
      const block = await transaction.proposedStudyBlock.findFirst({
        where: { id: blockId, proposalId, studentId, removedAt: null },
        include: { proposal: { select: { status: true } } },
      });
      if (!block) this.throwProposedBlockNotFound();
      this.ensureProposalReviewable(block.proposal.status);
      const removedAt = new Date();
      const changed = await transaction.proposedStudyBlock.updateMany({
        where: {
          id: blockId,
          proposalId,
          studentId,
          removedAt: null,
          revision: block.revision,
        },
        data: { removedAt, revision: { increment: 1 } },
      });
      if (changed.count !== 1) this.throwProposalStale();
      await transaction.planningProposal.update({
        where: { id: proposalId },
        data: { status: ProposalStatus.REVIEWING, revision: { increment: 1 } },
      });
      await transaction.auditEvent.create({
        data: {
          actorUserId: studentId,
          studentScopeId: studentId,
          action: 'PROPOSED_STUDY_BLOCK_REMOVED',
          entityType: 'PROPOSED_STUDY_BLOCK',
          entityId: blockId,
          metadata: { removedAt: removedAt.toISOString() },
        },
      });
      return { id: blockId, removedAt };
    });
  }

  async confirm(studentId: string, id: string) {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${studentId}, 0))`;
      const proposal = await transaction.planningProposal.findFirst({
        where: { id, studentId },
        include: {
          courseScopes: { select: { courseId: true } },
          subjectScopes: { select: { subjectId: true } },
          blocks: {
            where: { removedAt: null },
            include: {
              parts: { select: { contentPartId: true } },
              content: {
                select: {
                  archivedAt: true,
                  parts: {
                    where: { archivedAt: null },
                    select: { id: true },
                  },
                },
              },
            },
            orderBy: { startsAt: 'asc' },
          },
        },
      });
      if (!proposal) this.throwProposalNotFound();
      if (proposal.status === ProposalStatus.CONFIRMED) return proposal;
      if (
        proposal.status !== ProposalStatus.READY &&
        proposal.status !== ProposalStatus.REVIEWING
      ) {
        throw new ConflictException({
          error: {
            code: 'PLANNING_PROPOSAL_NOT_CONFIRMABLE',
            message: 'Esta proposta não pode mais ser confirmada.',
          },
        });
      }

      const partAssignments = inspectProposalPartAssignments(proposal.blocks);
      if (partAssignments.invalidBlockIds.length > 0) {
        this.throwProposalStale();
      }
      if (partAssignments.missingBlockIds.length > 0) {
        throw new UnprocessableEntityException({
          error: {
            code: 'PROPOSAL_PARTS_REQUIRED',
            message:
              'Selecione ao menos uma parte para cada bloco que possui partes.',
            details: { blockIds: partAssignments.missingBlockIds },
          },
        });
      }

      const firstBlock = proposal.blocks[0];
      const lastBlock = proposal.blocks.at(-1);
      if (firstBlock && lastBlock) {
        const proposalCourseIds = proposal.courseScopes.map(
          ({ courseId }) => courseId,
        );
        const proposalSubjectIds = proposal.subjectScopes.map(
          ({ subjectId }) => subjectId,
        );
        const contentScope = [
          ...(proposalCourseIds.length
            ? [{ subject: { courseId: { in: proposalCourseIds } } }]
            : []),
          ...(proposalSubjectIds.length
            ? [{ subjectId: { in: proposalSubjectIds } }]
            : []),
          { id: { in: proposal.blocks.map(({ contentId }) => contentId) } },
        ];
        const blockConflict = await transaction.studyBlock.findFirst({
          where: {
            studentId,
            status: { in: activeBlockStatuses },
            OR: proposal.blocks.map((block) => ({
              startsAt: { lt: block.endsAt },
              endsAt: { gt: block.startsAt },
            })),
          },
          select: { id: true },
        });
        const eventConflict = await transaction.academicEvent.findFirst({
          where: {
            studentId,
            deletedAt: null,
            endsAt: { not: null },
            OR: proposal.blocks.map((block) => ({
              startsAt: { lt: block.endsAt },
              endsAt: { gt: block.startsAt },
            })),
          },
          select: { id: true },
        });
        const changedContent = await transaction.content.findFirst({
          where: {
            studentId,
            archivedAt: null,
            updatedAt: { gt: proposal.requestedAt },
            OR: contentScope,
          },
          select: { id: true },
        });
        const changedEvent = await transaction.academicEvent.findFirst({
          where: {
            studentId,
            deletedAt: null,
            updatedAt: { gt: proposal.requestedAt },
            AND: [
              {
                OR: [
                  ...(proposalCourseIds.length
                    ? [{ subject: { courseId: { in: proposalCourseIds } } }]
                    : []),
                  ...(proposalSubjectIds.length
                    ? [{ subjectId: { in: proposalSubjectIds } }]
                    : []),
                ],
              },
              {
                OR: [
                  {
                    startsAt: {
                      gte: proposal.periodStart,
                      lte: planningEventLookupEnd(
                        proposal.periodStart,
                        proposal.periodEnd,
                      ),
                    },
                  },
                  {
                    startsAt: { lt: proposal.periodEnd },
                    endsAt: { not: null, gt: proposal.periodStart },
                  },
                ],
              },
            ],
          },
          select: { id: true },
        });
        const changedAvailability =
          await transaction.availabilityInterval.findFirst({
            where: { studentId, updatedAt: { gt: proposal.requestedAt } },
            select: { id: true },
          });
        const changedPomodoro = await transaction.pomodoroPreference.findFirst({
          where: { studentId, updatedAt: { gt: proposal.requestedAt } },
          select: { studentId: true },
        });
        const availability = await transaction.availabilityInterval.findMany({
          where: { studentId, active: true },
          select: {
            weekday: true,
            startLocalTime: true,
            endLocalTime: true,
          },
        });
        const availableIntervals = materializeAvailability(
          proposal.periodStart,
          proposal.periodEnd,
          availability,
        );
        const allBlocksRemainAvailable = proposal.blocks.every((block) =>
          availableIntervals.some(
            (interval) =>
              interval.startsAt <= block.startsAt &&
              interval.endsAt >= block.endsAt,
          ),
        );
        if (
          blockConflict ||
          eventConflict ||
          changedContent ||
          changedEvent ||
          changedAvailability ||
          changedPomodoro ||
          !allBlocksRemainAvailable
        )
          this.throwProposalStale();
      }

      const confirmedAt = new Date();
      const changed = await transaction.planningProposal.updateMany({
        where: {
          id,
          studentId,
          status: { in: [ProposalStatus.READY, ProposalStatus.REVIEWING] },
          revision: proposal.revision,
        },
        data: {
          status: ProposalStatus.CONFIRMED,
          confirmedAt,
          revision: { increment: 1 },
        },
      });
      if (changed.count !== 1) this.throwProposalStale();

      if (proposal.blocks.length > 0) {
        await transaction.studyBlock.createMany({
          data: proposal.blocks.map((block) => ({
            studentId,
            contentId: block.contentId,
            proposalId: proposal.id,
            proposedBlockId: block.id,
            source: BlockSource.AUTOMATIC,
            status: BlockStatus.CONFIRMED,
            startsAt: block.startsAt,
            endsAt: block.endsAt,
            plannedDurationSeconds: block.plannedDurationSeconds,
            focusSeconds: block.focusSeconds,
            breakSeconds: block.breakSeconds,
          })),
        });
        if (proposal.blocks.some((block) => block.parts.length > 0)) {
          const createdBlocks = await transaction.studyBlock.findMany({
            where: {
              proposedBlockId: { in: proposal.blocks.map(({ id }) => id) },
            },
            select: { id: true, proposedBlockId: true },
          });
          const confirmedIdByProposed = new Map(
            createdBlocks.map((block) => [block.proposedBlockId, block.id]),
          );
          await transaction.studyBlockPart.createMany({
            data: proposal.blocks.flatMap((block) =>
              block.parts.map(({ contentPartId }) => ({
                studyBlockId: confirmedIdByProposed.get(block.id)!,
                contentPartId,
              })),
            ),
          });
        }
      }
      await transaction.auditEvent.create({
        data: {
          actorUserId: studentId,
          studentScopeId: studentId,
          action: 'PLANNING_PROPOSAL_CONFIRMED',
          entityType: 'PLANNING_PROPOSAL',
          entityId: proposal.id,
          metadata: {
            confirmedAt: confirmedAt.toISOString(),
            blockCount: proposal.blocks.length,
          },
        },
      });
      return transaction.planningProposal.findUniqueOrThrow({
        where: { id },
        include: {
          blocks: { where: { removedAt: null }, orderBy: { startsAt: 'asc' } },
          confirmedBlocks: { orderBy: { startsAt: 'asc' } },
          diagnostics: true,
        },
      });
    });
  }

  async discard(studentId: string, id: string) {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${studentId}, 0))`;
      const proposal = await transaction.planningProposal.findFirst({
        where: { id, studentId },
        select: { id: true, status: true, revision: true },
      });
      if (!proposal) this.throwProposalNotFound();
      if (proposal.status === ProposalStatus.DISCARDED) return proposal;
      if (
        proposal.status !== ProposalStatus.READY &&
        proposal.status !== ProposalStatus.REVIEWING
      ) {
        throw new ConflictException({
          error: {
            code: 'PLANNING_PROPOSAL_NOT_DISCARDABLE',
            message: 'Esta proposta não pode mais ser descartada.',
          },
        });
      }
      const changed = await transaction.planningProposal.updateMany({
        where: {
          id,
          studentId,
          revision: proposal.revision,
          status: { in: [ProposalStatus.READY, ProposalStatus.REVIEWING] },
        },
        data: {
          status: ProposalStatus.DISCARDED,
          revision: { increment: 1 },
        },
      });
      if (changed.count !== 1) this.throwProposalStale();
      await transaction.auditEvent.create({
        data: {
          actorUserId: studentId,
          studentScopeId: studentId,
          action: 'PLANNING_PROPOSAL_DISCARDED',
          entityType: 'PLANNING_PROPOSAL',
          entityId: proposal.id,
        },
      });
      return transaction.planningProposal.findUniqueOrThrow({ where: { id } });
    });
  }

  private throwInvalidRange(): never {
    throw new UnprocessableEntityException({
      error: {
        code: 'INVALID_PLANNING_PERIOD',
        message: 'O fim do período deve ser futuro e posterior ao início.',
      },
    });
  }

  private throwScopeNotFound(): never {
    throw new NotFoundException({
      error: {
        code: 'PLANNING_SCOPE_NOT_FOUND',
        message: 'Um curso ou disciplina selecionado não foi encontrado.',
      },
    });
  }

  private throwProposalNotFound(): never {
    throw new NotFoundException({
      error: {
        code: 'PLANNING_PROPOSAL_NOT_FOUND',
        message: 'Proposta de planejamento não encontrada.',
      },
    });
  }

  private throwProposalStale(): never {
    throw new ConflictException({
      error: {
        code: 'PROPOSAL_STALE',
        message: 'A proposta ficou desatualizada. Gere uma nova proposta.',
      },
    });
  }

  private throwProposedBlockNotFound(): never {
    throw new NotFoundException({
      error: {
        code: 'PROPOSED_BLOCK_NOT_FOUND',
        message: 'Bloco sugerido não encontrado.',
      },
    });
  }

  private ensureProposalReviewable(status: ProposalStatus) {
    if (
      status !== ProposalStatus.READY &&
      status !== ProposalStatus.REVIEWING
    ) {
      throw new ConflictException({
        error: {
          code: 'PLANNING_PROPOSAL_NOT_REVIEWABLE',
          message: 'Esta proposta não pode mais ser alterada.',
        },
      });
    }
  }
}
