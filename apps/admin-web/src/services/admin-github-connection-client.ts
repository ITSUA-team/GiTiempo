import {
  githubConnectionStatusResponseSchema,
  type GitHubConnectionStatusResponse,
} from '@gitiempo/shared';
import type { AuthenticatedApiClient } from '@gitiempo/web-shared/http';

import { getAuthenticatedAppApiClient } from '@/services/api-client';

interface AdminGitHubConnectionClientOptions {
  apiClient: Pick<AuthenticatedApiClient, 'requestJson'>;
}

export interface AdminGitHubConnectionClient {
  getConnectionStatus(): Promise<GitHubConnectionStatusResponse>;
}

export function createAdminGitHubConnectionClient({
  apiClient,
}: AdminGitHubConnectionClientOptions): AdminGitHubConnectionClient {
  return {
    getConnectionStatus() {
      return apiClient.requestJson({
        path: '/github/connection',
        responseSchema: githubConnectionStatusResponseSchema,
      });
    },
  };
}

function createDefaultAdminGitHubConnectionClient(): AdminGitHubConnectionClient {
  return createAdminGitHubConnectionClient({
    apiClient: getAuthenticatedAppApiClient(),
  });
}

export const adminGitHubConnectionClient: AdminGitHubConnectionClient = {
  getConnectionStatus() {
    return createDefaultAdminGitHubConnectionClient().getConnectionStatus();
  },
};
