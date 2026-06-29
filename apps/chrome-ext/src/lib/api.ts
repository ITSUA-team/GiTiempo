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


const API_UNAVAILABLE_ERROR_MESSAGE =
  "GiTiempo API is temporarily unavailable. Please try again in a moment.";
const API_UNREACHABLE_ERROR_MESSAGE =
  "Unable to reach GiTiempo API. Check your connection and try again.";

function getDefaultResponseErrorMessage(status: number): string {
  if ([502, 503, 504].includes(status)) {
    return API_UNAVAILABLE_ERROR_MESSAGE;
  }

  return `Request failed with ${status}`;
}

function getResponseErrorMessage(status: number, body: unknown): string {
  if ([502, 503, 504].includes(status)) {
    return API_UNAVAILABLE_ERROR_MESSAGE;
  }

  if (body && typeof body === "object") {
    const payload = body as { error?: string; message?: string };

    if (typeof payload.message === "string" && payload.message.trim().length > 0) {
      return payload.message;
    }

    if (typeof payload.error === "string" && payload.error.trim().length > 0) {
      return payload.error;
    }
  }

  return getDefaultResponseErrorMessage(status);
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

async function fetchWithHandledNetworkError(
  fetcher: () => Promise<Response>,
): Promise<Response> {
  try {
    return await fetcher();
  } catch {
    throw new Error(API_UNREACHABLE_ERROR_MESSAGE);
  }
}

export function createExtensionApiClient({
  config,
  fetchFn = globalThis.fetch.bind(globalThis),
  storage,
}: ExtensionApiClientOptions): ExtensionApiClient {
  let refreshPromise: Promise<TokenPairResponse | null> | null = null;

  async function loginWithFirebaseToken(
    firebaseIdToken: string,
  ): Promise<TokenPairResponse> {
    const response = await fetchWithHandledNetworkError(() =>
      fetchFn(getRequestUrl(config, "/auth/login"), {
        body: JSON.stringify(loginRequestSchema.parse({ firebaseIdToken })),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );
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
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      try {
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
      } catch {
        await clearStoredSession(storage);
        return null;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
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
      fetchWithHandledNetworkError(() =>
        fetchFn(getRequestUrl(config, options.path), {
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(options.body !== undefined
              ? { "Content-Type": "application/json" }
              : {}),
          },
          method: options.method ?? "GET",
        }),
      );

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
