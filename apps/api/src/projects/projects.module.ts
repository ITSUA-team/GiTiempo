import { Module } from '@nestjs/common';
import { GithubModule } from '../github/github.module';
import { MembersModule } from '../members/members.module';
import { ProjectsController } from './controllers/projects.controller';
import { ProjectsService } from './services/projects.service';

@Module({
  imports: [GithubModule, MembersModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
