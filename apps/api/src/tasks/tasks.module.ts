import { Module } from '@nestjs/common';
import { GithubModule } from '../github/github.module';
import { ProjectsModule } from '../projects/projects.module';
import { TasksController } from './controllers/tasks.controller';
import { TasksService } from './services/tasks.service';

@Module({
  imports: [GithubModule, ProjectsModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
