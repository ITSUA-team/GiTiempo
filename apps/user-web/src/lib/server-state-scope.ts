import { readAccessTokenServerStateScope } from "@gitiempo/web-shared/query";

import type { UserServerStateScope } from "./query-keys";

export function getUserServerStateScope(
  accessToken: string | null | undefined,
): UserServerStateScope {
  const scope = readAccessTokenServerStateScope(accessToken);

  return {
    userId: scope.userId,
    workspaceId: scope.workspaceId,
  };
}
