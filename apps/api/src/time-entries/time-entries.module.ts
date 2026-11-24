import { Module } from '@nestjs/common';
import { GithubModule } from '../github/github.module';
import { MembersModule } from '../members/members.module';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users/users.module';
import { ManagementTimeEntriesController } from './controllers/management-time-entries.controller';
import { ManagementTimeEntriesService } from './services/management-time-entries.service';
import { TimeEntriesController } from './controllers/time-entries.controller';
import { TimeEntriesService } from './services/time-entries.service';

@Module({
  imports: [
    GithubModule,
    MembersModule,
    ProjectsModule,
    TasksModule,
    UsersModule,
  ],
  controllers: [TimeEntriesController, ManagementTimeEntriesController],
  providers: [TimeEntriesService, ManagementTimeEntriesService],
  exports: [TimeEntriesService],
})
export class TimeEntriesModule {}
