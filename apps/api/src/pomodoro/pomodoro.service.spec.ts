import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { PomodoroService } from './pomodoro.service.js';

describe('PomodoroService', () => {
  it('upserts one preference for the authenticated student', async () => {
    const prisma = {
      pomodoroPreference: { upsert: vi.fn().mockResolvedValue({}) },
    };
    const service = new PomodoroService(prisma as unknown as PrismaService);
    await service.update('student-id', {
      focusSeconds: 3000,
      breakSeconds: 600,
    });
    expect(prisma.pomodoroPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: 'student-id' },
        create: {
          studentId: 'student-id',
          focusSeconds: 3000,
          breakSeconds: 600,
        },
        update: { focusSeconds: 3000, breakSeconds: 600 },
      }),
    );
  });
});
