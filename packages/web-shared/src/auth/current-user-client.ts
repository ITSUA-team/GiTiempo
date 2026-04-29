import { userResponseSchema, type UserResponse } from "@gitiempo/shared";

/* eslint-disable no-unused-vars */

interface CurrentUserClientOptions {
  apiBaseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface CurrentUserClient {
  getCurrentUser(accessToken: string): Promise<UserResponse>;
}

/* eslint-enable no-unused-vars */

function getApiBaseUrl(apiBaseUrl: string | undefined): string {
  return apiBaseUrl?.replace(/\/$/, "") ?? "";
}

function getRequestUrl(apiBaseUrl: string | undefined, path: string): string {
  return `${getApiBaseUrl(apiBaseUrl)}${path}`;
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: string;
      message?: string;
    };

    return (
      body.message ?? body.error ?? `Request failed with ${response.status}`
    );
  } catch {
    return `Request failed with ${response.status}`;
  }
}

export function createCurrentUserClient({
  apiBaseUrl,
  fetchFn = fetch,
}: CurrentUserClientOptions = {}): CurrentUserClient {
  return {
    async getCurrentUser(accessToken) {
      const response = await fetchFn(getRequestUrl(apiBaseUrl, "/users/me"), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      return userResponseSchema.parse(await response.json());
    },
  };
}
