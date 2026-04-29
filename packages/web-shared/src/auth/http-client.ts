import {
  loginRequestSchema,
  refreshRequestSchema,
  tokenPairResponseSchema,
  type TokenPairResponse,
} from "@gitiempo/shared";
import type { ZodType } from "zod";

/* eslint-disable no-unused-vars */

interface PostJsonInit {
  headers?: Record<string, string>;
}

interface AuthHttpClientOptions {
  apiBaseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface AuthHttpClient {
  loginWithFirebaseToken(firebaseIdToken: string): Promise<TokenPairResponse>;
  logoutAuthSession(accessToken: string, refreshToken: string): Promise<void>;
  refreshAuthSession(refreshToken: string): Promise<TokenPairResponse>;
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

async function postJson<TBody, TResponse>(
  fetchFn: typeof fetch,
  apiBaseUrl: string | undefined,
  path: string,
  body: TBody,
  responseSchema: ZodType<TResponse>,
  init?: PostJsonInit,
): Promise<TResponse> {
  const response = await fetchFn(getRequestUrl(apiBaseUrl, path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
    ...init,
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return responseSchema.parse(await response.json());
}

export function createAuthHttpClient({
  apiBaseUrl,
  fetchFn = fetch,
}: AuthHttpClientOptions = {}): AuthHttpClient {
  return {
    loginWithFirebaseToken(firebaseIdToken) {
      return postJson(
        fetchFn,
        apiBaseUrl,
        "/auth/login",
        loginRequestSchema.parse({ firebaseIdToken }),
        tokenPairResponseSchema,
      );
    },
    async logoutAuthSession(accessToken, refreshToken) {
      const response = await fetchFn(getRequestUrl(apiBaseUrl, "/auth/logout"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }
    },
    refreshAuthSession(refreshToken) {
      return postJson(
        fetchFn,
        apiBaseUrl,
        "/auth/refresh",
        refreshRequestSchema.parse({ refreshToken }),
        tokenPairResponseSchema,
      );
    },
  };
}
