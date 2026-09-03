import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ContentPartsController } from './content-parts.controller.js';
import { ContentPartsService } from './content-parts.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ContentPartsController],
  providers: [ContentPartsService],
})
export class ContentPartsModule {}
