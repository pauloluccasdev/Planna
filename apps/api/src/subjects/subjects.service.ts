import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { RecordStatus } from '../generated/prisma/enums.js';
import type { CreateSubjectDto } from './dto/create-subject.dto.js';
import type { ListSubjectsQueryDto } from './dto/list-subjects-query.dto.js';
import type { UpdateSubjectDto } from './dto/update-subject.dto.js';

const subjectSelection = {
  id: true,
  courseId: true,
  academicPeriodId: true,
  name: true,
  description: true,
  status: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(studentId: string, courseId: string, query: ListSubjectsQueryDto) {
    await this.requireCourse(studentId, courseId);
    return this.prisma.subject.findMany({
      where: {
        studentId,
        courseId,
        status: query.status ?? RecordStatus.ACTIVE,
        ...(query.academicPeriodId
          ? { academicPeriodId: query.academicPeriodId }
          : {}),
      },
      select: subjectSelection,
      orderBy: { name: 'asc' },
    });
  }

  async get(studentId: string, id: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id, studentId },
      select: subjectSelection,
    });
    if (!subject) this.throwNotFound();
    return subject;
  }

  async create(studentId: string, courseId: string, input: CreateSubjectDto) {
    await this.requireCourse(studentId, courseId, true);
    if (input.academicPeriodId)
      await this.requirePeriod(courseId, input.academicPeriodId);

    return this.prisma.subject.create({
      data: {
        studentId,
        courseId,
        academicPeriodId: input.academicPeriodId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
      },
      select: subjectSelection,
    });
  }

  async update(studentId: string, id: string, input: UpdateSubjectDto) {
    const subject = await this.get(studentId, id);
    if (input.academicPeriodId)
      await this.requirePeriod(subject.courseId, input.academicPeriodId);

    return this.prisma.subject.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name.trim() }),
        ...(input.description === undefined
          ? {}
          : { description: input.description.trim() || null }),
        ...(input.academicPeriodId === undefined
          ? {}
          : { academicPeriodId: input.academicPeriodId }),
      },
      select: subjectSelection,
    });
  }

  async setArchived(studentId: string, id: string, archived: boolean) {
    await this.get(studentId, id);
    return this.prisma.subject.update({
      where: { id },
      data: {
        status: archived ? RecordStatus.ARCHIVED : RecordStatus.ACTIVE,
        archivedAt: archived ? new Date() : null,
      },
      select: subjectSelection,
    });
  }

  async remove(studentId: string, id: string): Promise<void> {
    await this.get(studentId, id);
    const historyCount = await this.prisma.subject.count({
      where: {
        id,
        studentId,
        OR: [{ contents: { some: {} } }, { academicEvents: { some: {} } }],
      },
    });
    if (historyCount > 0) {
      throw new ConflictException({
        error: {
          code: 'ENTITY_HAS_HISTORY',
          message: 'A disciplina possui histórico e deve ser arquivada.',
        },
      });
    }
    await this.prisma.subject.delete({ where: { id } });
  }

  private async requireCourse(
    studentId: string,
    courseId: string,
    active = false,
  ) {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        studentId,
        ...(active ? { status: RecordStatus.ACTIVE } : {}),
      },
      select: { id: true },
    });
    if (!course) {
      throw new NotFoundException({
        error: { code: 'COURSE_NOT_FOUND', message: 'Curso não encontrado.' },
      });
    }
  }

  private async requirePeriod(courseId: string, academicPeriodId: string) {
    const period = await this.prisma.academicPeriod.findFirst({
      where: { id: academicPeriodId, courseId },
      select: { id: true },
    });
    if (!period) {
      throw new NotFoundException({
        error: {
          code: 'ACADEMIC_PERIOD_NOT_FOUND',
          message: 'Período acadêmico não encontrado neste curso.',
        },
      });
    }
  }

  private throwNotFound(): never {
    throw new NotFoundException({
      error: {
        code: 'SUBJECT_NOT_FOUND',
        message: 'Disciplina não encontrada.',
      },
    });
  }
}
