import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  GitHubAuthUrlResponse,
  GitHubConnectionStatusResponse,
} from '@gitiempo/shared';
import type { Env } from '../../config/env.validation';
import type { AuthUser } from '../../auth/types/auth-user';
import { GithubConnectionsService } from './github-connections.service';
import { GithubOauthClientService } from './github-oauth-client.service';
import { GithubOauthStateService } from './github-oauth-state.service';

export type GithubCallbackError =
  | 'github_denied'
  | 'invalid_callback'
  | 'invalid_state'
  | 'github_config'
  | 'github_exchange_failed';

@Injectable()
export class GithubService {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly states: GithubOauthStateService,
    private readonly oauthClient: GithubOauthClientService,
    private readonly connections: GithubConnectionsService,
  ) {}

  connectionStatus(user: AuthUser): Promise<GitHubConnectionStatusResponse> {
    return this.connections.status(user.sub);
  }

  async authUrl(user: AuthUser): Promise<GitHubAuthUrlResponse> {
    const state = await this.states.create(user.sub);
    return {
      authorizationUrl: this.oauthClient.buildAuthorizationUrl(state),
    };
  }

  async disconnect(user: AuthUser): Promise<void> {
    await this.connections.disconnect(user.sub);
  }

  async completeCallback(query: {
    code?: string;
    state?: string;
    error?: string;
  }): Promise<string> {
    if (query.error) return this.profileRedirect('github_denied');
    if (!query.code || !query.state) {
      return this.profileRedirect('invalid_callback');
    }

    const state = await this.states.claim(query.state);
    if (!state) return this.profileRedirect('invalid_state');

    try {
      const tokens = await this.oauthClient.exchangeCode(
        query.code,
        state.codeVerifier,
      );
      const profile = await this.oauthClient.getCurrentUser(tokens.accessToken);
      await this.connections.upsertConnected(state.userId, profile, tokens);
      return this.profileRedirect(null);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes('GitHub integration is not configured')
      ) {
        return this.profileRedirect('github_config');
      }
      return this.profileRedirect('github_exchange_failed');
    }
  }

  private profileRedirect(error: GithubCallbackError | null): string {
    const url = new URL(
      '/profile',
      this.config.get('USER_SPA_URL', { infer: true }),
    );
    if (error) {
      url.searchParams.set('github', 'error');
      url.searchParams.set('code', error);
    } else {
      url.searchParams.set('github', 'connected');
    }
    return url.toString();
  }
}
