import {
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { BlockStatus } from '../generated/prisma/enums.js';
import type { AvailabilityIntervalDto } from './dto/replace-availability.dto.js';

const timeZone = 'America/Sao_Paulo';
const weekdayNumbers: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};
const localDateTime = new Intl.DateTimeFormat('en-US', {
  timeZone,
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function normalizeTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

function timeToSeconds(value: string): number {
  const [hour, minute, second] = normalizeTime(value).split(':').map(Number);
  return hour * 3600 + minute * 60 + second;
}

function endTimeToSeconds(value: string): number {
  const seconds = timeToSeconds(value);
  return seconds === 0 ? 24 * 3600 : seconds;
}

function rangeEndSeconds(
  start: { weekday: number; seconds: number },
  end: { weekday: number; seconds: number },
  startsAt: Date,
  endsAt: Date,
): number | null {
  if (start.weekday === end.weekday) return end.seconds;
  const nextWeekday = (start.weekday + 1) % 7;
  if (
    end.weekday === nextWeekday &&
    end.seconds === 0 &&
    endsAt.getTime() - startsAt.getTime() <= 86_400_000
  ) {
    return 24 * 3600;
  }
  return null;
}

function timeToDatabaseDate(value: string): Date {
  return new Date(`1970-01-01T${normalizeTime(value)}.000Z`);
}

function databaseTimeToString(value: Date): string {
  return value.toISOString().slice(11, 19);
}

type NormalizedInterval = {
  weekday: number;
  startLocalTime: string;
  endLocalTime: string;
};

export function mergeAvailabilityIntervals(
  intervals: NormalizedInterval[],
): NormalizedInterval[] {
  const sorted = intervals
    .map((interval) => ({
      ...interval,
      startLocalTime: normalizeTime(interval.startLocalTime),
      endLocalTime: normalizeTime(interval.endLocalTime),
    }))
    .sort((left, right) =>
      left.weekday === right.weekday
        ? timeToSeconds(left.startLocalTime) -
          timeToSeconds(right.startLocalTime)
        : left.weekday - right.weekday,
    );

  return sorted.reduce<NormalizedInterval[]>((merged, interval) => {
    const previous = merged.at(-1);
    if (
      previous?.weekday === interval.weekday &&
      timeToSeconds(interval.startLocalTime) <=
        endTimeToSeconds(previous.endLocalTime)
    ) {
      if (
        endTimeToSeconds(interval.endLocalTime) >
        endTimeToSeconds(previous.endLocalTime)
      ) {
        previous.endLocalTime = interval.endLocalTime;
      }
      return merged;
    }
    merged.push({ ...interval });
    return merged;
  }, []);
}

function instantToLocalPoint(value: Date) {
  const parts = Object.fromEntries(
    localDateTime
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

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async get(studentId: string) {
    const intervals = await this.prisma.availabilityInterval.findMany({
      where: { studentId, active: true },
      orderBy: [{ weekday: 'asc' }, { startLocalTime: 'asc' }],
    });
    return intervals.map((interval) => ({
      id: interval.id,
      weekday: interval.weekday,
      startLocalTime: databaseTimeToString(interval.startLocalTime),
      endLocalTime: databaseTimeToString(interval.endLocalTime),
    }));
  }

  async validate(studentId: string, intervals: AvailabilityIntervalDto[]) {
    const normalized = this.validateIntervals(intervals);
    const conflicts = await this.findFutureBlockConflicts(
      studentId,
      normalized,
      this.prisma,
    );
    return { valid: conflicts.length === 0, conflicts };
  }

  async coversInterval(
    studentId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<boolean> {
    const [result] = await this.coversIntervals(studentId, [
      { startsAt, endsAt },
    ]);
    return result;
  }

  async coversIntervals(
    studentId: string,
    ranges: Array<{ startsAt: Date; endsAt: Date }>,
  ): Promise<boolean[]> {
    if (ranges.length === 0) return [];
    const intervals = await this.prisma.availabilityInterval.findMany({
      where: { studentId, active: true },
      select: {
        weekday: true,
        startLocalTime: true,
        endLocalTime: true,
      },
    });
    return ranges.map(({ startsAt, endsAt }) => {
      const start = instantToLocalPoint(startsAt);
      const end = instantToLocalPoint(endsAt);
      const endSeconds = rangeEndSeconds(start, end, startsAt, endsAt);
      if (endSeconds === null || startsAt >= endsAt) return false;
      return intervals.some(
        (interval) =>
          interval.weekday === start.weekday &&
          timeToSeconds(databaseTimeToString(interval.startLocalTime)) <=
            start.seconds &&
          endTimeToSeconds(databaseTimeToString(interval.endLocalTime)) >=
            endSeconds,
      );
    });
  }

  async replace(studentId: string, intervals: AvailabilityIntervalDto[]) {
    const normalized = this.validateIntervals(intervals);
    await this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${studentId}, 0))`;
      const conflicts = await this.findFutureBlockConflicts(
        studentId,
        normalized,
        transaction,
      );
      if (conflicts.length > 0) {
        throw new ConflictException({
          error: {
            code: 'AVAILABILITY_HAS_AFFECTED_BLOCKS',
            message:
              'A nova disponibilidade deixaria blocos futuros fora da grade.',
            details: { blockIds: conflicts.map(({ blockId }) => blockId) },
          },
        });
      }
      await transaction.availabilityInterval.deleteMany({
        where: { studentId },
      });
      if (normalized.length > 0) {
        await transaction.availabilityInterval.createMany({
          data: normalized.map((interval) => ({
            studentId,
            weekday: interval.weekday,
            startLocalTime: timeToDatabaseDate(interval.startLocalTime),
            endLocalTime: timeToDatabaseDate(interval.endLocalTime),
          })),
        });
      }
    });
    return this.get(studentId);
  }

  async expand(studentId: string, intervals: AvailabilityIntervalDto[]) {
    const additions = this.validateIntervals(intervals);
    await this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${studentId}, 0))`;
      const current = await transaction.availabilityInterval.findMany({
        where: { studentId, active: true },
        select: {
          weekday: true,
          startLocalTime: true,
          endLocalTime: true,
        },
      });
      const merged = mergeAvailabilityIntervals([
        ...current.map((interval) => ({
          weekday: interval.weekday,
          startLocalTime: databaseTimeToString(interval.startLocalTime),
          endLocalTime: databaseTimeToString(interval.endLocalTime),
        })),
        ...additions,
      ]);
      const conflicts = await this.findFutureBlockConflicts(
        studentId,
        merged,
        transaction,
      );
      if (conflicts.length > 0) {
        throw new ConflictException({
          error: {
            code: 'AVAILABILITY_HAS_AFFECTED_BLOCKS',
            message:
              'A nova disponibilidade deixaria blocos futuros fora da grade.',
            details: { blockIds: conflicts.map(({ blockId }) => blockId) },
          },
        });
      }
      await transaction.availabilityInterval.deleteMany({
        where: { studentId },
      });
      if (merged.length > 0) {
        await transaction.availabilityInterval.createMany({
          data: merged.map((interval) => ({
            studentId,
            weekday: interval.weekday,
            startLocalTime: timeToDatabaseDate(interval.startLocalTime),
            endLocalTime: timeToDatabaseDate(interval.endLocalTime),
          })),
        });
      }
    });
    return this.get(studentId);
  }

  private validateIntervals(intervals: AvailabilityIntervalDto[]) {
    const normalized = intervals
      .map((interval) => ({
        ...interval,
        startLocalTime: normalizeTime(interval.startLocalTime),
        endLocalTime: normalizeTime(interval.endLocalTime),
      }))
      .sort((left, right) =>
        left.weekday === right.weekday
          ? timeToSeconds(left.startLocalTime) -
            timeToSeconds(right.startLocalTime)
          : left.weekday - right.weekday,
      );

    for (const [index, interval] of normalized.entries()) {
      if (
        timeToSeconds(interval.startLocalTime) >=
        endTimeToSeconds(interval.endLocalTime)
      ) {
        this.throwInvalid('O horário final deve ser posterior ao inicial.');
      }
      const previous = normalized[index - 1];
      if (
        previous?.weekday === interval.weekday &&
        timeToSeconds(interval.startLocalTime) <
          endTimeToSeconds(previous.endLocalTime)
      ) {
        this.throwInvalid('Intervalos do mesmo dia não podem se sobrepor.');
      }
    }
    return normalized;
  }

  private async findFutureBlockConflicts(
    studentId: string,
    intervals: AvailabilityIntervalDto[],
    client: PrismaService | Prisma.TransactionClient,
  ) {
    const blocks = await client.studyBlock.findMany({
      where: {
        studentId,
        startsAt: { gt: new Date() },
        status: {
          in: [
            BlockStatus.CONFIRMED,
            BlockStatus.IN_PROGRESS,
            BlockStatus.PAUSED,
            BlockStatus.OVERDUE,
          ],
        },
      },
      select: { id: true, startsAt: true, endsAt: true },
    });

    return blocks.flatMap((block) => {
      const start = instantToLocalPoint(block.startsAt);
      const end = instantToLocalPoint(block.endsAt);
      const endSeconds = rangeEndSeconds(
        start,
        end,
        block.startsAt,
        block.endsAt,
      );
      const fits =
        endSeconds !== null &&
        intervals.some(
          (interval) =>
            interval.weekday === start.weekday &&
            timeToSeconds(interval.startLocalTime) <= start.seconds &&
            endTimeToSeconds(interval.endLocalTime) >= endSeconds,
        );
      return fits
        ? []
        : [
            {
              blockId: block.id,
              startsAt: block.startsAt,
              endsAt: block.endsAt,
            },
          ];
    });
  }

  private throwInvalid(message: string): never {
    throw new UnprocessableEntityException({
      error: { code: 'INVALID_AVAILABILITY', message },
    });
  }
}
