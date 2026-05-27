import type { WorkspaceRole } from "@gitiempo/shared";

export interface AccessTokenServerStateScope {
  role: WorkspaceRole | null;
  userId: string | null;
  workspaceId: string | null;
}

function readStringClaim(
  payload: Record<string, unknown>,
  claim: string,
): string | null {
  const value = payload[claim];

  return typeof value === "string" && value.trim() ? value : null;
}

function readPayload(accessToken: string | null | undefined): Record<string, unknown> | null {
  const payload = accessToken?.split(".")[1];

  if (!payload) {
    return null;
  }

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    const parsed: unknown = JSON.parse(globalThis.atob(padded));

    return parsed && typeof parsed === "object"
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export function readAccessTokenServerStateScope(
  accessToken: string | null | undefined,
): AccessTokenServerStateScope {
  const payload = readPayload(accessToken);

  if (!payload) {
    return { role: null, userId: null, workspaceId: null };
  }

  return {
    role: readStringClaim(payload, "role") as WorkspaceRole | null,
    userId: readStringClaim(payload, "sub"),
    workspaceId: readStringClaim(payload, "workspaceId"),
  };
}
