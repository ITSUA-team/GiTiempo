import { userResponseSchema, type UserResponse } from "@gitiempo/shared";

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

export async function getCurrentUser(
  accessToken: string,
): Promise<UserResponse> {
  const response = await fetch(getRequestUrl("/users/me"), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return userResponseSchema.parse(await response.json());
}
