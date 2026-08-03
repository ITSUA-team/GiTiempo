import { Module } from '@nestjs/common';
import { GithubModule } from '../github/github.module';
import { MembersModule } from '../members/members.module';
import { TasksModule } from '../tasks/tasks.module';
import { ProjectImportsController } from './controllers/project-imports.controller';
import { ProjectImportsService } from './services/project-imports.service';

@Module({
  imports: [GithubModule, MembersModule, TasksModule],
  controllers: [ProjectImportsController],
  providers: [ProjectImportsService],
})
export class ProjectImportsModule {}
