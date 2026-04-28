import {
  loginRequestSchema,
  refreshRequestSchema,
  tokenPairResponseSchema,
  type TokenPairResponse,
} from "@gitiempo/shared";
import type { ZodType } from "zod";

interface PostJsonInit {
  headers?: Record<string, string>;
}

function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";
}

function getRequestUrl(path: string): string {
  return `${getApiBaseUrl()}${path}`;
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
  path: string,
  body: TBody,
  responseSchema: ZodType<TResponse>,
  init?: PostJsonInit,
): Promise<TResponse> {
  const response = await fetch(getRequestUrl(path), {
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

export async function loginWithFirebaseToken(
  firebaseIdToken: string,
): Promise<TokenPairResponse> {
  return postJson(
    "/auth/login",
    loginRequestSchema.parse({ firebaseIdToken }),
    tokenPairResponseSchema,
  );
}

export async function refreshAuthSession(
  refreshToken: string,
): Promise<TokenPairResponse> {
  return postJson(
    "/auth/refresh",
    refreshRequestSchema.parse({ refreshToken }),
    tokenPairResponseSchema,
  );
}

export async function logoutAuthSession(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  const response = await fetch(getRequestUrl("/auth/logout"), {
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
}
