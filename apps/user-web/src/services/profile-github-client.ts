import {
  githubAuthUrlResponseSchema,
  githubConnectionStatusResponseSchema,
  type GitHubAuthUrlResponse,
  type GitHubConnectionStatusResponse,
} from "@gitiempo/shared";
import {
  getRequestUrl,
  getResponseErrorMessage,
  requestJson,
} from "@gitiempo/web-shared/http";

/* eslint-disable no-unused-vars */

interface ProfileGitHubClientOptions {
  apiBaseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface ProfileGitHubClient {
  disconnect(accessToken: string): Promise<void>;
  getAuthUrl(accessToken: string): Promise<GitHubAuthUrlResponse>;
  getConnectionStatus(accessToken: string): Promise<GitHubConnectionStatusResponse>;
}

/* eslint-enable no-unused-vars */

export function createProfileGitHubClient({
  apiBaseUrl,
  fetchFn = fetch,
}: ProfileGitHubClientOptions = {}): ProfileGitHubClient {
  return {
    async disconnect(accessToken) {
      const response = await fetchFn(getRequestUrl(apiBaseUrl, "/github/connection"), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response));
      }
    },
    getAuthUrl(accessToken) {
      return requestJson({
        accessToken,
        apiBaseUrl,
        fetchFn,
        path: "/github/auth-url",
        responseSchema: githubAuthUrlResponseSchema,
      });
    },
    getConnectionStatus(accessToken) {
      return requestJson({
        accessToken,
        apiBaseUrl,
        fetchFn,
        path: "/github/connection",
        responseSchema: githubConnectionStatusResponseSchema,
      });
    },
  };
}
