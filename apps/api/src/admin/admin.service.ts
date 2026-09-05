import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { getRequiredEnvironment } from '../config/environment.js';
import { PrismaService } from '../database/prisma.service.js';
import { AccountStatus } from '../generated/prisma/enums.js';
import type { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto.js';

const accountProjection = {
  id: true,
  username: true,
  email: true,
  role: true,
  status: true,
  emailVerifiedAt: true,
  blockedAt: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AdminService {
  private readonly auth = createClient(
    getRequiredEnvironment('SUPABASE_URL'),
    getRequiredEnvironment('SUPABASE_PUBLISHABLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  constructor(private readonly prisma: PrismaService) {}

  async listUsers(input: ListAdminUsersQueryDto) {
    const query = input.query?.trim();
    const users = await this.prisma.userAccount.findMany({
      where: {
        ...(input.status ? { status: input.status } : {}),
        ...(query
          ? {
              OR: [
                { username: { contains: query, mode: 'insensitive' as const } },
                { email: { contains: query, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      select: accountProjection,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: input.limit + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    });
    const hasMore = users.length > input.limit;
    const data = hasMore ? users.slice(0, input.limit) : users;
    return { data, nextCursor: hasMore ? data.at(-1)?.id : null };
  }

  async getUser(id: string) {
    const user = await this.prisma.userAccount.findUnique({
      where: { id },
      select: accountProjection,
    });
    if (!user) this.throwNotFound();
    return user;
  }

  async blockUser(actorId: string, id: string) {
    if (actorId === id) {
      throw new ConflictException({
        error: {
          code: 'ADMIN_SELF_BLOCK_NOT_ALLOWED',
          message: 'O administrador não pode bloquear a própria conta.',
        },
      });
    }
    return this.changeStatus(actorId, id, AccountStatus.BLOCKED);
  }

  async unblockUser(actorId: string, id: string) {
    return this.changeStatus(actorId, id, AccountStatus.ACTIVE);
  }

  async requestPasswordRecovery(actorId: string, id: string) {
    const user = await this.prisma.userAccount.findUnique({
      where: { id },
      select: { id: true, email: true },
    });
    if (!user) this.throwNotFound();
    const { error } = await this.auth.auth.resetPasswordForEmail(user.email);
    if (error) {
      throw new ConflictException({
        error: {
          code: 'PASSWORD_RECOVERY_UNAVAILABLE',
          message: 'Não foi possível iniciar a recuperação agora.',
        },
      });
    }
    await this.prisma.auditEvent.create({
      data: {
        actorUserId: actorId,
        studentScopeId: id,
        action: 'ADMIN_PASSWORD_RECOVERY_REQUESTED',
        entityType: 'USER_ACCOUNT',
        entityId: id,
      },
    });
    return { requested: true };
  }

  private async changeStatus(
    actorId: string,
    id: string,
    status: AccountStatus,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.userAccount.findUnique({
        where: { id },
        select: accountProjection,
      });
      if (!current) this.throwNotFound();
      if (current.status === status) return current;
      const user = await transaction.userAccount.update({
        where: { id },
        data: {
          status,
          blockedAt: status === AccountStatus.BLOCKED ? new Date() : null,
          blockedByUserId: status === AccountStatus.BLOCKED ? actorId : null,
        },
        select: accountProjection,
      });
      await transaction.auditEvent.create({
        data: {
          actorUserId: actorId,
          studentScopeId: id,
          action:
            status === AccountStatus.BLOCKED
              ? 'ADMIN_ACCOUNT_BLOCKED'
              : 'ADMIN_ACCOUNT_UNBLOCKED',
          entityType: 'USER_ACCOUNT',
          entityId: id,
          metadata: { previousStatus: current.status, newStatus: status },
        },
      });
      return user;
    });
  }

  private throwNotFound(): never {
    throw new NotFoundException({
      error: { code: 'USER_NOT_FOUND', message: 'Conta não encontrada.' },
    });
  }
}
