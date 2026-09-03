import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AvailabilityModule } from '../availability/availability.module.js';
import { StudyBlocksController } from './study-blocks.controller.js';
import { StudyBlocksService } from './study-blocks.service.js';

@Module({
  imports: [AuthModule, AvailabilityModule],
  controllers: [StudyBlocksController],
  providers: [StudyBlocksService],
})
export class StudyBlocksModule {}
