import {
  currentTimeEntryResponseSchema,
  loginRequestSchema,
  refreshRequestSchema,
  startTimerFromGitHubSchema,
  timeEntryResponseSchema,
  tokenPairResponseSchema,
  type CurrentTimeEntryResponse,
  type TimeEntryResponse,
  type TokenPairResponse,
} from "@gitiempo/shared";
import type { ZodType } from "zod";

import type { ExtensionConfig } from "./config";
import type { SupportedGitHubIssueContext } from "./github-context";
import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
  type StorageAreaLike,
} from "./session";

/* eslint-disable no-unused-vars */

export interface ExtensionApiClient {
  getCurrentTimer(): Promise<CurrentTimeEntryResponse>;
  loginWithFirebaseToken(firebaseIdToken: string): Promise<TokenPairResponse>;
  startTimerFromGitHub(
    pageContext: SupportedGitHubIssueContext,
  ): Promise<TimeEntryResponse>;
  stopTimer(): Promise<TimeEntryResponse>;
}

interface ExtensionApiClientOptions {
  config: ExtensionConfig;
  fetchFn?: typeof fetch;
  storage?: StorageAreaLike;
}

/* eslint-enable no-unused-vars */

function getResponseErrorMessage(status: number, body: unknown): string {
  if (body && typeof body === "object") {
    const payload = body as { error?: string; message?: string };

    return payload.message ?? payload.error ?? `Request failed with ${status}`;
  }

  return `Request failed with ${status}`;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getRequestUrl(config: ExtensionConfig, path: string): string {
  return `${config.apiBaseUrl}${path}`;
}

export function createExtensionApiClient({
  config,
  fetchFn = globalThis.fetch.bind(globalThis),
  storage,
}: ExtensionApiClientOptions): ExtensionApiClient {
  async function loginWithFirebaseToken(
    firebaseIdToken: string,
  ): Promise<TokenPairResponse> {
    const response = await fetchFn(getRequestUrl(config, "/auth/login"), {
      body: JSON.stringify(loginRequestSchema.parse({ firebaseIdToken })),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const body = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(getResponseErrorMessage(response.status, body));
    }

    const tokenPair = tokenPairResponseSchema.parse(body);

    await setStoredSession(tokenPair, storage);

    return tokenPair;
  }

  async function refreshSession(
    refreshToken: string,
  ): Promise<TokenPairResponse | null> {
    const response = await fetchFn(getRequestUrl(config, "/auth/refresh"), {
      body: JSON.stringify(refreshRequestSchema.parse({ refreshToken })),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const body = await parseJsonResponse(response);

    if (!response.ok) {
      await clearStoredSession(storage);
      return null;
    }

    const tokenPair = tokenPairResponseSchema.parse(body);

    await setStoredSession(tokenPair, storage);

    return tokenPair;
  }

  async function requestWithAuth<TResponse>(options: {
    body?: unknown;
    method?: string;
    path: string;
    responseSchema: Pick<ZodType<TResponse>, "parse">;
  }): Promise<TResponse> {
    const session = await getStoredSession(storage);

    if (!session) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    const makeRequest = async (accessToken: string): Promise<Response> =>
      fetchFn(getRequestUrl(config, options.path), {
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(options.body !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
        },
        method: options.method ?? "GET",
      });

    let response = await makeRequest(session.accessToken);
    let body = await parseJsonResponse(response);

    if (response.status === 401) {
      const refreshedSession = await refreshSession(session.refreshToken);

      if (!refreshedSession) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      response = await makeRequest(refreshedSession.accessToken);
      body = await parseJsonResponse(response);
    }

    if (!response.ok) {
      throw new Error(getResponseErrorMessage(response.status, body));
    }

    return options.responseSchema.parse(body);
  }

  return {
    getCurrentTimer() {
      return requestWithAuth({
        path: "/time-entries/current",
        responseSchema: currentTimeEntryResponseSchema,
      });
    },
    loginWithFirebaseToken,
    startTimerFromGitHub(pageContext) {
      return requestWithAuth({
        body: startTimerFromGitHubSchema.parse({
          githubRepo: pageContext.githubRepo,
          issueNumber: pageContext.issueNumber,
          issueTitle: pageContext.issueTitle,
        }),
        method: "POST",
        path: "/time-entries/timer/start-from-github",
        responseSchema: timeEntryResponseSchema,
      });
    },
    stopTimer() {
      return requestWithAuth({
        method: "POST",
        path: "/time-entries/timer/stop",
        responseSchema: timeEntryResponseSchema,
      });
    },
  };
}
