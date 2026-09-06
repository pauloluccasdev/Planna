import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsCronController } from './notifications-cron.controller.js';

describe('NotificationsCronController', () => {
  const notifications = {
    synchronizeReminders: vi.fn(),
    dispatchDue: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  it('rejects requests without the configured secret', async () => {
    const controller = new NotificationsCronController(notifications as never);

    await expect(controller.dispatch()).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(notifications.synchronizeReminders).not.toHaveBeenCalled();
  });

  it('synchronizes and dispatches notifications for an authorized request', async () => {
    notifications.synchronizeReminders.mockResolvedValue({ created: 2 });
    notifications.dispatchDue.mockResolvedValue({ sent: 1 });
    const controller = new NotificationsCronController(notifications as never);

    await expect(
      controller.dispatch('Bearer test-cron-secret'),
    ).resolves.toEqual({
      data: { scheduled: { created: 2 }, delivered: { sent: 1 } },
    });
  });
});
