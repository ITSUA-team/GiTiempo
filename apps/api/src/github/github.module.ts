import { Module } from '@nestjs/common';
import { GithubController } from './controllers/github.controller';
import { GithubInstallationsWebhookController } from './controllers/github-installations-webhook.controller';
import { GithubApiClientService } from './services/github-api-client.service';
import { GithubConnectionsService } from './services/github-connections.service';
import { GithubEncryptionService } from './services/github-encryption.service';
import { GithubOauthClientService } from './services/github-oauth-client.service';
import { GithubOauthStateService } from './services/github-oauth-state.service';
import { GithubService } from './services/github.service';
import { WorkspaceGitHubOrganizationsService } from './services/workspace-github-organizations.service';
import { GithubInstallationTokenProviderService } from './services/github-installation-token-provider.service';
import { GithubInstallationsService } from './services/github-installations.service';

@Module({
  controllers: [GithubController, GithubInstallationsWebhookController],
  providers: [
    GithubApiClientService,
    GithubConnectionsService,
    GithubEncryptionService,
    GithubOauthClientService,
    GithubOauthStateService,
    GithubService,
    WorkspaceGitHubOrganizationsService,
    GithubInstallationTokenProviderService,
    GithubInstallationsService,
  ],
  exports: [
    GithubConnectionsService,
    GithubService,
    WorkspaceGitHubOrganizationsService,
    GithubInstallationsService,
  ],
})
export class GithubModule {}
