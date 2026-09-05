import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module.js';
import { AcademicPeriodsModule } from './academic-periods/academic-periods.module.js';
import { AcademicEventTypesModule } from './academic-event-types/academic-event-types.module.js';
import { AcademicEventsModule } from './academic-events/academic-events.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CalendarModule } from './calendar/calendar.module.js';
import { AvailabilityModule } from './availability/availability.module.js';
import { ContentPartsModule } from './content-parts/content-parts.module.js';
import { CoursesModule } from './courses/courses.module.js';
import { ContentsModule } from './contents/contents.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './database/prisma.module.js';
import { PomodoroModule } from './pomodoro/pomodoro.module.js';
import { MetricsModule } from './metrics/metrics.module.js';
import { OverdueModule } from './overdue/overdue.module.js';
import { SubjectsModule } from './subjects/subjects.module.js';
import { StudyBlocksModule } from './study-blocks/study-blocks.module.js';
import { StudySessionsModule } from './study-sessions/study-sessions.module.js';

@Module({
  imports: [
    AdminModule,
    PrismaModule,
    AcademicPeriodsModule,
    AcademicEventTypesModule,
    AcademicEventsModule,
    AvailabilityModule,
    AuthModule,
    CalendarModule,
    CoursesModule,
    SubjectsModule,
    ContentsModule,
    ContentPartsModule,
    PomodoroModule,
    MetricsModule,
    OverdueModule,
    StudyBlocksModule,
    StudySessionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
