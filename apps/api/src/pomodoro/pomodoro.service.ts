import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { UpdatePomodoroPreferenceDto } from './dto/update-pomodoro-preference.dto.js';

const preferenceSelection = {
  focusSeconds: true,
  breakSeconds: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class PomodoroService {
  constructor(private readonly prisma: PrismaService) {}

  get(studentId: string) {
    return this.prisma.pomodoroPreference.findUnique({
      where: { studentId },
      select: preferenceSelection,
    });
  }

  update(studentId: string, input: UpdatePomodoroPreferenceDto) {
    return this.prisma.pomodoroPreference.upsert({
      where: { studentId },
      create: { studentId, ...input },
      update: input,
      select: preferenceSelection,
    });
  }
}
