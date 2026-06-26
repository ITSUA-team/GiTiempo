import { Module } from '@nestjs/common';
import { GithubModule } from '../github/github.module';
import { ProjectsModule } from '../projects/projects.module';
import { TasksController } from './controllers/tasks.controller';
import { GithubTaskMaterializationService } from './services/github-task-materialization.service';
import { TasksService } from './services/tasks.service';

@Module({
  imports: [GithubModule, ProjectsModule],
  controllers: [TasksController],
  providers: [GithubTaskMaterializationService, TasksService],
  exports: [GithubTaskMaterializationService, TasksService],
})
export class TasksModule {}
