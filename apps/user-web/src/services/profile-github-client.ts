import {
  githubAuthUrlResponseSchema,
  githubConnectionStatusResponseSchema,
  githubDisconnectResponseSchema,
  type GitHubAuthUrlResponse,
  type GitHubConnectionStatusResponse,
  type GitHubDisconnectResponse,
} from "@gitiempo/shared";
import type { AuthenticatedApiClient } from "@gitiempo/web-shared/http";

interface ProfileGitHubClientOptions {
  apiClient: Pick<AuthenticatedApiClient, "requestJson" | "requestNoContent">;
}

export interface ProfileGitHubClient {
  disconnect(): Promise<GitHubDisconnectResponse>;
  getAccountAuthUrl(): Promise<GitHubAuthUrlResponse>;
  getAuthUrl(): Promise<GitHubAuthUrlResponse>;
  getConnectionStatus(): Promise<GitHubConnectionStatusResponse>;
}

export function createProfileGitHubClient({
  apiClient,
}: ProfileGitHubClientOptions): ProfileGitHubClient {
  return {
    disconnect() {
      return apiClient.requestJson({
        method: "DELETE",
        path: "/github/connection",
        responseSchema: githubDisconnectResponseSchema,
      });
    },
    getAccountAuthUrl() {
      return apiClient.requestJson({
        credentials: "include",
        path: "/github/account/auth-url",
        responseSchema: githubAuthUrlResponseSchema,
      });
    },
    getAuthUrl() {
      return apiClient.requestJson({
        path: "/github/auth-url",
        responseSchema: githubAuthUrlResponseSchema,
      });
    },
    getConnectionStatus() {
      return apiClient.requestJson({
        path: "/github/connection",
        responseSchema: githubConnectionStatusResponseSchema,
      });
    },
  };
}
