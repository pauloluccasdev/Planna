import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { ContentPartsService } from './content-parts.service.js';

describe('ContentPartsService', () => {
  const prisma = {
    content: { findFirst: vi.fn() },
    contentPart: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  let service: ContentPartsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ContentPartsService(prisma as unknown as PrismaService);
  });

  it('rejects access to parts of a foreign content', async () => {
    prisma.content.findFirst.mockResolvedValue(null);
    await expect(
      service.list('student-id', 'foreign-content'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.contentPart.findMany).not.toHaveBeenCalled();
  });

  it('requires the complete active parts set when reordering', async () => {
    prisma.content.findFirst.mockResolvedValue({ id: 'content-id' });
    prisma.contentPart.findMany.mockResolvedValue([
      { id: 'part-a', position: 1 },
      { id: 'part-b', position: 2 },
    ]);
    await expect(
      service.reorder('student-id', 'content-id', { partIds: ['part-a'] }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
