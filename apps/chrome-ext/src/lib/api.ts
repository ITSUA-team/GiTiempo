import {
  currentTimeEntryResponseSchema,
  githubSessionRequestSchema,
  loginRequestSchema,
  logoutRequestSchema,
  refreshRequestSchema,
  startTimerFromGitHubSchema,
  stopTimerSchema,
  timeEntryResponseSchema,
  tokenPairResponseSchema,
  type CurrentTimeEntryResponse,
  type TimeEntryResponse,
  type StopTimerInput,
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
  exchangeGithubSession(
    code: string,
    verifier: string,
  ): Promise<TokenPairResponse>;
  exitSession(): Promise<void>;
  getCurrentTimer(): Promise<CurrentTimeEntryResponse>;
  loginWithFirebaseToken(firebaseIdToken: string): Promise<TokenPairResponse>;
  startTimerFromGitHub(
    pageContext: SupportedGitHubIssueContext,
  ): Promise<TimeEntryResponse>;
  stopTimer(input: StopTimerInput): Promise<TimeEntryResponse>;
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
/** Nothing waits on a revoke, so it gets a short leash rather than none at all. */
const REVOKE_TIMEOUT_MS = 5_000;

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
  /**
   * Bumped by every deliberate sign-out. A refresh captures it before leaving and
   * refuses to store its result if it changed while the request was in flight.
   */
  let sessionEpoch = 0;

  /** Posts an unauthenticated credential and stores the session it mints. */
  async function establishSession(
    path: string,
    body: unknown,
  ): Promise<TokenPairResponse> {
    const response = await fetchWithHandledNetworkError(() =>
      fetchFn(getRequestUrl(config, path), {
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );
    const responseBody = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(getResponseErrorMessage(response.status, responseBody));
    }

    const tokenPair = tokenPairResponseSchema.parse(responseBody);

    await setStoredSession(tokenPair, storage);

    return tokenPair;
  }

  async function loginWithFirebaseToken(
    firebaseIdToken: string,
  ): Promise<TokenPairResponse> {
    return establishSession(
      "/auth/login",
      loginRequestSchema.parse({ firebaseIdToken }),
    );
  }

  // The handoff code is exchanged on the same unauthenticated footing as a
  // Firebase identity, and yields an indistinguishable token pair, so the two
  // paths converge here rather than each growing their own request plumbing.
  async function exchangeGithubSession(
    code: string,
    verifier: string,
  ): Promise<TokenPairResponse> {
    return establishSession(
      "/auth/github/session",
      githubSessionRequestSchema.parse({ code, verifier }),
    );
  }

  /**
   * Best-effort revoke of one token pair. Bounded by a timeout because nothing
   * downstream may wait on it: the local session is already gone by the time this
   * runs, and an MV3 service worker can be terminated mid-request regardless.
   * The response status is not inspected — every outcome leads to the same place.
   */
  async function revokeSession(session: TokenPairResponse): Promise<void> {
    try {
      await fetchFn(getRequestUrl(config, "/auth/logout"), {
        body: JSON.stringify(
          logoutRequestSchema.parse({ refreshToken: session.refreshToken }),
        ),
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: AbortSignal.timeout(REVOKE_TIMEOUT_MS),
      });
    } catch {
      // Unreachable, refused, or timed out: the token expires on its own.
    }
  }

  /**
   * Ends the session. Storage is cleared **first** and unconditionally, then the
   * backend revoke runs best-effort.
   *
   * The order is deliberate. Revoking first meant an unbounded request stood
   * between the user asking to sign out and the session actually going, so a
   * stalled network — or a service worker terminated mid-flight — could leave them
   * signed in against an explicit request. Reading the pair before clearing keeps
   * the revoke possible, so nothing is traded away by clearing first.
   *
   * Deliberately not routed through `requestWithAuth`: the endpoint answers `204`
   * with no body, which a response-schema parse cannot consume, and a revoke has
   * no response worth parsing anyway.
   */
  async function exitSession(): Promise<void> {
    const session = await getStoredSession(storage);

    // Invalidate any refresh already in flight before clearing, so it cannot
    // store its result afterwards and undo this.
    sessionEpoch += 1;
    await clearStoredSession(storage);

    if (session) {
      await revokeSession(session);
    }
  }

  async function refreshSession(
    refreshToken: string,
  ): Promise<TokenPairResponse | null> {
    if (refreshPromise) {
      return refreshPromise;
    }

    const epoch = sessionEpoch;

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

        if (epoch !== sessionEpoch) {
          // A sign-out landed while this was in flight. Storing the pair would
          // resurrect the session: the backend rotates on refresh, so the logout
          // revoked the row this request had already replaced, leaving the new one
          // valid. Revoke the rotation instead of keeping it.
          await revokeSession(tokenPair);
          return null;
        }

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
    exchangeGithubSession,
    exitSession,
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
    stopTimer(input) {
      return requestWithAuth({
        body: stopTimerSchema.parse(input),
        method: "POST",
        path: "/time-entries/timer/stop",
        responseSchema: timeEntryResponseSchema,
      });
    },
  };
}
