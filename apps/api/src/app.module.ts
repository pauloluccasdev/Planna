import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { CoursesModule } from './courses/courses.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './database/prisma.module.js';

@Module({
  imports: [PrismaModule, AuthModule, CoursesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
