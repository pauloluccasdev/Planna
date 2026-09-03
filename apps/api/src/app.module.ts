import { Module } from '@nestjs/common';
import { AcademicPeriodsModule } from './academic-periods/academic-periods.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ContentPartsModule } from './content-parts/content-parts.module.js';
import { CoursesModule } from './courses/courses.module.js';
import { ContentsModule } from './contents/contents.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './database/prisma.module.js';
import { SubjectsModule } from './subjects/subjects.module.js';

@Module({
  imports: [
    PrismaModule,
    AcademicPeriodsModule,
    AuthModule,
    CoursesModule,
    SubjectsModule,
    ContentsModule,
    ContentPartsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
