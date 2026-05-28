import { readAccessTokenServerStateScope } from '@gitiempo/web-shared/query';

import type { AdminServerStateScope } from './query-keys';

export function getAdminServerStateScope(
  accessToken: string | null | undefined,
): AdminServerStateScope {
  const scope = readAccessTokenServerStateScope(accessToken);

  return {
    role: scope.role,
    userId: scope.userId,
    workspaceId: scope.workspaceId,
  };
}
