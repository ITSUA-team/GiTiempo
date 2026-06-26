import { Module } from '@nestjs/common';
import { MembersModule } from '../members/members.module';
import { ProjectsModule } from '../projects/projects.module';
import { GithubController } from './controllers/github.controller';
import { GithubApiClientService } from './services/github-api-client.service';
import { GithubConnectionsService } from './services/github-connections.service';
import { GithubEncryptionService } from './services/github-encryption.service';
import { GithubOauthClientService } from './services/github-oauth-client.service';
import { GithubOauthStateService } from './services/github-oauth-state.service';
import { GithubTaskMaterializationService } from './services/github-task-materialization.service';
import { GithubService } from './services/github.service';
import { WorkspaceGitHubOrganizationsService } from './services/workspace-github-organizations.service';

@Module({
  imports: [MembersModule, ProjectsModule],
  controllers: [GithubController],
  providers: [
    GithubApiClientService,
    GithubConnectionsService,
    GithubEncryptionService,
    GithubOauthClientService,
    GithubOauthStateService,
    GithubTaskMaterializationService,
    GithubService,
    WorkspaceGitHubOrganizationsService,
  ],
  exports: [
    GithubConnectionsService,
    GithubService,
    GithubTaskMaterializationService,
    WorkspaceGitHubOrganizationsService,
  ],
})
export class GithubModule {}
