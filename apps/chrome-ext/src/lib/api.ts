import { decodeAccessTokenEmail, decodeAccessTokenWorkspaceId } from "./token";

import {
  currentTimeEntryResponseSchema,
  currentUserWorkspaceMembershipListResponseSchema,
  workspaceResponseSchema,
  type WorkspaceResponse,
  githubSessionRequestSchema,
  loginRequestSchema,
  logoutRequestSchema,
  refreshRequestSchema,
  switchWorkspaceRequestSchema,
  startTimerFromGitHubReferenceSchema,
  trackingCapabilityResponseSchema,
  conditionalStopTimerSchema,
  timeEntryResponseSchema,
  tokenPairResponseSchema,
  type CurrentTimeEntryResponse,
  type CurrentUserWorkspaceMembershipListResponse,
  type TimeEntryResponse,
  type ConditionalStopTimerInput,
  type TrackingCapabilityResponse,
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
import { ExtensionApiError } from "./github-tracking-error";


export interface ExtensionApiClient {
  exchangeGithubSession(
    code: string,
    verifier: string,
  ): Promise<TokenPairResponse>;
  exitSession(): Promise<void>;
  getCurrentTimer(): Promise<CurrentTimeEntryResponse>;
  getWorkspaceMemberships(): Promise<CurrentUserWorkspaceMembershipListResponse>;
  getTrackingCapability(
    pageContext: SupportedGitHubIssueContext,
    expectedContext?: { workspaceId: string; email: string },
  ): Promise<TrackingCapabilityResponse>;
  getWorkspace(): Promise<WorkspaceResponse>;
  loginWithFirebaseToken(firebaseIdToken: string): Promise<TokenPairResponse>;
  startTimerFromGitHub(
    pageContext: SupportedGitHubIssueContext,
    expectedContext?: { workspaceId: string; email: string },
  ): Promise<TimeEntryResponse>;
  stopTimer(input: ConditionalStopTimerInput): Promise<TimeEntryResponse>;
  switchWorkspace(workspaceId: string): Promise<TokenPairResponse>;
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
const REQUEST_TIMEOUT_MS = 15_000;
/** Nothing waits on a revoke, so it gets a short leash rather than none at all. */
const REVOKE_TIMEOUT_MS = 5_000;
const SESSION_EXPIRED_MESSAGE = "Your session has expired. Please sign in again.";
const SESSION_CHANGED_MESSAGE =
  "Your session or workspace changed. Refresh and review the destination before starting.";

function parseGitHubReferenceInput(pageContext: SupportedGitHubIssueContext) {
  return startTimerFromGitHubReferenceSchema.parse({
    githubRepo: pageContext.githubRepo,
    issueNumber: pageContext.issueNumber,
    issueTitle: pageContext.issueTitle,
    issueUrl: pageContext.issueUrl,
  });
}

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

function getResponseErrorCode(body: unknown): string | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const code = (body as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
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
  let refreshRequest: {
    epoch: number;
    promise: Promise<TokenPairResponse | null>;
    refreshToken: string;
  } | null = null;
  let rotationQueue: Promise<void> = Promise.resolve();
  let storageMutationQueue: Promise<void> = Promise.resolve();
  /**
   * A new login, sign-out, or workspace switch supersedes work begun in the
   * previous authenticated context.
   */
  let sessionEpoch = 0;

  function enqueueRotation<T>(operation: () => Promise<T>): Promise<T> {
    const pending = rotationQueue.then(operation, operation);
    rotationQueue = pending.then(
      () => undefined,
      () => undefined,
    );

    return pending;
  }

  function enqueueStorageMutation<T>(operation: () => Promise<T>): Promise<T> {
    const pending = storageMutationQueue.then(operation, operation);
    storageMutationQueue = pending.then(
      () => undefined,
      () => undefined,
    );

    return pending;
  }

  async function storeNewSessionIfCurrent(
    session: TokenPairResponse,
    epoch: number,
  ): Promise<boolean> {
    return enqueueStorageMutation(async () => {
      if (epoch !== sessionEpoch) {
        return false;
      }

      await setStoredSession(session, storage);
      if (epoch === sessionEpoch) {
        return true;
      }

      await clearStoredSession(storage);
      return false;
    });
  }

  async function replaceSessionIfCurrent(
    previousSession: TokenPairResponse,
    nextSession: TokenPairResponse,
    epoch: number,
    advanceEpoch = false,
  ): Promise<TokenPairResponse | null> {
    return enqueueStorageMutation(async () => {
      if (epoch !== sessionEpoch) {
        return null;
      }

      const currentSession = await getStoredSession(storage);
      if (currentSession?.refreshToken !== previousSession.refreshToken) {
        return currentSession;
      }

      await setStoredSession(nextSession, storage);
      if (epoch !== sessionEpoch) {
        await clearStoredSession(storage);
        return null;
      }

      if (advanceEpoch) {
        sessionEpoch += 1;
      }

      return nextSession;
    });
  }

  async function clearSessionIfCurrent(
    session: TokenPairResponse,
    epoch: number,
  ): Promise<void> {
    await enqueueStorageMutation(async () => {
      if (epoch !== sessionEpoch) {
        return;
      }

      const currentSession = await getStoredSession(storage);
      if (
        epoch === sessionEpoch &&
        currentSession?.refreshToken === session.refreshToken
      ) {
        await clearStoredSession(storage);
      }
    });
  }

  async function discardSupersededSession(
    session: TokenPairResponse,
    epoch: number,
  ): Promise<boolean> {
    if (epoch === sessionEpoch) {
      return false;
    }

    await enqueueStorageMutation(async () => {
      const currentSession = await getStoredSession(storage);
      if (
        epoch !== sessionEpoch &&
        currentSession?.refreshToken === session.refreshToken
      ) {
        await clearStoredSession(storage);
      }
    });

    await revokeSession(session);
    return true;
  }

  /** Posts an unauthenticated credential and stores the session it mints. */
  async function establishSession(
    path: string,
    body: unknown,
  ): Promise<TokenPairResponse> {
    const epoch = ++sessionEpoch;
    const response = await fetchWithHandledNetworkError(() =>
      fetchFn(getRequestUrl(config, path), {
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }),
    );
    const responseBody = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(getResponseErrorMessage(response.status, responseBody));
    }

    const tokenPair = tokenPairResponseSchema.parse(responseBody);

    if (epoch !== sessionEpoch) {
      await discardSupersededSession(tokenPair, epoch);
      throw new Error(SESSION_CHANGED_MESSAGE);
    }

    if (!(await storeNewSessionIfCurrent(tokenPair, epoch))) {
      await revokeSession(tokenPair);
      throw new Error(SESSION_CHANGED_MESSAGE);
    }

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
    // Invalidate pending authentication work before waiting on storage. A login
    // begun after this point belongs to a newer context and must not be cleared
    // by this sign-out's delayed read.
    sessionEpoch += 1;
    const session = await enqueueStorageMutation(async () => {
      const currentSession = await getStoredSession(storage);
      // A newer login can change the epoch while this read is in flight, but
      // its storage write is behind this queued sign-out. Clear the pair we
      // read before that write gets a chance to persist, otherwise a failed
      // login could leave the explicitly signed-out credentials usable.
      if (currentSession) {
        await clearStoredSession(storage);
      }
      return currentSession;
    });

    if (session) {
      await revokeSession(session);
    }
  }

  async function refreshCurrentSession(
    session: TokenPairResponse,
    requestEpoch: number,
  ): Promise<TokenPairResponse | null> {
    try {
      const response = await fetchFn(getRequestUrl(config, "/auth/refresh"), {
        body: JSON.stringify(
          refreshRequestSchema.parse({ refreshToken: session.refreshToken }),
        ),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const body = await parseJsonResponse(response);

      if (!response.ok) {
        await clearSessionIfCurrent(session, requestEpoch);
        return null;
      }

      const tokenPair = tokenPairResponseSchema.parse(body);

      const acceptedSession = await replaceSessionIfCurrent(
        session,
        tokenPair,
        requestEpoch,
      );
      if (acceptedSession !== tokenPair) {
        await revokeSession(tokenPair);
        return requestEpoch === sessionEpoch ? acceptedSession : null;
      }

      return tokenPair;
    } catch {
      await clearSessionIfCurrent(session, requestEpoch);
      return null;
    }
  }

  function refreshSession(
    refreshToken: string,
    requestEpoch: number,
  ): Promise<TokenPairResponse | null> {
    if (
      refreshRequest?.epoch === requestEpoch &&
      refreshRequest.refreshToken === refreshToken
    ) {
      return refreshRequest.promise;
    }

    const pending = enqueueRotation(async () => {
      if (requestEpoch !== sessionEpoch) {
        return null;
      }

      const session = await getStoredSession(storage);
      if (!session) {
        return null;
      }

      if (session.refreshToken !== refreshToken) {
        return session;
      }

      return refreshCurrentSession(session, requestEpoch);
    });
    const request = { epoch: requestEpoch, promise: pending, refreshToken };
    refreshRequest = request;
    void pending.then(
      () => {
        if (refreshRequest === request) refreshRequest = null;
      },
      () => {
        if (refreshRequest === request) refreshRequest = null;
      },
    );

    return pending;
  }

  async function switchWorkspace(workspaceId: string): Promise<TokenPairResponse> {
    const requestEpoch = sessionEpoch;

    return enqueueRotation(async () => {
      if (requestEpoch !== sessionEpoch) {
        throw new Error(SESSION_CHANGED_MESSAGE);
      }

      let session = await getStoredSession(storage);
      if (!session) {
        throw new Error(SESSION_EXPIRED_MESSAGE);
      }

      if (decodeAccessTokenWorkspaceId(session.accessToken) === workspaceId) {
        return session;
      }

      const requestSwitch = (activeSession: TokenPairResponse) =>
        fetchWithHandledNetworkError(() =>
          fetchFn(getRequestUrl(config, "/auth/switch-workspace"), {
            body: JSON.stringify(
              switchWorkspaceRequestSchema.parse({
                refreshToken: activeSession.refreshToken,
                workspaceId,
              }),
            ),
            headers: {
              Authorization: `Bearer ${activeSession.accessToken}`,
              "Content-Type": "application/json",
            },
            method: "POST",
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          }),
        );

      let response: Response;
      try {
        response = await requestSwitch(session);
      } catch (error) {
        await clearSessionIfCurrent(session, requestEpoch);
        throw error;
      }

      let body = await parseJsonResponse(response);
      if (response.status === 401) {
        const refreshedSession = await refreshCurrentSession(session, requestEpoch);
        if (!refreshedSession) {
          throw new Error(SESSION_EXPIRED_MESSAGE);
        }

        session = refreshedSession;
        try {
          response = await requestSwitch(session);
        } catch (error) {
          await clearSessionIfCurrent(session, requestEpoch);
          throw error;
        }
        body = await parseJsonResponse(response);
      }

      if (!response.ok) {
        if (response.status === 401) {
          await clearSessionIfCurrent(session, requestEpoch);
        }
        throw new ExtensionApiError(
          getResponseErrorMessage(response.status, body),
          getResponseErrorCode(body),
        );
      }

      let tokenPair: TokenPairResponse;
      try {
        tokenPair = tokenPairResponseSchema.parse(body);
      } catch (error) {
        await clearSessionIfCurrent(session, requestEpoch);
        throw error;
      }

      const acceptedSession = await replaceSessionIfCurrent(
        session,
        tokenPair,
        requestEpoch,
        true,
      );
      if (acceptedSession !== tokenPair) {
        await revokeSession(tokenPair);
        throw new Error(SESSION_CHANGED_MESSAGE);
      }

      return tokenPair;
    });
  }

  async function requestWithAuth<TResponse>(options: {
    body?: unknown;
    method?: string;
    path: string;
    responseSchema: Pick<ZodType<TResponse>, "parse">;
    expectedContext?: { workspaceId: string; email: string };
  }): Promise<TResponse> {
    const requestEpoch = sessionEpoch;
    const session = await getStoredSession(storage);

    if (!session) {
      throw new Error(SESSION_EXPIRED_MESSAGE);
    }

    const makeRequest = async (accessToken: string): Promise<Response> => {
      if (requestEpoch !== sessionEpoch) {
        throw new Error(SESSION_CHANGED_MESSAGE);
      }
      if (options.expectedContext &&
          (decodeAccessTokenEmail(accessToken) !== options.expectedContext.email ||
           decodeAccessTokenWorkspaceId(accessToken) !== options.expectedContext.workspaceId)) {
        throw new Error(SESSION_CHANGED_MESSAGE);
      }
      return fetchWithHandledNetworkError(() =>
        fetchFn(getRequestUrl(config, options.path), {
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(options.body !== undefined
              ? { "Content-Type": "application/json" }
              : {}),
          },
          method: options.method ?? "GET",
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }),
      );
    };

    let response = await makeRequest(session.accessToken);
    let body = await parseJsonResponse(response);

    if (response.status === 401) {
      const refreshedSession = await refreshSession(session.refreshToken, requestEpoch);

      if (!refreshedSession) {
        throw new Error(SESSION_EXPIRED_MESSAGE);
      }

      response = await makeRequest(refreshedSession.accessToken);
      body = await parseJsonResponse(response);
    }

    if (!response.ok) {
      throw new ExtensionApiError(
        getResponseErrorMessage(response.status, body),
        getResponseErrorCode(body),
      );
    }

    if (requestEpoch !== sessionEpoch) {
      throw new Error(SESSION_CHANGED_MESSAGE);
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
    getWorkspaceMemberships() {
      return requestWithAuth({
        path: "/users/me/workspaces",
        responseSchema: currentUserWorkspaceMembershipListResponseSchema,
      });
    },
    getTrackingCapability(pageContext, expectedContext): Promise<TrackingCapabilityResponse> {
      return requestWithAuth<TrackingCapabilityResponse>({
        expectedContext,
        body: parseGitHubReferenceInput(pageContext),
        method: "POST",
        path: "/time-entries/timer/capability",
        responseSchema: trackingCapabilityResponseSchema as Pick<
          ZodType<TrackingCapabilityResponse>,
          "parse"
        >,
      });
    },
    getWorkspace() {
      return requestWithAuth({ path: "/workspace", responseSchema: workspaceResponseSchema });
    },
    loginWithFirebaseToken,
    startTimerFromGitHub(pageContext, expectedContext) {
      return requestWithAuth({
        expectedContext,
        body: parseGitHubReferenceInput(pageContext),
        method: "POST",
        path: "/time-entries/timer/start-from-github-reference",
        responseSchema: timeEntryResponseSchema,
      });
    },
    stopTimer(input) {
      return requestWithAuth({
        body: conditionalStopTimerSchema.parse(input),
        method: "POST",
        path: "/time-entries/timer/stop",
        responseSchema: timeEntryResponseSchema,
      });
    },
    switchWorkspace,
  };
}
