import type { ZodType } from "zod";

interface RequestJsonOptions<TResponse> {
  accessToken?: string;
  apiBaseUrl?: string;
  body?: unknown;
  fetchFn?: typeof fetch;
  headers?: Record<string, string>;
  method?: string;
  path: string;
  responseSchema: ZodType<TResponse>;
  signal?: AbortSignal;
}

export interface ApiRequestOptions {
  auth?: boolean;
  body?: unknown;
  headers?: Record<string, string>;
  method?: string;
  path: string;
  signal?: AbortSignal;
}

export interface ApiRequestJsonOptions<TResponse> extends ApiRequestOptions {
  responseSchema: ZodType<TResponse>;
}

/* eslint-disable no-unused-vars */
export interface AuthenticatedApiClient {
  request(options: ApiRequestOptions): Promise<Response>;
  requestJson<TResponse>(
    options: ApiRequestJsonOptions<TResponse>,
  ): Promise<TResponse>;
  requestNoContent(options: ApiRequestOptions): Promise<void>;
}
/* eslint-enable no-unused-vars */

export interface AuthenticatedApiClientOptions {
  apiBaseUrl?: string;
  fetchFn?: typeof fetch;
  getToken(): string | null | undefined;
  onRefreshFailed(): Promise<void> | void;
  refreshAccessToken(): Promise<string | null | undefined>;
}

export function getDefaultFetchFn(): typeof fetch {
  return globalThis.fetch.bind(globalThis);
}

export function getApiBaseUrl(apiBaseUrl: string | undefined): string {
  return apiBaseUrl?.replace(/\/$/, "") ?? "";
}

export function getRequestUrl(apiBaseUrl: string | undefined, path: string): string {
  return `${getApiBaseUrl(apiBaseUrl)}${path}`;
}

export class ApiError extends Error {
  readonly body: unknown | null;
  readonly code: string | null;
  readonly status: number;

  constructor(
    message: string,
    options: {
      body?: unknown;
      code?: string | null;
      status: number;
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.body = options.body ?? null;
    this.code = options.code ?? null;
    this.status = options.status;
  }
}

export function isApiErrorStatus(
  error: unknown,
  statuses: readonly number[],
): error is ApiError {
  return error instanceof ApiError && statuses.includes(error.status);
}

function getResponseErrorDetails(body: unknown, status: number): {
  code: string | null;
  message: string;
} {
  if (!body || typeof body !== "object") {
    return { code: null, message: `Request failed with ${status}` };
  }

  const { code, error, message } = body as {
    code?: unknown;
    error?: unknown;
    message?: unknown;
  };

  return {
    code: typeof code === "string" ? code : null,
    message:
      typeof message === "string"
        ? message
        : typeof error === "string"
          ? error
          : `Request failed with ${status}`,
  };
}

export async function getResponseErrorMessage(
  response: Response,
): Promise<string> {
  try {
    const body = await response.json();

    return getResponseErrorDetails(body, response.status).message;
  } catch {
    return `Request failed with ${response.status}`;
  }
}

export async function createResponseError(response: Response): Promise<ApiError> {
  try {
    const body = await response.json();
    const { code, message } = getResponseErrorDetails(body, response.status);

    return new ApiError(message, { body, code, status: response.status });
  } catch {
    return new ApiError(`Request failed with ${response.status}`, {
      status: response.status,
    });
  }
}

export async function requestJson<TResponse>({
  accessToken,
  apiBaseUrl,
  body,
  fetchFn = getDefaultFetchFn(),
  headers,
  method = "GET",
  path,
  responseSchema,
  signal,
}: RequestJsonOptions<TResponse>): Promise<TResponse> {
  const requestHeaders: Record<string, string> = {
    ...(headers ?? {}),
  };

  if (accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetchFn(getRequestUrl(apiBaseUrl, path), {
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers:
      body !== undefined
        ? {
            "Content-Type": "application/json",
            ...requestHeaders,
          }
        : requestHeaders,
    method,
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    throw await createResponseError(response);
  }

  return responseSchema.parse(await response.json());
}

function getRequestHeaders({
  auth,
  body,
  headers,
  token,
}: {
  auth: boolean;
  body: unknown;
  headers: Record<string, string> | undefined;
  token: string | null | undefined;
}): Record<string, string> {
  const requestHeaders: Record<string, string> = {
    ...(headers ?? {}),
  };

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (auth && token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  return requestHeaders;
}

export function createAuthenticatedApiClient({
  apiBaseUrl,
  fetchFn = getDefaultFetchFn(),
  getToken,
  onRefreshFailed,
  refreshAccessToken,
}: AuthenticatedApiClientOptions): AuthenticatedApiClient {
  let refreshPromise: Promise<string | null | undefined> | null = null;
  let refreshFailurePromise: Promise<void> | null = null;

  function refreshOnce(): Promise<string | null | undefined> {
    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });

    return refreshPromise;
  }

  async function handleRefreshFailure(): Promise<void> {
    refreshFailurePromise ??= Promise.resolve(onRefreshFailed()).finally(() => {
      refreshFailurePromise = null;
    });

    await refreshFailurePromise;
  }

  async function sendRequest(
    options: ApiRequestOptions,
    token: string | null | undefined,
  ): Promise<Response> {
    return fetchFn(getRequestUrl(apiBaseUrl, options.path), {
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      headers: getRequestHeaders({
        auth: options.auth !== false,
        body: options.body,
        headers: options.headers,
        token,
      }),
      method: options.method ?? "GET",
      ...(options.signal ? { signal: options.signal } : {}),
    });
  }

  async function request(options: ApiRequestOptions): Promise<Response> {
    const auth = options.auth !== false;
    const response = await sendRequest(options, auth ? getToken() : null);

    if (!auth || response.status !== 401) {
      if (!response.ok) {
        throw await createResponseError(response);
      }

      return response;
    }

    let nextToken: string | null | undefined;

    try {
      nextToken = await refreshOnce();
    } catch {
      await handleRefreshFailure();
      throw new Error("Your session has expired. Please sign in again.");
    }

    if (!nextToken) {
      await handleRefreshFailure();
      throw new Error("Your session has expired. Please sign in again.");
    }

    const retryResponse = await sendRequest(options, nextToken);

    if (retryResponse.status === 401) {
      await handleRefreshFailure();
    }

    if (!retryResponse.ok) {
      throw await createResponseError(retryResponse);
    }

    return retryResponse;
  }

  return {
    request,
    async requestJson<TResponse>(
      options: ApiRequestJsonOptions<TResponse>,
    ): Promise<TResponse> {
      const response = await request(options);

      return options.responseSchema.parse(await response.json());
    },
    async requestNoContent(options) {
      await request(options);
    },
  };
}
