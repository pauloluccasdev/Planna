import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateContentPartDto } from './dto/create-content-part.dto.js';
import type { ReorderContentPartsDto } from './dto/reorder-content-parts.dto.js';
import type { UpdateContentPartDto } from './dto/update-content-part.dto.js';

const partSelection = {
  id: true,
  contentId: true,
  name: true,
  description: true,
  position: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class ContentPartsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(studentId: string, contentId: string) {
    await this.requireContent(studentId, contentId);
    return this.prisma.contentPart.findMany({
      where: { studentId, contentId, archivedAt: null },
      select: partSelection,
      orderBy: { position: 'asc' },
    });
  }

  async create(
    studentId: string,
    contentId: string,
    input: CreateContentPartDto,
  ) {
    await this.requireContent(studentId, contentId, true);
    return this.prisma.$transaction(async (transaction) => {
      const last = await transaction.contentPart.aggregate({
        where: { contentId },
        _max: { position: true },
      });
      return transaction.contentPart.create({
        data: {
          studentId,
          contentId,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          position: (last._max.position ?? 0) + 1,
        },
        select: partSelection,
      });
    });
  }

  async update(studentId: string, id: string, input: UpdateContentPartDto) {
    await this.get(studentId, id);
    return this.prisma.contentPart.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name.trim() }),
        ...(input.description === undefined
          ? {}
          : { description: input.description.trim() || null }),
      },
      select: partSelection,
    });
  }

  async reorder(
    studentId: string,
    contentId: string,
    input: ReorderContentPartsDto,
  ) {
    await this.requireContent(studentId, contentId, true);
    const current = await this.prisma.contentPart.findMany({
      where: { studentId, contentId, archivedAt: null },
      select: { id: true, position: true },
    });
    const currentIds = new Set(current.map(({ id }) => id));
    if (
      input.partIds.length !== current.length ||
      input.partIds.some((id) => !currentIds.has(id))
    ) {
      throw new UnprocessableEntityException({
        error: {
          code: 'INVALID_PARTS_ORDER',
          message:
            'A ordenação deve conter todas as partes ativas do conteúdo uma única vez.',
        },
      });
    }

    const temporaryBase =
      Math.max(0, ...current.map(({ position }) => position)) +
      input.partIds.length;
    await this.prisma.$transaction(async (transaction) => {
      for (const [index, id] of input.partIds.entries()) {
        await transaction.contentPart.update({
          where: { id },
          data: { position: temporaryBase + index + 1 },
        });
      }
      for (const [index, id] of input.partIds.entries()) {
        await transaction.contentPart.update({
          where: { id },
          data: { position: index + 1 },
        });
      }
    });
    return this.list(studentId, contentId);
  }

  async remove(studentId: string, id: string): Promise<void> {
    await this.get(studentId, id);
    const historyCount = await this.prisma.contentPart.count({
      where: {
        id,
        studentId,
        OR: [
          { proposedBlockLinks: { some: {} } },
          { studyBlockLinks: { some: {} } },
          { sessionCompletions: { some: {} } },
        ],
      },
    });
    if (historyCount > 0) {
      throw new ConflictException({
        error: {
          code: 'ENTITY_HAS_HISTORY',
          message: 'A parte já possui histórico e não pode ser excluída.',
        },
      });
    }
    await this.prisma.contentPart.delete({ where: { id } });
  }

  private async get(studentId: string, id: string) {
    const part = await this.prisma.contentPart.findFirst({
      where: { id, studentId, archivedAt: null },
      select: partSelection,
    });
    if (!part) {
      throw new NotFoundException({
        error: {
          code: 'CONTENT_PART_NOT_FOUND',
          message: 'Parte do conteúdo não encontrada.',
        },
      });
    }
    return part;
  }

  private async requireContent(
    studentId: string,
    contentId: string,
    active = false,
  ) {
    const content = await this.prisma.content.findFirst({
      where: {
        id: contentId,
        studentId,
        ...(active ? { archivedAt: null } : {}),
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
  }
}
