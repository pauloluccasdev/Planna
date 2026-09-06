import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { NotificationStatus } from '../generated/prisma/enums.js';
import type { CreatePushSubscriptionDto } from './dto/create-push-subscription.dto.js';
import type { ListNotificationsQueryDto } from './dto/list-notifications-query.dto.js';
import { WebPushTransport } from './web-push.transport.js';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: WebPushTransport,
  ) {}

  async dispatchDue(now = new Date()) {
    const staleBefore = new Date(now.getTime() - 15 * 60_000);
    await this.prisma.notification.updateMany({
      where: {
        status: NotificationStatus.PROCESSING,
        updatedAt: { lt: staleBefore },
      },
      data: { status: NotificationStatus.SCHEDULED },
    });

    const due = await this.prisma.notification.findMany({
      where: {
        status: NotificationStatus.SCHEDULED,
        scheduledFor: { lte: now },
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
      },
      select: {
        id: true,
        studentId: true,
        kind: true,
        relatedType: true,
        relatedId: true,
        attemptCount: true,
      },
      orderBy: [{ scheduledFor: 'asc' }, { id: 'asc' }],
      take: 100,
    });

    const summary = {
      selected: due.length,
      sent: 0,
      retried: 0,
      failed: 0,
      cancelled: 0,
    };
    for (const notification of due) {
      const claimed = await this.prisma.notification.updateMany({
        where: { id: notification.id, status: NotificationStatus.SCHEDULED },
        data: {
          status: NotificationStatus.PROCESSING,
          attemptCount: { increment: 1 },
          failureCode: null,
        },
      });
      if (claimed.count !== 1) continue;

      const subscriptions = await this.prisma.pushSubscription.findMany({
        where: {
          studentId: notification.studentId,
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        select: {
          id: true,
          endpoint: true,
          publicKey: true,
          authSecret: true,
        },
      });
      if (subscriptions.length === 0) {
        await this.finishDispatch(
          notification.id,
          NotificationStatus.CANCELLED,
          {
            failureCode: 'NO_ACTIVE_SUBSCRIPTION',
          },
        );
        summary.cancelled += 1;
        continue;
      }

      let delivered = 0;
      let retryableFailures = 0;
      let lastFailureCode = 'WEB_PUSH_DELIVERY_FAILED';
      for (const subscription of subscriptions) {
        const result = await this.push.send(
          subscription,
          this.payload(notification),
        );
        if (result.delivered) {
          delivered += 1;
          await this.prisma.pushSubscription.update({
            where: { id: subscription.id },
            data: { lastSuccessAt: now },
          });
        } else {
          lastFailureCode = result.code;
          if (result.permanent) {
            await this.prisma.pushSubscription.update({
              where: { id: subscription.id },
              data: { revokedAt: now },
            });
          } else {
            retryableFailures += 1;
          }
        }
      }

      if (delivered > 0) {
        await this.finishDispatch(notification.id, NotificationStatus.SENT, {
          sentAt: now,
        });
        summary.sent += 1;
      } else if (
        retryableFailures === 0 ||
        notification.attemptCount + 1 >= 3
      ) {
        await this.finishDispatch(notification.id, NotificationStatus.FAILED, {
          failureCode: lastFailureCode,
        });
        summary.failed += 1;
      } else {
        const delayMinutes = 5 * 2 ** notification.attemptCount;
        await this.finishDispatch(
          notification.id,
          NotificationStatus.SCHEDULED,
          {
            failureCode: lastFailureCode,
            nextAttemptAt: new Date(now.getTime() + delayMinutes * 60_000),
          },
        );
        summary.retried += 1;
      }
    }
    return summary;
  }

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

  private payload(notification: {
    kind: string;
    relatedType: string | null;
    relatedId: string | null;
  }) {
    const messages: Record<string, string> = {
      STUDY_BLOCK_REMINDER: 'Você tem um bloco de estudo se aproximando.',
      ACADEMIC_EVENT_REMINDER:
        'Você tem um compromisso acadêmico se aproximando.',
      RISK_ALERT: 'Seu planejamento precisa de atenção.',
      OVERDUE_BLOCK: 'Um bloco terminou sem registro de conclusão.',
      REPLANNING_SUGGESTION:
        'Há uma nova sugestão de replanejamento para analisar.',
    };
    return {
      title: 'Planna',
      body:
        messages[notification.kind] ?? 'Você tem uma atualização no Planna.',
      url: this.notificationUrl(
        notification.relatedType,
        notification.relatedId,
      ),
    };
  }

  private notificationUrl(
    relatedType: string | null,
    relatedId: string | null,
  ) {
    if (relatedType === 'study_block' && relatedId) {
      return `/app/blocks/${relatedId}`;
    }
    if (relatedType === 'academic_event' && relatedId) {
      return `/app/events/${relatedId}`;
    }
    return '/app/notifications';
  }

  private async finishDispatch(
    id: string,
    status: NotificationStatus,
    data: {
      sentAt?: Date;
      failureCode?: string;
      nextAttemptAt?: Date;
    },
  ) {
    await this.prisma.notification.update({
      where: { id },
      data: { status, nextAttemptAt: null, ...data },
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
