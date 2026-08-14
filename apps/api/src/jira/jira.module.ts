import { Module } from '@nestjs/common';
import { GithubModule } from '../github/github.module';
import { JiraController } from './controllers/jira.controller';
import { JiraConnectionsService } from './services/jira-connections.service';
import { JiraOauthClientService } from './services/jira-oauth-client.service';
import { JiraOauthStateService } from './services/jira-oauth-state.service';
import { JiraService } from './services/jira.service';

@Module({
  imports: [GithubModule],
  controllers: [JiraController],
  providers: [
    JiraConnectionsService,
    JiraOauthClientService,
    JiraOauthStateService,
    JiraService,
  ],
  exports: [JiraConnectionsService],
})
export class JiraModule {}
