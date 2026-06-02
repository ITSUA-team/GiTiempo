import {
  githubAuthUrlResponseSchema,
  githubConnectionStatusResponseSchema,
  type GitHubAuthUrlResponse,
  type GitHubConnectionStatusResponse,
} from "@gitiempo/shared";
import type { AuthenticatedApiClient } from "@gitiempo/web-shared/http";

interface ProfileGitHubClientOptions {
  apiClient: Pick<AuthenticatedApiClient, "requestJson" | "requestNoContent">;
}

export interface ProfileGitHubClient {
  disconnect(): Promise<void>;
  getAuthUrl(): Promise<GitHubAuthUrlResponse>;
  getConnectionStatus(): Promise<GitHubConnectionStatusResponse>;
}

export function createProfileGitHubClient({
  apiClient,
}: ProfileGitHubClientOptions): ProfileGitHubClient {
  return {
    async disconnect() {
      await apiClient.requestNoContent({
        method: "DELETE",
        path: "/github/connection",
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
