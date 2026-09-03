import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { StudySessionsController } from './study-sessions.controller.js';
import { StudySessionsService } from './study-sessions.service.js';

@Module({
  imports: [AuthModule],
  controllers: [StudySessionsController],
  providers: [StudySessionsService],
})
export class StudySessionsModule {}
