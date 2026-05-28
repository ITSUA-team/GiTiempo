import {
  createAuthenticatedApiClient,
  type AuthenticatedApiClient,
} from '@gitiempo/web-shared/http';

import { appEnv } from '@/config/env';
import { useAuthStore } from '@/stores/auth';

let authenticatedApiClient: AuthenticatedApiClient | null = null;

export function getAuthenticatedAppApiClient(): AuthenticatedApiClient {
  if (authenticatedApiClient) {
    return authenticatedApiClient;
  }

  const authStore = useAuthStore();

  authenticatedApiClient = createAuthenticatedApiClient({
    apiBaseUrl: appEnv.apiBaseUrl,
    getToken: () => authStore.accessToken,
    onRefreshFailed: () => authStore.logout(),
    refreshAccessToken: () => authStore.refreshAccessToken(),
  });

  return authenticatedApiClient;
}
