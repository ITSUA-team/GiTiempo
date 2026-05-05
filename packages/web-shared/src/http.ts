import type { ZodType } from 'zod';

interface RequestJsonOptions<TResponse> {
  accessToken?: string;
  apiBaseUrl?: string;
  body?: unknown;
  fetchFn?: typeof fetch;
  headers?: Record<string, string>;
  method?: string;
  path: string;
  responseSchema: ZodType<TResponse>;
}

export function getApiBaseUrl(apiBaseUrl: string | undefined): string {
  return apiBaseUrl?.replace(/\/$/, '') ?? '';
}

export function getRequestUrl(
  apiBaseUrl: string | undefined,
  path: string,
): string {
  return `${getApiBaseUrl(apiBaseUrl)}${path}`;
}

export async function getResponseErrorMessage(
  response: Response,
): Promise<string> {
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

export class HttpError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export async function requestJson<TResponse>({
  accessToken,
  apiBaseUrl,
  body,
  fetchFn = fetch,
  headers,
  method = 'GET',
  path,
  responseSchema,
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
            'Content-Type': 'application/json',
            ...requestHeaders,
          }
        : requestHeaders,
    method,
  });

  if (!response.ok) {
    throw new HttpError(
      await getResponseErrorMessage(response),
      response.status,
    );
  }

  // 204 No Content and 205 Reset Content carry no body — skip parsing.
  if (response.status === 204 || response.status === 205) {
    return responseSchema.parse({});
  }

  return responseSchema.parse(await response.json());
}
