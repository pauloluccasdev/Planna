import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { AccountStatus, UserRole } from '../generated/prisma/enums.js';
import { AdminService } from './admin.service.js';

const account = {
  id: '10000000-0000-4000-8000-000000000002',
  username: 'aluna',
  email: 'aluna@example.com',
  role: UserRole.STUDENT,
  status: AccountStatus.ACTIVE,
  emailVerifiedAt: null,
  blockedAt: null,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AdminService', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('does not expose academic relations in the account projection', async () => {
    const findMany = vi.fn().mockResolvedValue([account]);
    const service = new AdminService({
      userAccount: { findMany },
    } as unknown as PrismaService);
    const result = await service.listUsers({ limit: 20 });
    expect(result.data).toEqual([account]);
    const select = findMany.mock.calls[0][0].select;
    expect(select).not.toHaveProperty('courses');
    expect(select).not.toHaveProperty('contents');
    expect(select).not.toHaveProperty('studyBlocks');
    expect(select).not.toHaveProperty('studySessions');
  });

  it('blocks an account and writes the audit event atomically', async () => {
    const transaction = {
      userAccount: {
        findUnique: vi.fn().mockResolvedValue(account),
        update: vi.fn().mockResolvedValue({
          ...account,
          status: AccountStatus.BLOCKED,
        }),
      },
      auditEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: vi.fn((callback) => callback(transaction)),
    };
    const service = new AdminService(prisma as unknown as PrismaService);
    await service.blockUser('10000000-0000-4000-8000-000000000001', account.id);
    expect(transaction.userAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: account.id },
        data: expect.objectContaining({
          status: AccountStatus.BLOCKED,
          blockedByUserId: '10000000-0000-4000-8000-000000000001',
        }),
      }),
    );
    expect(transaction.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'ADMIN_ACCOUNT_BLOCKED' }),
      }),
    );
  });

  it('prevents an administrator from blocking their own account', async () => {
    const service = new AdminService({} as PrismaService);
    await expect(
      service.blockUser(account.id, account.id),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
