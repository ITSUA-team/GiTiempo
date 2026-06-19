import { Module } from '@nestjs/common';
import { GithubModule } from '../github/github.module';
import { MembersModule } from '../members/members.module';
import { WorkspacesController } from './controllers/workspaces.controller';
import { WorkspacesService } from './services/workspaces.service';

@Module({
  imports: [MembersModule, GithubModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
