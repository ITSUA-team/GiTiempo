import type { ZodType } from 'zod';

export interface ApiRequestInit {
  headers?: Record<string, string>;
  method?: string;
  body?: string;
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

export async function getErrorMessage(response: Response): Promise<string> {
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

export async function getJson<TResponse>(
  fetchFn: typeof fetch,
  apiBaseUrl: string | undefined,
  path: string,
  responseSchema: ZodType<TResponse>,
  init?: { headers?: Record<string, string> },
): Promise<TResponse> {
  const response = await fetchFn(getRequestUrl(apiBaseUrl, path), {
    method: 'GET',
    headers: init?.headers ?? {},
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return responseSchema.parse(await response.json());
}

export async function postJson<TBody, TResponse>(
  fetchFn: typeof fetch,
  apiBaseUrl: string | undefined,
  path: string,
  body: TBody,
  responseSchema: ZodType<TResponse>,
  init?: { headers?: Record<string, string> },
): Promise<TResponse> {
  const response = await fetchFn(getRequestUrl(apiBaseUrl, path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return responseSchema.parse(await response.json());
}

export async function patchJson<TBody, TResponse>(
  fetchFn: typeof fetch,
  apiBaseUrl: string | undefined,
  path: string,
  body: TBody,
  responseSchema: ZodType<TResponse>,
  init?: { headers?: Record<string, string> },
): Promise<TResponse> {
  const response = await fetchFn(getRequestUrl(apiBaseUrl, path), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return responseSchema.parse(await response.json());
}

export async function deleteJson<TResponse>(
  fetchFn: typeof fetch,
  apiBaseUrl: string | undefined,
  path: string,
  responseSchema: ZodType<TResponse>,
  init?: { headers?: Record<string, string> },
): Promise<TResponse> {
  const response = await fetchFn(getRequestUrl(apiBaseUrl, path), {
    method: 'DELETE',
    headers: init?.headers ?? {},
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return responseSchema.parse(await response.json());
}
