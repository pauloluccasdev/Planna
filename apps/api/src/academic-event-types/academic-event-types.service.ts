import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateAcademicEventTypeDto } from './dto/create-academic-event-type.dto.js';
import type { UpdateAcademicEventTypeDto } from './dto/update-academic-event-type.dto.js';

const typeSelection = {
  id: true,
  name: true,
  isSystem: true,
  createdAt: true,
} as const;

@Injectable()
export class AcademicEventTypesService {
  constructor(private readonly prisma: PrismaService) {}

  list(studentId: string) {
    return this.prisma.academicEventType.findMany({
      where: {
        archivedAt: null,
        OR: [
          { isSystem: true, studentId: null },
          { isSystem: false, studentId },
        ],
      },
      select: typeSelection,
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  create(studentId: string, input: CreateAcademicEventTypeDto) {
    return this.prisma.academicEventType.create({
      data: { studentId, name: input.name.trim(), isSystem: false },
      select: typeSelection,
    });
  }

  async update(
    studentId: string,
    id: string,
    input: UpdateAcademicEventTypeDto,
  ) {
    await this.requireCustomType(studentId, id);
    return this.prisma.academicEventType.update({
      where: { id },
      data: { name: input.name.trim() },
      select: typeSelection,
    });
  }

  async remove(studentId: string, id: string): Promise<void> {
    await this.requireCustomType(studentId, id);
    const eventCount = await this.prisma.academicEvent.count({
      where: { eventTypeId: id },
    });
    if (eventCount > 0) {
      await this.prisma.academicEventType.update({
        where: { id },
        data: { archivedAt: new Date() },
      });
      return;
    }
    await this.prisma.academicEventType.delete({ where: { id } });
  }

  private async requireCustomType(studentId: string, id: string) {
    const type = await this.prisma.academicEventType.findFirst({
      where: { id, archivedAt: null },
      select: { studentId: true, isSystem: true },
    });
    if (!type) {
      throw new NotFoundException({
        error: {
          code: 'ACADEMIC_EVENT_TYPE_NOT_FOUND',
          message: 'Tipo de evento não encontrado.',
        },
      });
    }
    if (type.isSystem || type.studentId !== studentId) {
      throw new ForbiddenException({
        error: {
          code: 'SYSTEM_EVENT_TYPE_READ_ONLY',
          message: 'Este tipo de evento não pode ser alterado.',
        },
      });
    }
  }
}
