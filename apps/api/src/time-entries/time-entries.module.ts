import { Module } from '@nestjs/common';
import { MembersModule } from '../members/members.module';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { TimeEntriesController } from './controllers/time-entries.controller';
import { TimeEntriesService } from './services/time-entries.service';

@Module({
  imports: [MembersModule, ProjectsModule, TasksModule],
  controllers: [TimeEntriesController],
  providers: [TimeEntriesService],
  exports: [TimeEntriesService],
})
export class TimeEntriesModule {}
