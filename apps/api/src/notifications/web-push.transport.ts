import { Injectable } from '@nestjs/common';
import webpush from 'web-push';
import { getWebPushConfiguration } from '../config/environment.js';

export type PushTarget = {
  endpoint: string;
  publicKey: string;
  authSecret: string;
};

export type PushPayload = {
  title: string;
  body: string;
  url: string;
};

export type PushResult =
  { delivered: true } | { delivered: false; permanent: boolean; code: string };

@Injectable()
export class WebPushTransport {
  private configured = false;

  async send(target: PushTarget, payload: PushPayload): Promise<PushResult> {
    this.configure();
    try {
      await webpush.sendNotification(
        {
          endpoint: target.endpoint,
          keys: { p256dh: target.publicKey, auth: target.authSecret },
        },
        JSON.stringify(payload),
        { TTL: 300 },
      );
      return { delivered: true };
    } catch (error) {
      const statusCode = this.statusCode(error);
      return {
        delivered: false,
        permanent: statusCode === 404 || statusCode === 410,
        code: statusCode
          ? `WEB_PUSH_${statusCode}`
          : 'WEB_PUSH_TRANSPORT_ERROR',
      };
    }
  }

  private configure() {
    if (this.configured) return;
    const config = getWebPushConfiguration();
    webpush.setVapidDetails(
      config.subject,
      config.publicKey,
      config.privateKey,
    );
    this.configured = true;
  }

  private statusCode(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null) return undefined;
    const value = Reflect.get(error, 'statusCode');
    return typeof value === 'number' ? value : undefined;
  }
}
