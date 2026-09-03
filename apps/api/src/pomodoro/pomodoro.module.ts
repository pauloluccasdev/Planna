import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PomodoroController } from './pomodoro.controller.js';
import { PomodoroService } from './pomodoro.service.js';

@Module({
  imports: [AuthModule],
  controllers: [PomodoroController],
  providers: [PomodoroService],
})
export class PomodoroModule {}
