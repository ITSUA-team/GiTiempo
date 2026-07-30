import {
  readAccessTokenPayload,
  readAccessTokenStringClaim,
  type WorkspaceRole,
} from "@gitiempo/shared";

export interface AccessTokenServerStateScope {
  role: WorkspaceRole | null;
  userId: string | null;
  workspaceId: string | null;
}

export function readAccessTokenServerStateScope(
  accessToken: string | null | undefined,
): AccessTokenServerStateScope {
  const payload = readAccessTokenPayload(accessToken);

  if (!payload) {
    return { role: null, userId: null, workspaceId: null };
  }

  return {
    role: readAccessTokenStringClaim(payload, "role") as WorkspaceRole | null,
    userId: readAccessTokenStringClaim(payload, "sub"),
    workspaceId: readAccessTokenStringClaim(payload, "workspaceId"),
  };
}
