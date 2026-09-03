import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RecordStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateCourseDto } from './dto/create-course.dto.js';
import type { UpdateCourseDto } from './dto/update-course.dto.js';

const courseSelection = {
  id: true,
  name: true,
  description: true,
  status: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  list(studentId: string, status: RecordStatus = RecordStatus.ACTIVE) {
    return this.prisma.course.findMany({
      where: { studentId, status },
      select: courseSelection,
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
  }

  async get(studentId: string, id: string) {
    const course = await this.prisma.course.findFirst({
      where: { id, studentId },
      select: courseSelection,
    });

    if (!course) this.throwNotFound();
    return course;
  }

  create(studentId: string, input: CreateCourseDto) {
    return this.prisma.course.create({
      data: {
        studentId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
      },
      select: courseSelection,
    });
  }

  async update(studentId: string, id: string, input: UpdateCourseDto) {
    await this.get(studentId, id);
    return this.prisma.course.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name.trim() }),
        ...(input.description === undefined
          ? {}
          : { description: input.description.trim() || null }),
      },
      select: courseSelection,
    });
  }

  async archive(studentId: string, id: string) {
    await this.get(studentId, id);
    return this.prisma.course.update({
      where: { id },
      data: { status: RecordStatus.ARCHIVED, archivedAt: new Date() },
      select: courseSelection,
    });
  }

  async restore(studentId: string, id: string) {
    await this.get(studentId, id);
    return this.prisma.course.update({
      where: { id },
      data: { status: RecordStatus.ACTIVE, archivedAt: null },
      select: courseSelection,
    });
  }

  async remove(studentId: string, id: string): Promise<void> {
    await this.get(studentId, id);
    const historyCount = await this.prisma.course.count({
      where: {
        id,
        studentId,
        OR: [{ academicPeriods: { some: {} } }, { subjects: { some: {} } }],
      },
    });

    if (historyCount > 0) {
      throw new ConflictException({
        error: {
          code: 'ENTITY_HAS_HISTORY',
          message: 'O curso possui histórico e deve ser arquivado.',
        },
      });
    }

    await this.prisma.course.delete({ where: { id } });
  }

  private throwNotFound(): never {
    throw new NotFoundException({
      error: { code: 'COURSE_NOT_FOUND', message: 'Curso não encontrado.' },
    });
  }
}
