import { Module } from '@nestjs/common';
import { OverdueService } from './overdue.service.js';

@Module({
  providers: [OverdueService],
  exports: [OverdueService],
})
export class OverdueModule {}
