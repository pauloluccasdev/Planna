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

function timeToDatabaseDate(value: string): Date {
  return new Date(`1970-01-01T${normalizeTime(value)}.000Z`);
}

function databaseTimeToString(value: Date): string {
  return value.toISOString().slice(11, 19);
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
    const start = instantToLocalPoint(startsAt);
    const end = instantToLocalPoint(endsAt);
    if (start.weekday !== end.weekday || startsAt >= endsAt) return false;
    const intervals = await this.prisma.availabilityInterval.findMany({
      where: { studentId, weekday: start.weekday, active: true },
      select: { startLocalTime: true, endLocalTime: true },
    });
    return intervals.some(
      (interval) =>
        timeToSeconds(databaseTimeToString(interval.startLocalTime)) <=
          start.seconds &&
        timeToSeconds(databaseTimeToString(interval.endLocalTime)) >=
          end.seconds,
    );
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
        timeToSeconds(interval.endLocalTime)
      ) {
        this.throwInvalid('O horário final deve ser posterior ao inicial.');
      }
      const previous = normalized[index - 1];
      if (
        previous?.weekday === interval.weekday &&
        timeToSeconds(interval.startLocalTime) <
          timeToSeconds(previous.endLocalTime)
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
      const fits =
        start.weekday === end.weekday &&
        intervals.some(
          (interval) =>
            interval.weekday === start.weekday &&
            timeToSeconds(interval.startLocalTime) <= start.seconds &&
            timeToSeconds(interval.endLocalTime) >= end.seconds,
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
