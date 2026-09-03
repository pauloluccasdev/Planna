import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateAcademicPeriodDto } from './dto/create-academic-period.dto.js';
import type { UpdateAcademicPeriodDto } from './dto/update-academic-period.dto.js';

const periodSelection = {
  id: true,
  courseId: true,
  name: true,
  position: true,
  startsOn: true,
  endsOn: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toDatabaseDate(
  value: string | null | undefined,
): Date | null | undefined {
  if (value === undefined) return undefined;
  return value === null ? null : new Date(`${value}T00:00:00.000Z`);
}

@Injectable()
export class AcademicPeriodsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(studentId: string, courseId: string) {
    await this.requireCourse(studentId, courseId);
    return this.prisma.academicPeriod.findMany({
      where: { courseId },
      select: periodSelection,
      orderBy: [{ position: 'asc' }, { startsOn: 'asc' }, { name: 'asc' }],
    });
  }

  async create(
    studentId: string,
    courseId: string,
    input: CreateAcademicPeriodDto,
  ) {
    await this.requireCourse(studentId, courseId);
    this.validateRange(input.startsOn, input.endsOn);
    return this.prisma.academicPeriod.create({
      data: {
        courseId,
        name: input.name.trim(),
        position: input.position,
        startsOn: toDatabaseDate(input.startsOn),
        endsOn: toDatabaseDate(input.endsOn),
      },
      select: periodSelection,
    });
  }

  async update(studentId: string, id: string, input: UpdateAcademicPeriodDto) {
    const current = await this.getOwned(studentId, id);
    const startsOn =
      input.startsOn === undefined
        ? current.startsOn
        : toDatabaseDate(input.startsOn);
    const endsOn =
      input.endsOn === undefined
        ? current.endsOn
        : toDatabaseDate(input.endsOn);
    this.validateRange(startsOn, endsOn);

    return this.prisma.academicPeriod.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name.trim() }),
        ...(input.position === undefined ? {} : { position: input.position }),
        ...(input.startsOn === undefined ? {} : { startsOn }),
        ...(input.endsOn === undefined ? {} : { endsOn }),
      },
      select: periodSelection,
    });
  }

  async remove(studentId: string, id: string): Promise<void> {
    await this.getOwned(studentId, id);
    await this.prisma.academicPeriod.delete({ where: { id } });
  }

  private async getOwned(studentId: string, id: string) {
    const period = await this.prisma.academicPeriod.findFirst({
      where: { id, course: { studentId } },
      select: periodSelection,
    });
    if (!period) this.throwNotFound();
    return period;
  }

  private async requireCourse(studentId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, studentId },
      select: { id: true },
    });
    if (!course) {
      throw new NotFoundException({
        error: { code: 'COURSE_NOT_FOUND', message: 'Curso não encontrado.' },
      });
    }
  }

  private validateRange(
    startsOn?: string | Date | null,
    endsOn?: string | Date | null,
  ) {
    if (startsOn && endsOn && new Date(startsOn) > new Date(endsOn)) {
      throw new UnprocessableEntityException({
        error: {
          code: 'INVALID_ACADEMIC_PERIOD_RANGE',
          message: 'A data final deve ser igual ou posterior à data inicial.',
        },
      });
    }
  }

  private throwNotFound(): never {
    throw new NotFoundException({
      error: {
        code: 'ACADEMIC_PERIOD_NOT_FOUND',
        message: 'Período acadêmico não encontrado.',
      },
    });
  }
}
