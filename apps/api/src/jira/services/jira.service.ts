import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  JiraAuthUrlResponse,
  JiraConnectionStatusResponse,
} from '@gitiempo/shared';
import type { AuthUser } from '../../auth/types/auth-user';
import type { Env } from '../../config/env.validation';
import { JiraConnectionsService } from './jira-connections.service';
import { JiraOauthClientService } from './jira-oauth-client.service';
import { JiraOauthStateService } from './jira-oauth-state.service';

type JiraCallbackError =
  | 'invalid_callback'
  | 'invalid_state'
  | 'jira_config'
  | 'jira_denied'
  | 'jira_exchange_failed';

@Injectable()
export class JiraService {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly connections: JiraConnectionsService,
    private readonly oauthClient: JiraOauthClientService,
    private readonly states: JiraOauthStateService,
  ) {}

  connectionStatus(user: AuthUser): Promise<JiraConnectionStatusResponse> {
    return this.connections.status(user.sub);
  }

  async authUrl(user: AuthUser): Promise<JiraAuthUrlResponse> {
    const state = await this.states.create(user.sub);
    return { authorizationUrl: this.oauthClient.buildAuthorizationUrl(state) };
  }

  async disconnect(user: AuthUser): Promise<void> {
    await this.connections.disconnect(user.sub);
  }

  async completeCallback(query: {
    code?: string;
    state?: string;
    error?: string;
  }): Promise<string> {
    if (query.error) return this.profileRedirect('jira_denied');
    if (!query.code || !query.state) {
      return this.profileRedirect('invalid_callback');
    }

    const state = await this.states.claim(query.state);
    if (!state) return this.profileRedirect('invalid_state');

    try {
      const tokens = await this.oauthClient.exchangeCode(query.code);
      const [profile, sites] = await Promise.all([
        this.oauthClient.getCurrentUser(tokens.accessToken),
        this.oauthClient.listAccessibleSites(tokens.accessToken),
      ]);
      await this.connections.upsertConnected(
        state.userId,
        profile,
        tokens,
        sites,
      );
      return this.profileRedirect(null);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Jira integration is not configured')
      ) {
        return this.profileRedirect('jira_config');
      }
      return this.profileRedirect('jira_exchange_failed');
    }
  }

  private profileRedirect(error: JiraCallbackError | null): string {
    const url = new URL(
      '/profile',
      this.config.get('USER_SPA_URL', { infer: true }),
    );
    if (error) {
      url.searchParams.set('jira', 'error');
      url.searchParams.set('code', error);
    } else {
      url.searchParams.set('jira', 'connected');
    }
    return url.toString();
  }
}
