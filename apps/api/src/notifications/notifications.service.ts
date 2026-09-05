import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { NotificationStatus } from '../generated/prisma/enums.js';
import type { CreatePushSubscriptionDto } from './dto/create-push-subscription.dto.js';
import type { ListNotificationsQueryDto } from './dto/list-notifications-query.dto.js';

const pageSize = 20;
const subscriptionSelection = {
  id: true,
  expiresAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(studentId: string, input: CreatePushSubscriptionDto) {
    const existing = await this.prisma.pushSubscription.findUnique({
      where: { endpoint: input.endpoint },
      select: { id: true, studentId: true },
    });
    if (existing && existing.studentId !== studentId) {
      throw new ConflictException({
        error: {
          code: 'PUSH_SUBSCRIPTION_ALREADY_ASSOCIATED',
          message: 'Esta inscrição já está associada a outra conta.',
        },
      });
    }
    const expiresAt =
      input.expirationTime == null ? null : new Date(input.expirationTime);
    if (existing) {
      return this.prisma.pushSubscription.update({
        where: { id: existing.id },
        data: {
          publicKey: input.keys.p256dh,
          authSecret: input.keys.auth,
          expiresAt,
          revokedAt: null,
        },
        select: subscriptionSelection,
      });
    }
    return this.prisma.pushSubscription.create({
      data: {
        studentId,
        endpoint: input.endpoint,
        publicKey: input.keys.p256dh,
        authSecret: input.keys.auth,
        expiresAt,
      },
      select: subscriptionSelection,
    });
  }

  async unsubscribe(studentId: string, id: string) {
    const result = await this.prisma.pushSubscription.updateMany({
      where: { id, studentId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count !== 1) this.throwSubscriptionNotFound();
    return { id, revoked: true };
  }

  async list(studentId: string, query: ListNotificationsQueryDto) {
    if (query.cursor) {
      const cursor = await this.prisma.notification.findFirst({
        where: { id: query.cursor, studentId },
        select: { id: true },
      });
      if (!cursor) {
        throw new NotFoundException({
          error: {
            code: 'NOTIFICATION_CURSOR_NOT_FOUND',
            message: 'Cursor de notificações inválido.',
          },
        });
      }
    }
    const rows = await this.prisma.notification.findMany({
      where: {
        studentId,
        ...(query.status ? { status: query.status } : {}),
      },
      select: {
        id: true,
        kind: true,
        relatedType: true,
        relatedId: true,
        scheduledFor: true,
        status: true,
        sentAt: true,
        createdAt: true,
      },
      orderBy: [{ scheduledFor: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasNext = rows.length > pageSize;
    const items = rows.slice(0, pageSize);
    return {
      items,
      nextCursor: hasNext ? (items.at(-1)?.id ?? null) : null,
    };
  }

  async read(studentId: string, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        id,
        studentId,
        status: {
          notIn: [NotificationStatus.CANCELLED, NotificationStatus.READ],
        },
      },
      data: { status: NotificationStatus.READ },
    });
    if (result.count !== 1) {
      const existing = await this.prisma.notification.findFirst({
        where: { id, studentId },
        select: { id: true, status: true },
      });
      if (!existing) this.throwNotificationNotFound();
      if (existing.status === NotificationStatus.READ) return existing;
      throw new ConflictException({
        error: {
          code: 'NOTIFICATION_NOT_READABLE',
          message: 'Esta notificação não pode ser marcada como lida.',
        },
      });
    }
    return this.prisma.notification.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        kind: true,
        relatedType: true,
        relatedId: true,
        scheduledFor: true,
        status: true,
        sentAt: true,
      },
    });
  }

  private throwSubscriptionNotFound(): never {
    throw new NotFoundException({
      error: {
        code: 'PUSH_SUBSCRIPTION_NOT_FOUND',
        message: 'Inscrição de notificação não encontrada.',
      },
    });
  }

  private throwNotificationNotFound(): never {
    throw new NotFoundException({
      error: {
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'Notificação não encontrada.',
      },
    });
  }
}
