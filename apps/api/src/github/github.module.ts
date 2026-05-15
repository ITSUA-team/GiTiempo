import { Module } from '@nestjs/common';
import { GithubController } from './controllers/github.controller';
import { GithubApiClientService } from './services/github-api-client.service';
import { GithubConnectionsService } from './services/github-connections.service';
import { GithubEncryptionService } from './services/github-encryption.service';
import { GithubOauthClientService } from './services/github-oauth-client.service';
import { GithubOauthStateService } from './services/github-oauth-state.service';
import { GithubService } from './services/github.service';

@Module({
  controllers: [GithubController],
  providers: [
    GithubApiClientService,
    GithubConnectionsService,
    GithubEncryptionService,
    GithubOauthClientService,
    GithubOauthStateService,
    GithubService,
  ],
  exports: [GithubConnectionsService],
})
export class GithubModule {}
