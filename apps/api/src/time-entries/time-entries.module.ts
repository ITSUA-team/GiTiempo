import { Module } from '@nestjs/common';
import { GithubModule } from '../github/github.module';
import { MembersModule } from '../members/members.module';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users/users.module';
import { TimeEntriesController } from './controllers/time-entries.controller';
import { TimeEntriesService } from './services/time-entries.service';

@Module({
  imports: [GithubModule, MembersModule, ProjectsModule, TasksModule, UsersModule],
  controllers: [TimeEntriesController],
  providers: [TimeEntriesService],
  exports: [TimeEntriesService],
})
export class TimeEntriesModule {}
